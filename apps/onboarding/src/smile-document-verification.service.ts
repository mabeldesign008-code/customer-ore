import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Multipart } from '@fastify/multipart';
import type { FastifyRequest } from 'fastify';
import { ORE_STORAGE } from '@ore/core';
import type { JwtPayload } from '@ore/core';
import { ApplicationStatus, SmileIdStatus, riderStage4Schema, vendorStage4Schema, vendorStage5Schema } from '@ore/contracts';
import { StorageDriver, storageKeyFor } from '@ore/storage';
import { Repository } from 'typeorm';
import { Application, Document, SmileVerificationJob } from './entities';

export interface SmileDocumentToken {
  token: string;
  environment: 'sandbox' | 'production';
  product: string;
}

export interface SmileDocumentSubmission {
  message: string;
  applicationId: string;
  jobId: string;
  userId: string;
  createdAt: string | null;
  status: string;
  callbackUrl: string;
}

interface SmileApiPayload {
  [key: string]: unknown;
}

interface IncomingFile {
  buffer: Buffer;
  filename: string;
  mimetype: string;
}

/**
 * Server-side client for the SmileID Document Verification contract.
 *
 * Partner credentials, token generation, and Smile submission remain inside
 * the onboarding service. Flutter receives only short-lived tokens/results.
 */
@Injectable()
export class SmileDocumentVerificationService {
  private readonly env = process.env;

  constructor(
    @InjectRepository(Application)
    private readonly applications: Repository<Application>,
    @InjectRepository(Document)
    private readonly documents: Repository<Document>,
    @InjectRepository(SmileVerificationJob)
    private readonly jobs: Repository<SmileVerificationJob>,
    @Inject(ORE_STORAGE)
    private readonly storage: StorageDriver,
  ) {}

