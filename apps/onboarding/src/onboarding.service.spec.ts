import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { OnboardingService } from './onboarding.service';
import { Application, ApplicationStatus } from './entities/application.entity';
import { Document } from './entities/document.entity';
import { IdCounter } from './entities/id-counter.entity';
import { AuditLog } from './entities/audit-log.entity';
import { SmileVerificationJob } from './entities/smile-verification-job.entity';
import { SmileIdService } from './smile-id.service';
import { ApplicationKind } from './entities/application.entity';
import { SmileIdStatus, VendorType } from '@ore/contracts';
import { ORE_BUS, ORE_ENV, ORE_NOTIFY, ORE_STORAGE } from '@ore/core';
import { PaystackClient } from '@ore/paystack';
import { createMockRepository, createTestRider, createTestVendor } from '@ore/testing';

// ── helpers ──────────────────────────────────────────────────────────────────

function makeApp(overrides: Partial<Application> = {}): Application {
  return {
    id: 'app-1',
    applicantUserId: 'user-1',
    applicantPhone: '0501234567',
    applicantName: null,
    kind: 'RIDER' as ApplicationKind,
    status: ApplicationStatus.IN_PROGRESS,
    currentStage: 1,
    maxStages: 4,
    stageData: {},
    smileIdStatus: SmileIdStatus.NOT_STARTED,
    vendorClass: null,
    vendorType: null,
    businessName: null,
    lat: null,
    lng: null,
    workplaceGps: null,
    payoutInfo: null,
    vehicle: null,
    reason: null,
    requiresActionField: null,
    publicId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as Application;
}

describe('OnboardingService', () => {
  let service: OnboardingService;
  let mockAppsRepo: ReturnType<typeof createMockRepository<Application>>;
  let mockDocumentsRepo: ReturnType<typeof createMockRepository<Document>>;
  let mockCountersRepo: ReturnType<typeof createMockRepository<IdCounter>>;
  let mockAuditLogsRepo: ReturnType<typeof createMockRepository<AuditLog>>;
  let mockSmileJobsRepo: ReturnType<typeof createMockRepository<SmileVerificationJob>>;
  let mockSmileIdService: { verifyBiometricIdentity: jest.Mock };
  let mockBus: { publish: jest.Mock };
  let mockNotify: { sendSms: jest.Mock; sendPush: jest.Mock };
  let mockStorage: { putObject: jest.Mock; createPresignedDownload: jest.Mock };
  let mockEnv: any;
  let mockPaystack: { createRecipient: jest.Mock; listGhanaPayoutProviders: jest.Mock };

  beforeEach(async () => {
    mockAppsRepo = createMockRepository<Application>();
    mockDocumentsRepo = createMockRepository<Document>();
    mockCountersRepo = createMockRepository<IdCounter>();
    mockAuditLogsRepo = createMockRepository<AuditLog>();
    mockSmileJobsRepo = createMockRepository<SmileVerificationJob>();

    mockSmileIdService = {
      verifyBiometricIdentity: jest.fn().mockResolvedValue({
        status: SmileIdStatus.QUEUED_FOR_MANUAL,
        resultCode: 1015,
        resultText: 'Queued for manual review',
        jobId: 'JOB-1',
        isDuplicateFace: false,
      }),
    };

    mockBus = { publish: jest.fn().mockResolvedValue(undefined) };
    mockNotify = {
      sendSms: jest.fn().mockResolvedValue(undefined),
      sendPush: jest.fn().mockResolvedValue(undefined),
    };
    mockStorage = {
      putObject: jest.fn().mockResolvedValue('https://storage.example.com/doc.pdf'),
      createPresignedDownload: jest.fn(),
    };
    mockEnv = { dbType: 'sqlite' };
    mockPaystack = {
      createRecipient: jest.fn().mockResolvedValue({ recipientCode: 'RCP_test', mode: 'test' }),
      listGhanaPayoutProviders: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OnboardingService,
        { provide: getRepositoryToken(Application), useValue: mockAppsRepo },
        { provide: getRepositoryToken(Document), useValue: mockDocumentsRepo },
        { provide: getRepositoryToken(IdCounter), useValue: mockCountersRepo },
        { provide: getRepositoryToken(AuditLog), useValue: mockAuditLogsRepo },
        { provide: getRepositoryToken(SmileVerificationJob), useValue: mockSmileJobsRepo },
        { provide: SmileIdService, useValue: mockSmileIdService },
        { provide: ORE_BUS, useValue: mockBus },
        { provide: ORE_NOTIFY, useValue: mockNotify },
        { provide: ORE_STORAGE, useValue: mockStorage },
        { provide: ORE_ENV, useValue: mockEnv },
        { provide: PaystackClient, useValue: mockPaystack },
      ],
    })
      .overrideProvider(SmileIdService)
      .useValue(mockSmileIdService)
      .compile();

    service = module.get<OnboardingService>(OnboardingService);
  });

  // ── getMyStatus ───────────────────────────────────────────────────

  describe('getMyStatus', () => {
    it('returns existing application for the user', async () => {
      const app = makeApp({ applicantUserId: 'user-1' });
      mockAppsRepo.findOne.mockResolvedValue(app);
      mockSmileJobsRepo.findOne.mockResolvedValue(null);

      const result = await service.getMyStatus('user-1', 'RIDER', '0501234567');

      expect(result.applicantUserId).toBe('user-1');
      expect(result.smileVerification).toBeNull();
    });

    it('creates a new DRAFT application when none exists', async () => {
      mockAppsRepo.findOne.mockResolvedValue(null);
      const newApp = makeApp({ status: ApplicationStatus.DRAFT });
      mockAppsRepo.create.mockReturnValue(newApp);
      mockAppsRepo.save.mockResolvedValue(newApp);
      mockSmileJobsRepo.findOne.mockResolvedValue(null);

      const result = await service.getMyStatus('new-user', 'RIDER', '0501111111');

      expect(mockAppsRepo.save).toHaveBeenCalled();
      expect(result.status).toBe(ApplicationStatus.DRAFT);
    });

    it('includes smile verification details when a job exists (RIDER)', async () => {
      const app = makeApp({ kind: 'RIDER' });
      const smileJob = {
        providerJobId: 'JOB-123',
        providerUserId: 'smile-user-1',
        status: SmileIdStatus.APPROVED,
        reason: null,
        message: null,
        createdAt: new Date('2026-08-20T10:00:00Z'),
        completedAt: new Date('2026-08-20T10:05:00Z'),
      } as SmileVerificationJob;

      mockAppsRepo.findOne.mockResolvedValue(app);
      mockSmileJobsRepo.findOne.mockResolvedValue(smileJob);

      const result = await service.getMyStatus('user-1', 'RIDER');

      expect(result.smileVerification).not.toBeNull();
      expect(result.smileVerification?.jobId).toBe('JOB-123');
      expect(result.smileVerification?.status).toBe(SmileIdStatus.APPROVED);
    });

    it('does not look up smile job for VENDOR applications', async () => {
      const app = makeApp({ kind: 'VENDOR' });
      mockAppsRepo.findOne.mockResolvedValue(app);

      const result = await service.getMyStatus('user-1', 'VENDOR');

      expect(mockSmileJobsRepo.findOne).not.toHaveBeenCalled();
      expect(result.smileVerification).toBeNull();
    });
  });

  // ── saveRiderStage ────────────────────────────────────────────────

  describe('saveRiderStage', () => {
    const riderUser = createTestRider('user-1');

    it('saves stage 1 personal details and advances currentStage to 2', async () => {
      const app = makeApp({ currentStage: 1, stageData: {} });
      mockAppsRepo.findOne.mockResolvedValue(app);
      mockAppsRepo.save.mockImplementation(async (v: any) => v as Application);

      await service.saveRiderStage(riderUser, 1, {
        firstName: 'Kwame',
        lastName: 'Asante',
        dob: '1995-06-15',
        email: 'kwame@example.com',
        gender: 'MALE',
        residentialAddress: { region: 'Greater Accra', city: 'Accra', digitalAddress: 'GA-123-4567', streetLandmark: 'Near the junction' },
        emergencyContact: { name: 'Sister Akua', relationship: 'Sister', phone: '0201234567' },
      });

      expect(app.applicantName).toBe('Kwame Asante');
      expect(app.currentStage).toBe(2);
      expect(app.stageData['stage1']).toBeDefined();
    });

    it('enforces stage gating — cannot skip ahead', async () => {
      const app = makeApp({ currentStage: 1, status: ApplicationStatus.IN_PROGRESS });
      mockAppsRepo.findOne.mockResolvedValue(app);

      await expect(service.saveRiderStage(riderUser, 3, {})).rejects.toThrow(Error);
      await expect(service.saveRiderStage(riderUser, 3, {})).rejects.toThrow(
        'Cannot access Stage 3 before completing Stage 1',
      );
    });

    it('saves stage 3 address details and advances currentStage to 4', async () => {
      const app = makeApp({ currentStage: 3, stageData: { stage1: {}, stage2: {} } });
      mockAppsRepo.findOne.mockResolvedValue(app);
      mockAppsRepo.save.mockImplementation(async (v: any) => v as Application);

      await service.saveRiderStage(riderUser, 3, {
        ghanaCardNumber: 'GHA-123456789-0',
        ghanaCardFrontKey: 'doc/123.jpg',
      });

      expect(app.currentStage).toBe(4);
      expect(app.stageData['stage3']).toBeDefined();
    });

    it('sets status to PENDING_REVIEW at stage 4 (final)', async () => {
      const app = makeApp({ currentStage: 4, stageData: { stage1: {}, stage2: {}, stage3: {} } });
      mockAppsRepo.findOne.mockResolvedValue(app);
      mockAppsRepo.save.mockImplementation(async (v: any) => v as Application);

      await service.saveRiderStage(riderUser, 4, {
        vehicleType: 'MOTORBIKE',
        licensePlate: 'GT-1234-20',
        payout: { type: 'MOMO', provider: 'MTN', accountNumber: '0501234567', accountName: 'Kwame Asante' },
      });

      expect(app.status).toBe(ApplicationStatus.PENDING_REVIEW);
    });
  });

  // ── saveVendorStage ───────────────────────────────────────────────

  describe('saveVendorStage', () => {
    const vendorUser = createTestVendor('user-2');

    it('saves stage 1 vendor type selection', async () => {
      const app = makeApp({ kind: 'VENDOR', currentStage: 1, maxStages: 5, stageData: {} });
      mockAppsRepo.findOne.mockResolvedValue(app);
      mockAppsRepo.save.mockImplementation(async (v: any) => v as Application);

      await service.saveVendorStage(vendorUser, 1, {
        vendorType: 'FOOD',
        vendorClass: 'INDIVIDUAL',
      });

      expect(app.vendorType).toBe(VendorType.FOOD);
      expect(app.currentStage).toBe(2);
    });

    it('rejects stage 2 when GPS is mocked / fake', async () => {
      const app = makeApp({ kind: 'VENDOR', currentStage: 2, stageData: { stage1: {} } });
      mockAppsRepo.findOne.mockResolvedValue(app);

      await expect(
        service.saveVendorStage(vendorUser, 2, {
          businessName: 'Kwame Foods',
          description: 'A test restaurant',
          businessPhone: '0501234567',
          businessEmail: 'test@example.com',
          displayAddress: { city: 'Accra', streetAddress: 'Test St', region: 'Greater Accra', landmark: 'None', digitalAddress: 'GA-000-0000' },
          workplaceGps: { lat: 5.1053, lng: -1.2466, isMock: true, accuracy: 10 },
        }),
      ).rejects.toThrow(Error);
      await expect(
        service.saveVendorStage(vendorUser, 2, {
          businessName: 'Kwame Foods',
          description: 'A test restaurant',
          businessPhone: '0501234567',
          businessEmail: 'test@example.com',
          displayAddress: { city: 'Accra', streetAddress: 'Test St', region: 'Greater Accra', landmark: 'None', digitalAddress: 'GA-000-0000' },
          workplaceGps: { lat: 5.1053, lng: -1.2466, isMock: true, accuracy: 10 },
        }),
      ).rejects.toThrow('GPS spoofing');
    });

    it('saves stage 2 with real GPS coordinates', async () => {
      const app = makeApp({ kind: 'VENDOR', currentStage: 2, stageData: { stage1: {} } });
      mockAppsRepo.findOne.mockResolvedValue(app);
      mockAppsRepo.save.mockImplementation(async (v: any) => v as Application);

      await service.saveVendorStage(vendorUser, 2, {
        businessName: 'Kwame Foods',
        description: 'A test restaurant',
        businessPhone: '0501234567',
        businessEmail: 'test@example.com',
        displayAddress: { city: 'Accra', streetAddress: 'Test St', region: 'Greater Accra', landmark: 'None', digitalAddress: 'GA-000-0000' },
        workplaceGps: { lat: 5.1053, lng: -1.2466, isMock: false, accuracy: 10 },
      });

      expect(app.businessName).toBe('Kwame Foods');
      expect(app.lat).toBe(5.1053);
      expect(app.currentStage).toBe(3);
    });

    it('sets status to PENDING_REVIEW at stage 5 (final)', async () => {
      const app = makeApp({
        kind: 'VENDOR',
        currentStage: 5,
        maxStages: 5,
        stageData: { stage1: {}, stage2: {}, stage3: {}, stage4: {} },
      });
      mockAppsRepo.findOne.mockResolvedValue(app);
      mockAppsRepo.save.mockImplementation(async (v: any) => v as Application);

      await service.saveVendorStage(vendorUser, 5, {
        payout: { type: 'MOMO', provider: 'MTN', accountNumber: '0501234567', accountName: 'Vendor' },
        acceptedTerms: true,
      });

      expect(app.status).toBe(ApplicationStatus.PENDING_REVIEW);
    });
  });

  // ── admin operations ──────────────────────────────────────────────

  describe('adminList', () => {
    it('returns all applications when no filters provided', async () => {
      const apps = [makeApp(), makeApp({ id: 'app-2', kind: 'VENDOR' })];
      mockAppsRepo.find.mockResolvedValue(apps);

      const result = await service.adminList();

      expect(result).toHaveLength(2);
      expect(mockAppsRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: {}, order: { createdAt: 'DESC' } }),
      );
    });

    it('filters by status and kind when provided', async () => {
      mockAppsRepo.find.mockResolvedValue([]);

      await service.adminList('PENDING_REVIEW', 'RIDER');

      expect(mockAppsRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { status: 'PENDING_REVIEW', kind: 'RIDER' } }),
      );
    });
  });

  describe('adminGet', () => {
    it('returns the application by id', async () => {
      const app = makeApp();
      mockAppsRepo.findOne.mockResolvedValue(app);

      const result = await service.adminGet('app-1');

      expect(result.id).toBe('app-1');
    });

    it('throws NotFoundException for unknown id', async () => {
      mockAppsRepo.findOne.mockResolvedValue(null);

      await expect(service.adminGet('missing')).rejects.toThrow(NotFoundException);
      await expect(service.adminGet('missing')).rejects.toThrow('Application not found');
    });
  });

  describe('reject', () => {
    const admin = { sub: 'admin-1', role: 'ADMIN' as any, phone: '0500000000' };

    it('sets status to REJECTED, saves reason, sends notifications, and logs audit', async () => {
      const app = makeApp({ status: ApplicationStatus.PENDING_REVIEW });
      mockAppsRepo.findOne.mockResolvedValue(app);
      mockAppsRepo.save.mockImplementation(async (v: any) => v as Application);
      mockAuditLogsRepo.create.mockImplementation((v: any) => v as AuditLog);
      mockAuditLogsRepo.save.mockResolvedValue({} as AuditLog);

      const result = await service.reject(admin, 'app-1', 'Documents expired');

      expect(result.status).toBe(ApplicationStatus.REJECTED);
      expect(result.reason).toBe('Documents expired');
      expect(mockNotify.sendSms).toHaveBeenCalledWith(
        expect.objectContaining({ text: expect.stringContaining('Documents expired') }),
      );
      expect(mockAuditLogsRepo.save).toHaveBeenCalled();
    });

    it('throws BadRequestException when rejection reason is empty', async () => {
      const app = makeApp({ status: ApplicationStatus.PENDING_REVIEW });
      mockAppsRepo.findOne.mockResolvedValue(app);

      await expect(service.reject(admin, 'app-1', '   ')).rejects.toThrow(Error);
      await expect(service.reject(admin, 'app-1', '')).rejects.toThrow(
        'Rejection requires an explicit reason',
      );
    });
  });

  describe('requiresAction', () => {
    const admin = { sub: 'admin-1', role: 'ADMIN' as any, phone: '0500000000' };

    it('sets status to REQUIRES_ACTION and rewinds currentStage', async () => {
      const app = makeApp({ currentStage: 3 });
      mockAppsRepo.findOne.mockResolvedValue(app);
      mockAppsRepo.save.mockImplementation(async (v: any) => v as Application);
      mockAuditLogsRepo.create.mockImplementation((v: any) => v as AuditLog);
      mockAuditLogsRepo.save.mockResolvedValue({} as AuditLog);

      await service.requiresAction(admin, 'app-1', 'licenseNumber', 'License number is invalid', 2);

      expect(app.status).toBe(ApplicationStatus.REQUIRES_ACTION);
      expect(app.currentStage).toBe(2);
      expect(app.requiresActionField).toBe('licenseNumber');
      expect(mockNotify.sendSms).toHaveBeenCalled();
      expect(mockNotify.sendPush).toHaveBeenCalled();
    });
  });

  describe('approve', () => {
    const admin = { sub: 'admin-1', role: 'ADMIN' as any, phone: '0500000000' };

    it('throws ForbiddenException if SmileID not approved for RIDER', async () => {
      const app = makeApp({ status: ApplicationStatus.PENDING_REVIEW, smileIdStatus: SmileIdStatus.PROCESSING });
      mockAppsRepo.findOne.mockResolvedValue(app);

      await expect(service.approve(admin, 'app-1')).rejects.toThrow(ForbiddenException);
      await expect(service.approve(admin, 'app-1')).rejects.toThrow('SmileID verification must be approved');
    });

    it('is idempotent — returns immediately if already approved', async () => {
      const app = makeApp({ status: ApplicationStatus.APPROVED, smileIdStatus: SmileIdStatus.APPROVED });
      mockAppsRepo.findOne.mockResolvedValue(app);

      const result = await service.approve(admin, 'app-1');

      expect(result.status).toBe(ApplicationStatus.APPROVED);
      expect(mockAppsRepo.save).not.toHaveBeenCalled();
    });
  });

  // ── uploadFileForUser ─────────────────────────────────────────────

  describe('uploadFileForUser', () => {
    it('throws ForbiddenException when no active application found', async () => {
      mockAppsRepo.findOne.mockResolvedValue(null);

      await expect(
        service.uploadFileForUser('user-1', 'onboarding-documents/app-1/doc.pdf', 'application/pdf', Buffer.from('data').toString('base64')),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws ForbiddenException when upload key does not belong to application', async () => {
      const app = makeApp({ id: 'app-2' });
      mockAppsRepo.findOne.mockResolvedValue(app);

      // Key prefix is for a different app id
      await expect(
        service.uploadFileForUser('user-1', 'onboarding-documents/app-9/doc.pdf', 'image/jpeg', Buffer.from('x').toString('base64')),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.uploadFileForUser('user-1', 'onboarding-documents/app-9/doc.pdf', 'image/jpeg', Buffer.from('x').toString('base64')),
      ).rejects.toThrow('not owned by this onboarding application');
    });

    it('throws BadRequestException for unsupported content type', async () => {
      const app = makeApp({ id: 'app-1' });
      mockAppsRepo.findOne.mockResolvedValue(app);

      await expect(
        service.uploadFileForUser('user-1', 'onboarding-documents/app-1/doc.gif', 'image/gif', Buffer.from('x').toString('base64')),
      ).rejects.toThrow(Error);
      await expect(
        service.uploadFileForUser('user-1', 'onboarding-documents/app-1/doc.gif', 'image/gif', Buffer.from('x').toString('base64')),
      ).rejects.toThrow('Unsupported document content type');
    });

    it('stores the file and returns a URL for valid input', async () => {
      const app = makeApp({ id: 'app-1' });
      mockAppsRepo.findOne.mockResolvedValue(app);

      const validBase64 = Buffer.from('fake-pdf-content').toString('base64');
      mockStorage.putObject.mockResolvedValue('https://storage.example.com/doc.pdf');

      const result = await service.uploadFileForUser(
        'user-1',
        'onboarding-documents/app-1/national_id.pdf',
        'application/pdf',
        validBase64,
      );

      expect(result.url).toBe('https://storage.example.com/doc.pdf');
      expect(mockStorage.putObject).toHaveBeenCalledWith(
        'onboarding-documents/app-1/national_id.pdf',
        expect.any(Buffer),
        'application/pdf',
      );
    });

    it('rejects path traversal attempts', async () => {
      const app = makeApp({ id: 'app-1' });
      mockAppsRepo.findOne.mockResolvedValue(app);

      await expect(
        service.uploadFileForUser('user-1', 'onboarding-documents/app-1/../../../etc/passwd', 'image/jpeg', Buffer.from('x').toString('base64')),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ── requirements.ts ───────────────────────────────────────────────

  describe('requiredDocuments (requirements.ts)', () => {
    it('requires 3 documents for RIDER', async () => {
      const { requiredDocuments } = await import('./requirements');
      const docs = requiredDocuments('RIDER');
      expect(docs).toContain('national_id');
      expect(docs).toContain('drivers_license');
      expect(docs).toContain('vehicle_registration');
      expect(docs).toHaveLength(3);
    });

    it('requires pharmacy_license for PHARMACY vendors', async () => {
      const { requiredDocuments } = await import('./requirements');
      const docs = requiredDocuments('VENDOR', 'BUSINESS', VendorType.PHARMACY);
      expect(docs).toContain('pharmacy_license');
    });

    it('requires business_registration for BUSINESS class vendors', async () => {
      const { requiredDocuments } = await import('./requirements');
      const docs = requiredDocuments('VENDOR', 'BUSINESS', VendorType.FOOD);
      expect(docs).toContain('business_registration');
      expect(docs).not.toContain('selfie');
    });

    it('requires selfie for INDIVIDUAL class vendors', async () => {
      const { requiredDocuments } = await import('./requirements');
      const docs = requiredDocuments('VENDOR', 'INDIVIDUAL', VendorType.GROCERY);
      expect(docs).toContain('selfie');
      expect(docs).not.toContain('business_registration');
    });
  });

  // ── adminStats ────────────────────────────────────────────────────

  describe('adminStats', () => {
    it('returns counts and approval rates for riders and vendors', async () => {
      mockAppsRepo.count
        .mockResolvedValueOnce(10)  // riderApps
        .mockResolvedValueOnce(8)   // vendorApps
        .mockResolvedValueOnce(7)   // approvedRiders
        .mockResolvedValueOnce(5)   // approvedVendors
        .mockResolvedValueOnce(2)   // pendingRiders
        .mockResolvedValueOnce(3)   // pendingVendors
        .mockResolvedValueOnce(1)   // rejectedRiders
        .mockResolvedValueOnce(0);  // rejectedVendors

      const result = await service.adminStats();

      expect(result.riders.total).toBe(10);
      expect(result.riders.approved).toBe(7);
      expect(result.riders.approvalRate).toBe('70.0');
      expect(result.vendors.total).toBe(8);
      expect(result.overall.totalApplications).toBe(18);
      expect(result.overall.pendingReviewCount).toBe(5);
    });

    it('returns 0.0 approval rate when no applications exist', async () => {
      mockAppsRepo.count.mockResolvedValue(0);

      const result = await service.adminStats();

      expect(result.riders.approvalRate).toBe('0.0');
      expect(result.vendors.approvalRate).toBe('0.0');
    });
  });
});
