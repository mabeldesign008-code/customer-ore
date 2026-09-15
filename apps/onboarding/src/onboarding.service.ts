/** Onboarding — stage-gated registration engine for Riders and Vendors with persistent drafts,
 *  Smile ID verification, workplace GPS validation, and immutable review audit trail. */

import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApplicationStatus, DEFAULT_ORE_OPERATING_LOCATION_ID, EVENTS, Role, SmileIdStatus, VendorType, VehicleType } from '@ore/contracts';
import { ORE_BUS, ORE_ENV, ORE_NOTIFY, ORE_STORAGE, JwtPayload, internalFetch, serviceUrl } from '@ore/core';
import { Bus } from '@ore/bus';
import { NotifyClient } from '@ore/notify';
import { PaystackClient } from '@ore/paystack';
import { OreEnv } from '@ore/config';
import { LocalStorageDriver, StorageDriver } from '@ore/storage';
import { Application, ApplicationKind, VendorClass } from './entities/application.entity';
import { Document } from './entities/document.entity';
import { IdCounter } from './entities/id-counter.entity';
import { AuditLog } from './entities/audit-log.entity';
import { SmileVerificationJob } from './entities/smile-verification-job.entity';
import { SmileIdService } from './smile-id.service';
import {
  AdminRole,
  riderStage1Schema,
  riderStage2Schema,
  riderStage3Schema,
  riderStage4Schema,
  vendorStage1Schema,
  vendorStage2Schema,
  vendorStage3Schema,
  vendorStage4Schema,
  vendorStage5Schema,
} from '@ore/contracts';
import { nextSequenceValue } from '@ore/db';

export interface OnboardingSmileVerificationStatus {
  jobId: string;
  providerUserId: string | null;
  status: string;
  reason: string | null;
  message: string | null;
  submittedAt: string;
  completedAt: string | null;
}

type OnboardingApplicationStatusResponse = Application & {
  smileVerification: OnboardingSmileVerificationStatus | null;
};

@Injectable()
export class OnboardingService {
  constructor(
    @InjectRepository(Application) private readonly apps: Repository<Application>,
    @InjectRepository(Document) private readonly documents: Repository<Document>,
    @InjectRepository(IdCounter) private readonly counters: Repository<IdCounter>,
    @InjectRepository(AuditLog) private readonly auditLogs: Repository<AuditLog>,
    @InjectRepository(SmileVerificationJob) private readonly smileJobs: Repository<SmileVerificationJob>,
    @Inject(ORE_STORAGE) private readonly storage: StorageDriver,
    @Inject(ORE_BUS) private readonly bus: Bus,
    @Inject(ORE_NOTIFY) private readonly notify: NotifyClient,
    @Inject(ORE_ENV) private readonly env: OreEnv,
    private readonly paystack: PaystackClient,
    private readonly smileId: SmileIdService,
  ) {}

  // ── Application Status / Resume ───────────────────────────────────
  async getMyStatus(
    userId: string,
    kind: ApplicationKind,
    applicantPhone = '',
  ): Promise<OnboardingApplicationStatusResponse> {
    let app = await this.apps.findOne({
      where: { applicantUserId: userId, kind },
      order: { createdAt: 'DESC' },
    });

    if (!app) {
      // Create initial draft
      app = await this.apps.save(
        this.apps.create({
          applicantUserId: userId,
          applicantPhone,
          kind,
          status: ApplicationStatus.DRAFT,
          currentStage: 1,
          maxStages: kind === 'RIDER' ? 4 : 5,
          stageData: {},
          smileIdStatus: SmileIdStatus.NOT_STARTED,
        }),
      );
    }

    if (!app.applicantPhone && applicantPhone) {
      app.applicantPhone = applicantPhone;
      app = await this.apps.save(app);
    }

    const smileJob = kind === 'RIDER'
      ? await this.smileJobs.findOne({
          where: { applicationId: app.id },
          order: { createdAt: 'DESC' },
        })
      : null;

    return {
      ...app,
      smileVerification: smileJob
        ? {
            jobId: smileJob.providerJobId,
            providerUserId: smileJob.providerUserId,
            status: smileJob.status,
            reason: smileJob.reason,
            message: smileJob.message,
            submittedAt: smileJob.createdAt.toISOString(),
            completedAt: smileJob.completedAt?.toISOString() ?? null,
          }
        : null,
    };
  }

