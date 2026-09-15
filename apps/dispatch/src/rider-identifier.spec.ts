import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { Role, RiderIdentifierStatus, VehicleType } from '@ore/contracts';
import { DispatchService } from './dispatch.service';
import { Assignment, Batch, DispatchAudit, Offer, OfferExclusion, Rider, RiderBlock, RiderIdentifierAudit, RiderIdentifierSequence, RiderIncident, RiderPerformanceAudit, RiderPerformanceConfig, RiderPerformanceRecord } from './entities';

describe('DispatchService Rider ID assignment', () => {
  let ds: DataSource;
  let service: DispatchService;

  beforeEach(async () => {
    ds = new DataSource({
      type: 'sqlite',
      database: ':memory:',
      entities: [Rider, Offer, Assignment, DispatchAudit, OfferExclusion, Batch, RiderIncident, RiderBlock, RiderIdentifierSequence, RiderIdentifierAudit, RiderPerformanceAudit, RiderPerformanceConfig, RiderPerformanceRecord],
      synchronize: true,
    });
    await ds.initialize();

    const bus = { publish: jest.fn().mockResolvedValue(undefined) };
    const scheduler = {
      onProcess: jest.fn(),
      schedule: jest.fn().mockResolvedValue(undefined),
      cancel: jest.fn().mockResolvedValue(undefined),
    };
    const notify = { sendPush: jest.fn().mockResolvedValue(undefined), sendSms: jest.fn().mockResolvedValue(undefined) };

    service = new DispatchService(
      ds.getRepository(Rider),
      ds.getRepository(Offer),
      ds.getRepository(Assignment),
      ds.getRepository(Batch),
      ds.getRepository(DispatchAudit),
      ds.getRepository(OfferExclusion),
      ds.getRepository(RiderIncident),
      ds.getRepository(RiderBlock),
      ds.getRepository(RiderIdentifierAudit),
      ds.getRepository(RiderPerformanceConfig),
      ds.getRepository(RiderPerformanceRecord),
      ds.getRepository(RiderPerformanceAudit),
      bus as never,
      scheduler as never,
      {} as never,
      notify as never,
    );
  });

  afterEach(async () => {
    await ds.destroy();
  });

  it('generates backend-owned YDR IDs atomically per city and approval year', async () => {
    const year = new Date().getUTCFullYear();

    const first = await service.onboardRider({
      userId: 'user-1',
      name: 'Kwame Asante',
      phone: '0501234567',
      vehicle: VehicleType.MOTORBIKE,
      licensePlate: 'CR-200-10',
      approvedOperatingLocationId: 'cape-coast',
      approvalActorId: 'admin-1',
      sourceApplicationId: 'app-1',
    });
    const second = await service.onboardRider({
      userId: 'user-2',
      name: 'Ama Mensah',
      phone: '0507654321',
      vehicle: VehicleType.MOTORBIKE,
      licensePlate: 'CR-200-11',
      approvedOperatingLocationId: 'cape-coast',
      approvalActorId: 'admin-1',
      sourceApplicationId: 'app-2',
    });

    expect(first.riderIdentifier).toBe(`YDR-CC-${year}-0001`);
    expect(second.riderIdentifier).toBe(`YDR-CC-${year}-0002`);
    expect(first.id).not.toBe(first.riderIdentifier);
    expect(first.identifierStatus).toBe(RiderIdentifierStatus.ACTIVE);
    expect(first.cityId).toBe('cape-coast');
    expect(first.cityCode).toBe('CC');
    expect(first.sequenceNumber).toBe(1);

    const sequence = await ds.getRepository(RiderIdentifierSequence).findOneByOrFail({ cityCode: 'CC', approvalYear: year });
    expect(sequence.seq).toBe(2);
  });

  it('preserves an existing Rider ID on re-onboarding continuity', async () => {
    const rider = await service.onboardRider({
      userId: 'user-1',
      name: 'Kwame Asante',
      phone: '0501234567',
      vehicle: VehicleType.MOTORBIKE,
      licensePlate: 'CR-200-10',
      approvedOperatingLocationId: 'cape-coast',
      approvalActorId: 'admin-1',
      sourceApplicationId: 'app-1',
    });

    const reOnboarded = await service.onboardRider({
      userId: 'user-1',
      name: 'Kwame Asante Updated',
      phone: '0509999999',
      vehicle: VehicleType.MOTORBIKE,
      licensePlate: 'CR-200-10',
      approvedOperatingLocationId: 'cape-coast',
      approvalActorId: 'admin-2',
      sourceApplicationId: 'app-2',
    });

    expect(reOnboarded.id).toBe(rider.id);
    expect(reOnboarded.riderIdentifier).toBe(rider.riderIdentifier);
    expect(reOnboarded.name).toBe('Kwame Asante Updated');
  });

  it('updates delivery-partner tax profile fields without treating rider status as employee classification', async () => {
    const admin = { sub: 'admin-1', role: Role.ADMIN, adminRole: 'finance', phone: '0500000000' };
    const rider = await service.onboardRider({
      userId: 'user-1',
      name: 'Kwame Asante',
      phone: '0501234567',
      vehicle: VehicleType.MOTORBIKE,
      licensePlate: 'CR-200-10',
      approvedOperatingLocationId: 'cape-coast',
      approvalActorId: admin.sub,
      sourceApplicationId: 'app-1',
    });

    const updated = await service.setRiderTaxProfile(admin, rider.id, {
      residentStatus: 'RESIDENT',
      deliveryPartnerType: 'INDEPENDENT_DELIVERY_PARTNER',
      deliveryPartnerId: 'dp-kwame',
      contractType: 'INDEPENDENT_DELIVERY_PARTNER',
      settlementMethod: 'BANK_TRANSFER',
    });

    expect(updated.residentStatus).toBe('RESIDENT');
    expect(updated.deliveryPartnerType).toBe('INDEPENDENT_DELIVERY_PARTNER');
    expect(updated.deliveryPartnerId).toBe('dp-kwame');
    expect(updated.contractType).toBe('INDEPENDENT_DELIVERY_PARTNER');
    expect(updated.settlementMethod).toBe('BANK_TRANSFER');
    expect(updated.verified).toBe(true);

    const audit = await ds.getRepository(DispatchAudit).findOneByOrFail({ eventType: 'rider_tax_profile_updated' });
    expect(audit.detailJson).toEqual(expect.objectContaining({
      actor: admin.sub,
      riderId: rider.id,
      residentStatus: 'RESIDENT',
      deliveryPartnerType: 'INDEPENDENT_DELIVERY_PARTNER',
    }));
  });

  it('corrects Rider IDs only through the audited controlled process', async () => {
    const admin = { sub: 'admin-1', role: Role.ADMIN, adminRole: 'operations', phone: '0500000000' };
    const rider = await service.onboardRider({
      userId: 'user-1',
      name: 'Kwame Asante',
      phone: '0501234567',
      vehicle: VehicleType.MOTORBIKE,
      licensePlate: 'CR-200-10',
      approvedOperatingLocationId: 'cape-coast',
      approvalActorId: admin.sub,
      sourceApplicationId: 'app-1',
    });

    const corrected = await service.correctRiderIdentifier(admin, rider.id, {
      reason: 'Correct approved operating-location record after compliance review.',
      approvalReference: 'OPS-12345',
      approvedOperatingLocationId: 'cape-coast',
    });

    expect(corrected.riderIdentifier).not.toBe(rider.riderIdentifier);
    expect(corrected.sequenceNumber).toBe(2);

    const audit = await service.riderIdentifierAudit(rider.id);
    const correction = audit.find((entry) => entry.eventType === 'CORRECTED');
    expect(correction).toEqual(expect.objectContaining({
      previousIdentifier: rider.riderIdentifier,
      identifier: corrected.riderIdentifier,
      reason: 'Correct approved operating-location record after compliance review.',
      actorId: admin.sub,
      approvalReference: 'OPS-12345',
    }));

    const historicalSearch = await service.riderList(rider.riderIdentifier!);
    expect(historicalSearch.map((entry) => entry.id)).toContain(rider.id);
  });
});