  async getToken(): Promise<SmileDocumentToken> {
    const config = this.configuration();
    const form = new FormData();
    form.append('product', config.product);

    const response = await fetch(`${config.baseUrl}/v3/token`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'smileid-partner-id': config.partnerId,
        'smileid-api-key': config.apiKey,
      },
      body: form,
    });

    const payload = await this.parseJsonResponse(response);
    if (!response.ok || typeof payload.token !== 'string' || payload.token.length === 0) {
      throw new Error(
        `SmileID token generation failed (${response.status}): ${this.safeMessage(payload)}`,
      );
    }

    return {
      token: payload.token,
      environment: config.environment,
      product: config.product,
    };
  }

  /**
   * Parses the provided multipart contract, submits it to SmileID, and
   * returns the accepted job correlation values. Persistence and webhook
   * state transitions are intentionally separate follow-up work.
   */
  async submitDocumentVerification(
    user: JwtPayload,
    request: FastifyRequest,
  ): Promise<SmileDocumentSubmission> {
    return this.submitForApplicationKind(user, request, 'RIDER');
  }

  async submitVendorDocumentVerification(
    user: JwtPayload,
    request: FastifyRequest,
  ): Promise<SmileDocumentSubmission> {
    return this.submitForApplicationKind(user, request, 'VENDOR');
  }

  private async submitForApplicationKind(
    user: JwtPayload,
    request: FastifyRequest,
    kind: 'RIDER' | 'VENDOR',
  ): Promise<SmileDocumentSubmission> {
    if (!request.isMultipart()) {
      throw new BadRequestException('Document verification requires multipart/form-data');
    }

    const parsed = await this.parseMultipart(request);
    const config = this.configuration();
    if (!config.callbackUrl) {
      throw new Error('SmileID CALLBACK_URL is not configured');
    }

    const application = await this.applications.findOne({
      where: { applicantUserId: user.sub, kind },
      order: { createdAt: 'DESC' },
    });
    if (!application) {
      throw new BadRequestException(`Complete Vendor/Rider Stage 1 before document verification`);
    }

    const selfie = this.requiredFile(parsed.files, 'selfie');
    const documentFront = this.requiredFile(parsed.files, 'document_front');
    const livenessFiles = Object.entries(parsed.files)
      .filter(([field]) => /^liveness_[1-8]$/.test(field))
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, file]) => file);

    if (livenessFiles.length < 6) {
      throw new BadRequestException(
        `At least 6 liveness images are required. Received ${livenessFiles.length}`,
      );
    }

    const givenNames = this.requiredField(parsed.fields, 'given_names');
    const lastName = this.requiredField(parsed.fields, 'last_name');
    const email = parsed.fields.email?.trim();
    const phoneNumber = parsed.fields.phone_number?.trim() || user.phone;
    if (!email && !phoneNumber) {
      throw new BadRequestException('Either email or phone_number is required');
    }

    const consent = this.requiredField(parsed.fields, 'consent');
    this.validateConsent(consent);
    const idNumber = this.requiredField(parsed.fields, 'id_number');
    const stage4 = kind === 'RIDER'
      ? this.parseRiderStage4(parsed.fields.stage4)
      : this.parseVendorStage4(parsed.fields.stage4);
    const stage5 = kind === 'VENDOR'
      ? this.parseVendorStage5(parsed.fields.stage5)
      : null;
    const documentKeys = await this.persistDocuments(application.id, parsed.files);

    const token = await this.getToken();
    const form = new FormData();
    form.append('selfie_image', this.toBlob(selfie), selfie.filename);
    form.append('document', this.toBlob(documentFront), documentFront.filename);
    for (const file of livenessFiles) {
      form.append('liveness_images', this.toBlob(file), file.filename);
    }

    form.append('country', 'GH');
    form.append(
      'user_details',
      JSON.stringify({
        given_names: givenNames,
        last_name: lastName,
        ...(email ? { email } : {}),
        ...(phoneNumber ? { phone_number: phoneNumber } : {}),
      }),
    );
    form.append('consent', consent);
    form.append('callback_url', config.callbackUrl);
    if (parsed.fields.id_type) form.append('id_type', parsed.fields.id_type.trim());

    const response = await fetch(`${config.baseUrl}/v3/document_verification`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'SmileID-Partner-ID': config.partnerId,
        'SmileID-Token': token.token,
      },
      body: form,
    });

    const payload = await this.parseJsonResponse(response);
    if (!response.ok) {
      throw new Error(
        `SmileID document submission failed (${response.status}): ${this.safeMessage(payload)}`,
      );
    }

    const jobId = this.requiredResponseString(payload, 'job_id');
    const userId = this.requiredResponseString(payload, 'user_id');
    const status = this.requiredResponseString(payload, 'status');
    const createdAt = typeof payload.created_at === 'string' ? payload.created_at : null;
    const existingJob = await this.jobs.findOne({ where: { providerJobId: jobId } });

    if (!existingJob) {
      await this.jobs.save(
        this.jobs.create({
          applicationId: application.id,
          applicantUserId: user.sub,
          providerJobId: jobId,
          providerUserId: userId,
          status,
          reason: null,
          message: typeof payload.message === 'string' ? payload.message : null,
          providerPayload: {
            job_id: jobId,
            user_id: userId,
            status,
            ...(createdAt ? { created_at: createdAt } : {}),
          },
          providerCreatedAt: createdAt ? new Date(createdAt) : null,
          completedAt: null,
        }),
      );
    }

    const stage3: Record<string, unknown> = {
      ghanaCardNumber: idNumber,
      ...(documentKeys.document_front ? { ghanaCardFrontKey: documentKeys.document_front } : {}),
      ...(documentKeys.document_back ? { ghanaCardBackKey: documentKeys.document_back } : {}),
      ...(documentKeys.license ? { driversLicenseKey: documentKeys.license } : {}),
    };
    application.applicantName = `${givenNames} ${lastName}`.trim();
    application.stageData = {
      ...(application.stageData ?? {}),
      stage3,
      stage4,
      ...(stage5 ? { stage5 } : {}),
    };
    if (kind === 'RIDER') {
      const riderStage4 = stage4 as { vehicleType: string; payout: Record<string, unknown> };
      application.vehicle = String(riderStage4.vehicleType);
      application.payoutInfo = riderStage4.payout;
      application.currentStage = 4;
    } else {
      const vendorStage5 = stage5 as { payout: Record<string, unknown> };
      application.payoutInfo = vendorStage5.payout;
      application.currentStage = 5;
    }
    application.status = ApplicationStatus.PENDING_REVIEW;
    application.smileIdStatus = SmileIdStatus.PROCESSING;
    await this.applications.save(application);

    return {
      message: typeof payload.message === 'string'
        ? payload.message
        : 'Job submitted. Awaiting webhook result.',
      applicationId: existingJob?.applicationId ?? application.id,
      jobId,
      userId,
      createdAt,
      status,
      callbackUrl: config.callbackUrl,
    };
  }

  private async parseMultipart(request: FastifyRequest): Promise<{
    fields: Record<string, string>;
    files: Record<string, IncomingFile>;
  }> {
    const fields: Record<string, string> = {};
    const files: Record<string, IncomingFile> = {};

    for await (const part of request.parts()) {
      const multipartPart = part as Multipart;
      if (multipartPart.type === 'field') {
        if (typeof multipartPart.value !== 'string') {
          throw new BadRequestException(`Multipart field ${multipartPart.fieldname} must be text`);
        }
        fields[multipartPart.fieldname] = multipartPart.value;
        continue;
      }

      if (files[multipartPart.fieldname]) {
        await multipartPart.toBuffer();
        throw new BadRequestException(`Duplicate upload field: ${multipartPart.fieldname}`);
      }
      if (!this.isAllowedFileField(multipartPart.fieldname)) {
        await multipartPart.toBuffer();
        throw new BadRequestException(`Unsupported upload field: ${multipartPart.fieldname}`);
      }
      if (!this.isAllowedImageType(multipartPart.mimetype)) {
        await multipartPart.toBuffer();
        throw new BadRequestException(`Unsupported image type: ${multipartPart.mimetype}`);
      }

      files[multipartPart.fieldname] = {
        buffer: await multipartPart.toBuffer(),
        filename: multipartPart.filename || `${multipartPart.fieldname}.jpg`,
        mimetype: multipartPart.mimetype,
      };
    }

    return { fields, files };
  }

  private requiredFile(files: Record<string, IncomingFile>, field: string): IncomingFile {
    const file = files[field];
    if (!file || file.buffer.length === 0) {
      throw new BadRequestException(`${field} image is required`);
    }
    return file;
  }

  private requiredField(fields: Record<string, string>, field: string): string {
    const value = fields[field]?.trim();
    if (!value) throw new BadRequestException(`${field} is required`);
    return value;
  }

  private parseRiderStage4(value: string | undefined): Record<string, unknown> & { vehicleType: string; payout: Record<string, unknown> } {
    if (!value) throw new BadRequestException('stage4 details are required');
    try {
      const parsed: unknown = JSON.parse(value);
      const result = riderStage4Schema.parse(parsed);
      return result as Record<string, unknown> & { vehicleType: string; payout: Record<string, unknown> };
    } catch {
      throw new BadRequestException('stage4 details are invalid');
    }
  }

  private parseVendorStage4(value: string | undefined): Record<string, unknown> {
    if (!value) throw new BadRequestException('stage4 details are required');
    try {
      const parsed: unknown = JSON.parse(value);
      return vendorStage4Schema.parse(parsed) as Record<string, unknown>;
    } catch {
      throw new BadRequestException('vendor stage4 details are invalid');
    }
  }

  private parseVendorStage5(value: string | undefined): Record<string, unknown> & { payout: Record<string, unknown> } {
    if (!value) throw new BadRequestException('stage5 details are required for Vendor verification');
    try {
      const parsed: unknown = JSON.parse(value);
      const result = vendorStage5Schema.parse(parsed);
      return result as Record<string, unknown> & { payout: Record<string, unknown> };
    } catch {
      throw new BadRequestException('vendor stage5 details are invalid');
    }
  }

  private validateConsent(value: string): void {
    try {
      const parsed: unknown = JSON.parse(value);
      if (typeof parsed !== 'object' || parsed === null) {
        throw new Error('Consent must be an object');
      }
    } catch {
      throw new BadRequestException('consent must be valid JSON');
    }
  }

  private isAllowedFileField(field: string): boolean {
    return field === 'selfie' ||
      field === 'document_front' ||
      field === 'document_back' ||
      field === 'license' ||
      /^liveness_[1-8]$/.test(field);
  }

  private async persistDocuments(
    applicationId: string,
    files: Record<string, IncomingFile>,
  ): Promise<Record<string, string>> {
    const documentFields: Array<[string, string]> = [
      ['document_front', 'document_front'],
      ['document_back', 'document_back'],
      ['license', 'drivers_license'],
    ];
    const storedKeys: string[] = [];
    const documentKeys: Record<string, string> = {};

    try {
      for (const [field, kind] of documentFields) {
        const file = files[field];
        if (!file) continue;
        const storageKey = storageKeyFor('onboarding-documents', applicationId, file.filename);
        await this.storage.putObject(storageKey, file.buffer, file.mimetype);
        storedKeys.push(storageKey);
        documentKeys[field] = storageKey;
        await this.documents.save(
          this.documents.create({
            applicationId,
            kind,
            fileName: file.filename,
            contentType: file.mimetype,
            storageKey,
          }),
        );
      }
      return documentKeys;
    } catch (error) {
      await Promise.all(storedKeys.map((key) => this.storage.deleteObject(key).catch(() => undefined)));
      throw error;
    }
  }

  private isAllowedImageType(mimetype: string): boolean {
    return ['image/jpeg', 'image/jpg', 'image/png'].includes(mimetype.toLowerCase());
  }

  private toBlob(file: IncomingFile): Blob {
    return new Blob([file.buffer], { type: file.mimetype });
  }

  private requiredResponseString(payload: SmileApiPayload, field: string): string {
    const value = payload[field];
    if (typeof value !== 'string' || value.length === 0) {
      throw new Error(`SmileID response is missing ${field}`);
    }
    return value;
  }

  private configuration(): {
    partnerId: string;
    apiKey: string;
    baseUrl: string;
    product: string;
    callbackUrl?: string;
    environment: 'sandbox' | 'production';
  } {
    const environment = this.env.SMILE_ENV === 'production' ? 'production' : 'sandbox';
    const partnerId = this.env.PARTNER_ID ?? this.env.SMILE_ID_PARTNER_ID;
    const apiKey = environment === 'production'
      ? this.env.PRODUCTION_API_KEY ?? this.env.SMILE_ID_PRODUCTION_API_KEY
      : this.env.API_KEY ?? this.env.SMILE_ID_API_KEY;

    if (!partnerId) throw new Error('SmileID PARTNER_ID is not configured');
    if (!apiKey) {
      throw new Error(
        environment === 'production'
          ? 'SmileID PRODUCTION_API_KEY is not configured'
          : 'SmileID API_KEY is not configured',
      );
    }

    const configuredBaseUrl = this.env.SMILE_BASE_URL ?? this.env.BASE_URL;
    const baseUrl = configuredBaseUrl ?? (
      environment === 'production'
        ? 'https://api.smileidentity.com'
        : 'https://testapi.smileidentity.com'
    );

    return {
      partnerId,
      apiKey,
      baseUrl: trimTrailingSlash(baseUrl),
      product: this.env.SMILE_PRODUCT ?? 'document_verification',
      callbackUrl: this.env.CALLBACK_URL ?? this.env.SMILE_ID_CALLBACK_URL,
      environment,
    };
  }

  private async parseJsonResponse(response: Response): Promise<SmileApiPayload> {
    const raw = await response.text();
    if (!raw) return {};

    try {
      const parsed: unknown = JSON.parse(raw);
      return isSmileApiPayload(parsed) ? parsed : { message: raw };
    } catch {
      return { message: raw };
    }
  }

  private safeMessage(payload: SmileApiPayload): string {
    if (typeof payload.message === 'string') return payload.message;
    if (typeof payload.error === 'string') return payload.error;
    return 'Unexpected SmileID response';
  }
}

function isSmileApiPayload(value: unknown): value is SmileApiPayload {
  return typeof value === 'object' && value !== null;
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '');
}