  // ── Rider Staged Registration (4 Stages) ──────────────────────────
  async saveRiderStage(user: JwtPayload, stage: number, body: Record<string, unknown>) {
    let app = await this.apps.findOne({
      where: { applicantUserId: user.sub, kind: 'RIDER' },
      order: { createdAt: 'DESC' },
    });

    if (!app) {
      app = this.apps.create({
        applicantUserId: user.sub,
        applicantPhone: user.phone,
        kind: 'RIDER',
        status: ApplicationStatus.IN_PROGRESS,
        currentStage: 1,
        maxStages: 4,
        stageData: {},
      });
    } else if (!app.applicantPhone) {
      // A status probe may have created an empty draft before Stage 1 was
      // submitted. Always repair the authoritative contact before approval
      // notifications or SmileID submission.
      app.applicantPhone = user.phone;
    }

    // Stage Gating: cannot skip ahead
    if (stage > app.currentStage && app.status !== ApplicationStatus.REQUIRES_ACTION) {
      throw new BadRequestException(`Cannot access Stage ${stage} before completing Stage ${app.currentStage}`);
    }

    const currentData = app.stageData || {};

    if (stage === 1) {
      const parsed = riderStage1Schema.parse(body);
      app.applicantName = `${parsed.firstName} ${parsed.lastName}`;
      currentData['stage1'] = parsed;
      app.currentStage = Math.max(app.currentStage, 2);
      app.status = ApplicationStatus.IN_PROGRESS;
    } else if (stage === 2) {
      const parsed = riderStage2Schema.parse(body);
      const verification = await this.smileId.verifyBiometricIdentity({
        idNumber: parsed.idNumber,
        idType: parsed.idType,
        selfieBase64: parsed.selfieBase64,
        angleImagesBase64: parsed.angleImagesBase64,
        userId: user.sub,
      });

      if (verification.isDuplicateFace) {
        throw new BadRequestException('Duplicate face detected. This biometric identity is already tied to an existing rider.');
      }

      if (verification.status === SmileIdStatus.FAILED) {
        throw new BadRequestException(`Smile ID Identity Verification Failed: ${verification.resultText}`);
      }

      app.smileIdStatus = verification.status;
      currentData['stage2'] = {
        idType: parsed.idType,
        idNumber: parsed.idNumber,
        jobId: verification.jobId,
        resultCode: verification.resultCode,
        verified: verification.status === SmileIdStatus.APPROVED,
        pii: verification.pii,
      };
      app.currentStage = Math.max(app.currentStage, 3);
    } else if (stage === 3) {
      const parsed = riderStage3Schema.parse(body);
      currentData['stage3'] = parsed;
      app.currentStage = Math.max(app.currentStage, 4);
    } else if (stage === 4) {
      const parsed = riderStage4Schema.parse(body);
      if ((parsed.vehicleType === VehicleType.MOTORBIKE || parsed.vehicleType === VehicleType.CAR) && !parsed.licensePlate?.trim()) {
        throw new BadRequestException('A license plate is required for motorbike and car riders');
      }
      currentData['stage4'] = parsed;
      app.vehicle = parsed.vehicleType;
      app.payoutInfo = parsed.payout;
      app.status = ApplicationStatus.PENDING_REVIEW;
    }

    app.stageData = currentData;
    app.requiresActionField = null;
    return this.apps.save(app);
  }

