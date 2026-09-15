import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApplicationStatus, SmileIdStatus } from '@ore/contracts';
import {
  Application,
  SmileVerificationJob,
  SmileVerificationWebhookEvent,
} from './entities';

export interface SmileWebhookResult {
  accepted: boolean;
  duplicate: boolean;
  jobId: string;
  status: string;
}

/**
 * Handles the asynchronous SmileID callback and maps provider outcomes onto
 * the Ore onboarding application. The final provider callback is authoritative;
 * the mobile submission response only means that a job was accepted.
 */
@Injectable()
export class SmileVerificationWebhookService {
  private readonly env = process.env;

  constructor(
    @InjectRepository(Application)
    private readonly applications: Repository<Application>,
    @InjectRepository(SmileVerificationJob)
    private readonly jobs: Repository<SmileVerificationJob>,
    @InjectRepository(SmileVerificationWebhookEvent)
    private readonly events: Repository<SmileVerificationWebhookEvent>,
  ) {}

  async handleWebhook(
    rawBody: Buffer | string,
    signatureHeader?: string,
  ): Promise<SmileWebhookResult> {
    this.verifySignature(rawBody, signatureHeader);

    const payload = this.parsePayload(rawBody);
    const partnerParams = asRecord(payload.partner_params);
    const jobId = stringValue(payload.job_id) ?? stringValue(partnerParams.job_id);
    if (!jobId) throw new BadRequestException('SmileID webhook is missing job_id');

    const job = await this.jobs.findOne({ where: { providerJobId: jobId } });
    if (!job) throw new BadRequestException(`Unknown SmileID job: ${jobId}`);

    const eventHash = createHash('sha256').update(rawBody).digest('hex');
    const existingEvent = await this.events.findOne({ where: { eventHash } });
    if (existingEvent?.processed) {
      return {
        accepted: true,
        duplicate: true,
        jobId,
        status: job.status,
      };
    }

    const event = existingEvent ?? this.events.create({
      eventHash,
      providerJobId: jobId,
      payloadJson: this.safePayload(payload, jobId),
      processed: false,
    });
    if (!existingEvent) await this.events.save(event);

    const providerStatus = (stringValue(payload.status) ?? 'error').toLowerCase();
    const reason = stringValue(payload.reason);
    const message = stringValue(payload.message);
    const providerUserId = stringValue(payload.user_id) ?? stringValue(partnerParams.user_id);

    job.status = providerStatus.toUpperCase();
    job.reason = reason ?? null;
    job.message = message ?? null;
    job.providerUserId = providerUserId ?? job.providerUserId;
    job.providerPayload = this.safePayload(payload, jobId);
    if (isCompletedProviderStatus(providerStatus)) {
      job.completedAt = job.completedAt ?? new Date();
    }

    const application = await this.applications.findOne({ where: { id: job.applicationId } });
    if (!application) throw new BadRequestException(`Application not found for SmileID job: ${jobId}`);

    application.smileIdStatus = mapSmileStatus(providerStatus);
    if (providerStatus === 'block') {
      application.status = ApplicationStatus.REQUIRES_ACTION;
      application.requiresActionField = 'smileVerification';
      application.reason = message ?? reason ?? 'Document verification was not approved';
    } else if (providerStatus === 'error') {
      application.status = ApplicationStatus.IN_PROGRESS;
      application.reason = message ?? reason ?? 'Document verification encountered an error';
    }

    await this.jobs.save(job);
    await this.applications.save(application);
    event.processed = true;
    await this.events.save(event);

    return {
      accepted: true,
      duplicate: false,
      jobId,
      status: providerStatus,
    };
  }

  private verifySignature(rawBody: Buffer | string, signatureHeader?: string): void {
    const secret = this.env.SMILE_WEBHOOK_SECRET;
    const isProduction = this.env.SMILE_ENV === 'production';

    // Sandbox can be exercised before a provider signature secret is issued;
    // production must never accept an unsigned callback.
    if (!secret) {
      if (isProduction) {
        throw new UnauthorizedException('SmileID webhook secret is not configured');
      }
      return;
    }
    if (!signatureHeader) throw new UnauthorizedException('Missing SmileID webhook signature');

    const provided = signatureHeader.replace(/^sha256=/i, '').trim();
    const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
    const expectedBuffer = Buffer.from(expected, 'utf8');
    const providedBuffer = Buffer.from(provided, 'utf8');
    if (
      expectedBuffer.length !== providedBuffer.length ||
      !timingSafeEqual(expectedBuffer, providedBuffer)
    ) {
      throw new UnauthorizedException('Invalid SmileID webhook signature');
    }
  }

  private parsePayload(rawBody: Buffer | string): Record<string, unknown> {
    try {
      const parsed: unknown = JSON.parse(rawBody.toString());
      if (!isRecord(parsed)) throw new Error('Webhook body must be an object');
      return parsed;
    } catch {
      throw new BadRequestException('Invalid SmileID webhook JSON');
    }
  }

  /** Store provider status metadata without persisting document/selfie bytes. */
  private safePayload(payload: Record<string, unknown>, jobId: string): Record<string, unknown> {
    const partnerParams = asRecord(payload.partner_params);
    const antifraud = asRecord(payload.antifraud);
    return {
      job_id: jobId,
      ...(stringValue(payload.user_id) ? { user_id: stringValue(payload.user_id) } : {}),
      ...(stringValue(payload.status) ? { status: stringValue(payload.status) } : {}),
      ...(stringValue(payload.reason) ? { reason: stringValue(payload.reason) } : {}),
      ...(stringValue(payload.message) ? { message: stringValue(payload.message) } : {}),
      ...(Object.keys(partnerParams).length ? { partner_params: partnerParams } : {}),
      ...(Object.keys(antifraud).length ? { antifraud } : {}),
    };
  }
}

function mapSmileStatus(status: string): SmileIdStatus {
  switch (status) {
    case 'clear':
      return SmileIdStatus.APPROVED;
    case 'block':
      return SmileIdStatus.FAILED;
    case 'attention':
      return SmileIdStatus.QUEUED_FOR_MANUAL;
    default:
      return SmileIdStatus.PROCESSING;
  }
}

function isCompletedProviderStatus(status: string): boolean {
  return status === 'clear' || status === 'block' || status === 'attention';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asRecord(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}
