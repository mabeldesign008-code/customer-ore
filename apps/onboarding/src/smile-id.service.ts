import { Injectable, Logger } from '@nestjs/common';
import { createHmac } from 'crypto';
import { SmileIdStatus } from '@ore/contracts';

export interface VerifyGhanaCardParams {
  idNumber: string;
  idType?: 'GHANA_CARD' | 'PASSPORT' | 'DRIVERS_LICENSE';
  selfieBase64: string;
  angleImagesBase64?: string[];
  userId: string;
}

export interface SmileIdJobResult {
  status: SmileIdStatus;
  resultCode: number;
  resultText: string;
  jobId: string;
  isDuplicateFace: boolean;
  pii?: {
    fullName?: string;
    dob?: string;
    gender?: string;
  };
}

@Injectable()
export class SmileIdService {
  private readonly logger = new Logger(SmileIdService.name);

  /** Generate HMAC-SHA256 signature required for Smile ID API requests. */
  generateSignature(timestamp: string, partnerId: string, apiKey: string): string {
    const hmac = createHmac('sha256', apiKey);
    // The HMAC message is timestamp + partnerId + "sid_request" per Smile ID's
    // "Generate signature" docs. This said "openapi_request", which produces a signature
    // Smile ID will never accept — every signed REST call would have failed with an
    // authentication error regardless of whether the credentials were correct.
    hmac.update(`${timestamp}${partnerId}sid_request`);
    return hmac.digest('base64');
  }

  /** Biometric KYC / Enhanced Document Verification for Ghana Card + SmartSelfie™ */
  async verifyBiometricIdentity(params: VerifyGhanaCardParams): Promise<SmileIdJobResult> {
    const partnerId = process.env.SMILE_ID_PARTNER_ID;
    const apiKey = process.env.SMILE_ID_API_KEY;
    const isLive = process.env.SMILE_ID_MODE === 'live' && partnerId && apiKey;

    const normalizedId = params.idNumber.trim().toUpperCase();

    if (!isLive) {
      // Never approve a Vendor/Rider from a local simulation. If the legacy
      // identity path is used before the project-owner SmileID contract is
      // configured, route the application to manual review instead.
      this.logger.warn(`SmileID credentials are not configured for applicant ${params.userId}; queuing for manual review.`);
      return {
        status: SmileIdStatus.QUEUED_FOR_MANUAL,
        resultCode: 1015,
        resultText: 'SmileID credentials are not configured. Queued for manual compliance review.',
        jobId: `JOB_MANUAL_${Date.now()}`,
        isDuplicateFace: false,
      };
    }

    // ── Live Smile ID API Call ────────────────────────────────────────
    try {
      const timestamp = new Date().toISOString();
      const signature = this.generateSignature(timestamp, partnerId!, apiKey!);
      const baseUrl = process.env.SMILE_ID_ENV === 'sandbox'
        ? 'https://testapi.smileidentity.com/v1'
        : 'https://api.smileidentity.com/v1';

      const payload = {
        source_sdk: 'rest_api',
        source_sdk_version: '1.0.0',
        partner_id: partnerId,
        timestamp,
        signature,
        country: 'GH',
        id_type: 'GHANA_CARD',
        id_number: normalizedId,
        user_id: params.userId,
        job_id: `JOB_${Date.now()}`,
        selfie_image: params.selfieBase64,
        liveness_images: params.angleImagesBase64 ?? [],
        check_face_duplicates: true, // Section 3 & 4 Spec requirement
      };

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000); // 8s SLA

      const res = await fetch(`${baseUrl}/biometric_kyc`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      const json = (await res.json()) as Record<string, any>;
      if (json.ResultCode === 1012) {
        return {
          status: SmileIdStatus.APPROVED,
          resultCode: 1012,
          resultText: json.ResultText || 'Verification Successful',
          jobId: json.SmileJobID || payload.job_id,
          isDuplicateFace: Boolean(json.FaceMatch && json.DuplicateDetected),
          pii: json.FullName ? { fullName: json.FullName, dob: json.DOB, gender: json.Gender } : undefined,
        };
      }

      return {
        status: SmileIdStatus.FAILED,
        resultCode: json.ResultCode || 1013,
        resultText: json.ResultText || 'Verification failed',
        jobId: json.SmileJobID || payload.job_id,
        isDuplicateFace: Boolean(json.DuplicateDetected),
      };
    } catch (err) {
      // Outage fallback logic: Do not hard-block applicants on third-party outage
      this.logger.error(`[Smile ID API Outage/Timeout] ${err}. Routing to manual compliance queue.`);
      return {
        status: SmileIdStatus.QUEUED_FOR_MANUAL,
        resultCode: 1015,
        resultText: 'Identity service timeout. Queued for manual compliance verification.',
        jobId: `JOB_OUTAGE_FALLBACK_${Date.now()}`,
        isDuplicateFace: false,
      };
    }
  }
}