  // ── Vendor Staged Registration (5 Stages) ─────────────────────────
  async saveVendorStage(user: JwtPayload, stage: number, body: Record<string, unknown>) {
    let app = await this.apps.findOne({
      where: { applicantUserId: user.sub, kind: 'VENDOR' },
      order: { createdAt: 'DESC' },
    });

    if (!app) {
      app = this.apps.create({
        applicantUserId: user.sub,
        applicantPhone: user.phone,
        kind: 'VENDOR',
        status: ApplicationStatus.IN_PROGRESS,
        currentStage: 1,
        maxStages: 5,
        stageData: {},
      });
    }

    // Stage Gating
    if (stage > app.currentStage && app.status !== ApplicationStatus.REQUIRES_ACTION) {
      throw new BadRequestException(`Cannot access Stage ${stage} before completing Stage ${app.currentStage}`);
    }

    const currentData = app.stageData || {};

    if (stage === 1) {
      const parsed = vendorStage1Schema.parse(body);
      app.vendorType = parsed.vendorType as VendorType;
      app.vendorClass = parsed.vendorClass;
      currentData['stage1'] = parsed;
      app.currentStage = Math.max(app.currentStage, 2);
      app.status = ApplicationStatus.IN_PROGRESS;
    } else if (stage === 2) {
      const parsed = vendorStage2Schema.parse(body);
      // Strict Workplace GPS Check
      if (parsed.workplaceGps.isMock) {
        throw new BadRequestException('Fake GPS or mock location detected. You must be physically at the workplace.');
      }
      app.businessName = parsed.businessName;
      app.lat = parsed.workplaceGps.lat;
      app.lng = parsed.workplaceGps.lng;
      app.workplaceGps = parsed.workplaceGps;
      currentData['stage2'] = parsed;
      app.currentStage = Math.max(app.currentStage, 3);
    } else if (stage === 3) {
      const parsed = vendorStage3Schema.parse(body);
      // Vendor biometrics are submitted through the project-owner asynchronous
      // multipart Document Verification route after the document and payout
      // stages are complete. This stage only persists the draft and advances
      // the gate; it must never auto-approve from a local simulation.
      app.applicantName = parsed.ownerName;
      app.smileIdStatus = SmileIdStatus.PROCESSING;
      currentData['stage3'] = {
        ownerName: parsed.ownerName,
        ownerRole: parsed.ownerRole,
        ownerPhone: parsed.ownerPhone,
        ownerEmail: parsed.ownerEmail,
        ghanaCardNumber: parsed.ghanaCardNumber,
        idType: parsed.idType,
        selfieCaptured: parsed.selfieBase64.length > 0,
        livenessImageCount: parsed.angleImagesBase64.length,
        verified: false,
      };
      app.currentStage = Math.max(app.currentStage, 4);
    } else if (stage === 4) {
      const parsed = vendorStage4Schema.parse(body);
      currentData['stage4'] = parsed;
      app.currentStage = Math.max(app.currentStage, 5);
    } else if (stage === 5) {
      const parsed = vendorStage5Schema.parse(body);
      currentData['stage5'] = parsed;
      app.payoutInfo = parsed.payout;
      app.status = ApplicationStatus.PENDING_REVIEW;
    }

    app.stageData = currentData;
    app.requiresActionField = null;
    return this.apps.save(app);
  }

  // ── Payout Verification (Paystack Recipient) ──────────────────────
  async listPayoutProviders(type: 'MOMO' | 'BANK') {
    return this.paystack.listGhanaPayoutProviders(type === 'MOMO' ? 'mobile_money' : 'ghipss');
  }

  async verifyPayout(payout: { type: 'MOMO' | 'BANK'; provider: string; accountNumber: string; accountName: string }) {
    const recipient = await this.paystack.createRecipient({
      type: payout.type === 'MOMO' ? 'mobile_money' : 'ghipss',
      name: payout.accountName.trim(),
      accountNumber: payout.accountNumber.trim(),
      bankCode: payout.provider.trim(),
      currency: 'GHS',
    });
    return {
      verified: true,
      accountName: payout.accountName,
      accountNumber: payout.accountNumber,
      provider: payout.provider,
      recipientCode: recipient.recipientCode,
      mode: recipient.mode,
    };
  }

  async myApplications(userId: string): Promise<Application[]> {
    return this.apps.find({ where: { applicantUserId: userId }, order: { createdAt: 'DESC' } });
  }

  async myDocuments(userId: string): Promise<Array<Pick<Document, 'id' | 'kind' | 'fileName' | 'contentType' | 'createdAt'>>> {
    const application = await this.apps.findOne({
      where: { applicantUserId: userId },
      order: { createdAt: 'DESC' },
    });
    if (!application) return [];

    const documents = await this.documents.find({
      where: { applicationId: application.id },
      order: { createdAt: 'DESC' },
    });
    return documents.map(({ id, kind, fileName, contentType, createdAt }) => ({
      id,
      kind,
      fileName,
      contentType,
      createdAt,
    }));
  }

  // ── Admin Decisions ───────────────────────────────────────────────
  async adminList(status?: string, kind?: string): Promise<Application[]> {
    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (kind) where.kind = kind;
    return this.apps.find({ where, order: { createdAt: 'DESC' } });
  }

  async adminGet(id: string): Promise<Application> {
    const app = await this.apps.findOne({ where: { id } });
    if (!app) throw new NotFoundException('Application not found');
    return app;
  }

  async approve(admin: JwtPayload, id: string): Promise<Application> {
    const app = await this.adminGet(id);
    if (app.status === ApplicationStatus.APPROVED) return app;
    if (app.smileIdStatus !== SmileIdStatus.APPROVED) {
      throw new ForbiddenException(`${app.kind} SmileID verification must be approved before application approval`);
    }
    const prevState = app.status;

    if (app.kind === 'VENDOR') {
      const publicId = await this.nextId('ORV');
      const vendor = await this.createCatalogVendor(app, publicId);
      app.publicId = publicId;
      app.status = ApplicationStatus.APPROVED;
      await this.apps.save(app);
      await this.notify.sendSms({
        phone: app.applicantPhone,
        text: `Ore: Congratulations! Your vendor store '${app.businessName}' has been approved. Log in to set up your menu!`,
      });
      await this.notify.sendPush({
        userId: app.applicantUserId,
        title: 'Application Approved 🎉',
        body: `${app.businessName} is now live on Ore. Set up your catalogue to start receiving orders.`,
        data: { vendorId: vendor.id, publicId },
      });
      await this.bus.publish(EVENTS.USER_ONBOARDED, { userId: app.applicantUserId, role: Role.VENDOR, publicId });
    } else {
      const rider = await this.createDispatchRider(app, admin.sub);
      const riderIdentifier = rider.riderIdentifier;
      if (!riderIdentifier) throw new BadRequestException('Dispatch did not assign a Rider ID on approval');
      app.publicId = riderIdentifier;
      app.status = ApplicationStatus.APPROVED;
      await this.apps.save(app);
      await this.notify.sendSms({
        phone: app.applicantPhone,
        text: `Ore: Congratulations! Your Rider application has been approved. Your Rider ID is ${riderIdentifier}.`,
      });
      await this.notify.sendPush({
        userId: app.applicantUserId,
        title: 'Rider Approved 🎉',
        body: 'You can now go online and accept delivery orders in Cape Coast.',
        data: { riderIdentifier },
      });
      await this.bus.publish(EVENTS.USER_ONBOARDED, { userId: app.applicantUserId, role: Role.RIDER, publicId: riderIdentifier, riderIdentifier });
    }

    // Log immutable compliance audit trail
    await this.auditLogs.save(
      this.auditLogs.create({
        applicationId: app.id,
        reviewerId: admin.sub,
        reviewerRole: (admin.adminRole as AdminRole) ?? AdminRole.COMPLIANCE,
        action: 'APPROVED',
        previousState: prevState,
        newState: ApplicationStatus.APPROVED,
        reason: 'All credentials and KYC checks verified.',
      }),
    );

    return app;
  }

  async reject(admin: JwtPayload, id: string, reason: string): Promise<Application> {
    const app = await this.adminGet(id);
    if (!reason?.trim()) throw new BadRequestException('Rejection requires an explicit reason');
    const prevState = app.status;
    app.status = ApplicationStatus.REJECTED;
    app.reason = reason;
    await this.apps.save(app);
    await this.notify.sendSms({
      phone: app.applicantPhone,
      text: `Ore Update: Your application was not approved. Reason: ${reason}. You may resubmit via the app.`,
    });
    await this.notify.sendPush({
      userId: app.applicantUserId,
      title: 'Application Update',
      body: `Reason: ${reason}`,
    });

    // Log immutable compliance audit trail
    await this.auditLogs.save(
      this.auditLogs.create({
        applicationId: app.id,
        reviewerId: admin.sub,
        reviewerRole: (admin.adminRole as AdminRole) ?? AdminRole.COMPLIANCE,
        action: 'REJECTED',
        previousState: prevState,
        newState: ApplicationStatus.REJECTED,
        reason,
      }),
    );

    return app;
  }

  /**
   * Manual biometrics decision (audit F-BUG-22).
   *
   * When SmileID is not live or a verification call fails, the application is parked at
   * QUEUED_FOR_MANUAL — but approve() hard-requires smileIdStatus===APPROVED and no
   * endpoint existed to set it, so those applicants could never be approved short of
   * resubmitting stage 2 against a live API. This is the manual compliance queue: a
   * compliance/super admin reviews the captured biometric out-of-band and records the
   * decision here. Gated on onboarding.kyc.override (dual-control: super or compliance).
   */
  async manualSmileDecision(admin: JwtPayload, id: string, decision: 'approved' | 'failed', note: string): Promise<Application> {
    const app = await this.adminGet(id);
    if (app.status === ApplicationStatus.APPROVED || app.status === ApplicationStatus.REJECTED) {
      throw new BadRequestException(`Application is already ${app.status.toLowerCase()} — no SmileID override needed`);
    }
    if (!note?.trim()) throw new BadRequestException('A manual decision requires a note (what was reviewed and why)');

    const prevSmile = app.smileIdStatus;
    app.smileIdStatus = decision === 'approved' ? SmileIdStatus.APPROVED : SmileIdStatus.FAILED;
    await this.apps.save(app);

    await this.auditLogs.save(
      this.auditLogs.create({
        applicationId: app.id,
        reviewerId: admin.sub,
        reviewerRole: (admin.adminRole as AdminRole) ?? AdminRole.COMPLIANCE,
        action: 'SMILE_MANUAL',
        previousState: String(prevSmile),
        newState: String(app.smileIdStatus),
        reason: note,
      }),
    );

    if (decision === 'failed') {
      await this.notify.sendSms({
        phone: app.applicantPhone,
        text: 'Ore Update: Your biometric verification could not be completed. Support will contact you with next steps.',
      });
    }
    return app;
  }

  async requiresAction(admin: JwtPayload, id: string, field: string, message: string, stage: number): Promise<Application> {
    const app = await this.adminGet(id);
    const prevState = app.status;
    app.status = ApplicationStatus.REQUIRES_ACTION;
    app.requiresActionField = field;
    app.reason = message;
    app.currentStage = stage;
    await this.apps.save(app);
    await this.notify.sendSms({
      phone: app.applicantPhone,
      text: `Ore Action Required: Please correct ${field} in Stage ${stage}: ${message}`,
    });
    await this.notify.sendPush({
      userId: app.applicantUserId,
      title: 'Action Required on Application',
      body: `Stage ${stage} (${field}): ${message}`,
      data: { stage: stage.toString(), field },
    });

    // Log immutable compliance audit trail
    await this.auditLogs.save(
      this.auditLogs.create({
        applicationId: app.id,
        reviewerId: admin.sub,
        reviewerRole: (admin.adminRole as AdminRole) ?? AdminRole.COMPLIANCE,
        action: 'REQUIRES_ACTION',
        previousState: prevState,
        newState: ApplicationStatus.REQUIRES_ACTION,
        reason: message,
        requiresActionField: field,
      }),
    );

    return app;
  }

  async getAuditLogs(applicationId: string): Promise<AuditLog[]> {
    return this.auditLogs.find({ where: { applicationId }, order: { createdAt: 'DESC' } });
  }

  // ── Media Storage ─────────────────────────────────────────────────
  /**
   * Compatibility upload for older clients that still use the local-storage
   * POST contract. It is not public: the key must belong to the caller's
   * onboarding application, and the payload is limited to document media.
   */
  async uploadFileForUser(
    userId: string,
    key: string,
    contentType: string,
    dataBase64: string,
  ): Promise<{ url: string }> {
    const application = await this.apps.findOne({
      where: { applicantUserId: userId },
      order: { createdAt: 'DESC' },
    });
    if (!application) throw new ForbiddenException('Onboarding application not found');

    const normalizedKey = key.trim();
    const keyPrefix = `onboarding-documents/${application.id}/`;
    if (
      !normalizedKey.startsWith(keyPrefix) ||
      normalizedKey.includes('..') ||
      normalizedKey.includes('\\') ||
      normalizedKey.length > 512
    ) {
      throw new ForbiddenException('Upload key is not owned by this onboarding application');
    }

    const normalizedContentType = contentType.trim().toLowerCase();
    const allowedContentTypes = new Set([
      'image/jpeg',
      'image/jpg',
      'image/png',
      'application/pdf',
    ]);
    if (!allowedContentTypes.has(normalizedContentType)) {
      throw new BadRequestException('Unsupported document content type');
    }
    if (typeof dataBase64 !== 'string' || dataBase64.length === 0) {
      throw new BadRequestException('Base64 document data is required');
    }

    const encoded = dataBase64.replace(/^data:[^;]+;base64,/i, '').replace(/\s/g, '');
    if (!/^[A-Za-z0-9+/]*={0,2}$/.test(encoded) || encoded.length % 4 !== 0) {
      throw new BadRequestException('Document data must be valid base64');
    }
    const body = Buffer.from(encoded, 'base64');
    if (body.length === 0 || body.length > 10 * 1024 * 1024) {
      throw new BadRequestException('Document must be between 1 byte and 10 MB');
    }

    const url = await this.storage.putObject(normalizedKey, body, normalizedContentType);
    return { url };
  }

  async readDocumentByIdForUser(
    userId: string,
    documentId: string,
    isAdmin = false,
  ): Promise<{ body: Buffer; contentType: string } | { downloadUrl: string }> {
    const document = await this.documents.findOne({ where: { id: documentId } });
    if (!document?.storageKey) throw new NotFoundException('Document not found');

    if (!isAdmin) {
      const application = await this.apps.findOne({
        where: { id: document.applicationId, applicantUserId: userId },
      });
      if (!application) throw new NotFoundException('Document not found');
    }

    if (this.storage instanceof LocalStorageDriver) {
      return {
        body: this.storage.readObject(document.storageKey),
        contentType: document.contentType,
      };
    }

    return {
      downloadUrl: await this.storage.createPresignedDownload(document.storageKey),
    };
  }

  async readObject(key: string): Promise<{ body: Buffer; contentType: string }> {
    const { LocalStorageDriver } = await import('@ore/storage');
    if (this.storage instanceof LocalStorageDriver) {
      const body = this.storage.readObject(key);
      const ext = key.split('.').pop() ?? '';
      const ct =
        ext === 'pdf'
          ? 'application/pdf'
          : ext === 'jpg' || ext === 'jpeg'
          ? 'image/jpeg'
          : ext === 'png'
          ? 'image/png'
          : 'application/octet-stream';
      return { body, contentType: ct };
    }
    throw new NotFoundException('Object not served locally');
  }

  // ── Helpers ───────────────────────────────────────────────────────
  private async nextId(prefix: string): Promise<string> {
    const year = new Date().getFullYear();
    const key = `${prefix}-${year}`;
    const seq = await nextSequenceValue(this.counters, key);
    return `${key}-${String(seq).padStart(4, '0')}`;
  }

  private async createCatalogVendor(app: Application, publicId: string) {
    const res = await internalFetch(`${serviceUrl('catalog')}/internal/vendors/onboard`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ownerUserId: app.applicantUserId,
        name: app.businessName,
        vendorType: app.vendorType,
        lat: app.lat || 5.1053,
        lng: app.lng || -1.2466,
        publicId,
        payoutAccountJson: app.payoutInfo,
      }),
    });
    if (!res.ok) throw new BadRequestException('Could not create catalog vendor on approval');
    return (await res.json()) as { id: string };
  }

  private async createDispatchRider(app: Application, approvalActorId: string) {
    if (!app.applicantName?.trim()) throw new BadRequestException('Rider name is required before approval');
    if (!app.vehicle) throw new BadRequestException('Rider vehicle verification is required before approval');
    const stage4 = (app.stageData?.stage4 ?? {}) as { licensePlate?: unknown };
    const licensePlate = typeof stage4.licensePlate === 'string'
      ? stage4.licensePlate.trim()
      : undefined;
    const approvedOperatingLocationId = process.env.ORE_DEFAULT_RIDER_LOCATION_ID ?? DEFAULT_ORE_OPERATING_LOCATION_ID;
    const res = await internalFetch(`${serviceUrl('dispatch')}/internal/riders/onboard`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: app.applicantUserId,
        name: app.applicantName,
        phone: app.applicantPhone,
        vehicle: app.vehicle,
        ...(licensePlate ? { licensePlate } : {}),
        approvedOperatingLocationId,
        approvalActorId,
        sourceApplicationId: app.id,
      }),
    });
    if (!res.ok) throw new BadRequestException('Could not create dispatch rider and assign Rider ID on approval');
    return (await res.json()) as { id: string; riderIdentifier: string | null };
  }

  async adminStats(): Promise<any> {
    const riderApps = await this.apps.count({ where: { kind: 'RIDER' } });
    const vendorApps = await this.apps.count({ where: { kind: 'VENDOR' } });

    const approvedRiders = await this.apps.count({
      where: { kind: 'RIDER', status: ApplicationStatus.APPROVED }
    });
    const approvedVendors = await this.apps.count({
      where: { kind: 'VENDOR', status: ApplicationStatus.APPROVED }
    });

    const pendingRiders = await this.apps.count({
      where: { kind: 'RIDER', status: ApplicationStatus.PENDING_REVIEW }
    });
    const pendingVendors = await this.apps.count({
      where: { kind: 'VENDOR', status: ApplicationStatus.PENDING_REVIEW }
    });

    const rejectedRiders = await this.apps.count({
      where: { kind: 'RIDER', status: ApplicationStatus.REJECTED }
    });
    const rejectedVendors = await this.apps.count({
      where: { kind: 'VENDOR', status: ApplicationStatus.REJECTED }
    });

    return {
      riders: {
        total: riderApps,
        approved: approvedRiders,
        pending: pendingRiders,
        rejected: rejectedRiders,
        approvalRate: riderApps > 0 ? ((approvedRiders / riderApps) * 100).toFixed(1) : '0.0'
      },
      vendors: {
        total: vendorApps,
        approved: approvedVendors,
        pending: pendingVendors,
        rejected: rejectedVendors,
        approvalRate: vendorApps > 0 ? ((approvedVendors / vendorApps) * 100).toFixed(1) : '0.0'
      },
      overall: {
        totalApplications: riderApps + vendorApps,
        totalApproved: approvedRiders + approvedVendors,
        totalPending: pendingRiders + pendingVendors,
        pendingReviewCount: pendingRiders + pendingVendors
      }
    };
  }

  async adminGetDocuments(applicationId: string): Promise<Array<Pick<Document, 'id' | 'kind' | 'fileName' | 'contentType' | 'createdAt'>>> {
    const documents = await this.documents.find({
      where: { applicationId },
      order: { createdAt: 'DESC' },
    });
    return documents.map(({ id, kind, fileName, contentType, createdAt }) => ({
      id,
      kind,
      fileName,
      contentType,
      createdAt,
    }));
  }
}
