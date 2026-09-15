import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ORE_BUS, ORE_ENV, ORE_NOTIFY, ORE_SCHEDULER } from '@ore/core';
import { loadEnv } from '@ore/config';
import { createMockRepository } from '@ore/testing';
import { DispatchService } from './dispatch.service';
import { Rider } from './entities/rider.entity';
import { Offer } from './entities/offer.entity';
import { Assignment } from './entities/assignment.entity';
import { Batch } from './entities/batch.entity';
import { DispatchAudit } from './entities/dispatch-audit.entity';
import { OfferExclusion } from './entities/offer-exclusion.entity';
import { RiderIncident } from './entities/rider-incident.entity';
import { RiderBlock } from './entities/rider-block.entity';
import { RiderIdentifierAudit } from './entities/rider-identifier.entity';
import { RiderPerformanceConfig, RiderPerformanceRecord, RiderPerformanceAudit } from './entities/rider-performance.entity';

/**
 * Shared harness for DispatchService specs.
 *
 * DispatchService takes sixteen constructor arguments, which is enough friction on its own to
 * explain why the largest service in the codebase had almost no tests. Wiring it once here
 * removes that excuse.
 */
export interface DispatchHarness {
  service: DispatchService;
  riders: ReturnType<typeof createMockRepository<Rider>>;
  offers: ReturnType<typeof createMockRepository<Offer>>;
  assignments: ReturnType<typeof createMockRepository<Assignment>>;
  batches: ReturnType<typeof createMockRepository<Batch>>;
  audit: ReturnType<typeof createMockRepository<DispatchAudit>>;
  exclusions: ReturnType<typeof createMockRepository<OfferExclusion>>;
  incidents: ReturnType<typeof createMockRepository<RiderIncident>>;
  blocks: ReturnType<typeof createMockRepository<RiderBlock>>;
  bus: { publish: jest.Mock };
  scheduler: { onInterval: jest.Mock; onProcess: jest.Mock; schedule: jest.Mock; cancel: jest.Mock };
  notify: { send: jest.Mock };
  module: TestingModule;
}

export async function buildDispatchHarness(envOverrides: Record<string, unknown> = {}): Promise<DispatchHarness> {
  const riders = createMockRepository<Rider>();
  const offers = createMockRepository<Offer>();
  const assignments = createMockRepository<Assignment>();
  const batches = createMockRepository<Batch>();
  const audit = createMockRepository<DispatchAudit>();
  const exclusions = createMockRepository<OfferExclusion>();
  const incidents = createMockRepository<RiderIncident>();
  const blocks = createMockRepository<RiderBlock>();

  const bus = { publish: jest.fn().mockResolvedValue(undefined) };
  const scheduler = {
    onInterval: jest.fn(),
    onProcess: jest.fn(),
    schedule: jest.fn().mockResolvedValue(undefined),
    cancel: jest.fn().mockResolvedValue(undefined),
  };
  const notify = { send: jest.fn().mockResolvedValue(undefined) };

  const module: TestingModule = await Test.createTestingModule({
    providers: [
      DispatchService,
      { provide: getRepositoryToken(Rider), useValue: riders },
      { provide: getRepositoryToken(Offer), useValue: offers },
      { provide: getRepositoryToken(Assignment), useValue: assignments },
      { provide: getRepositoryToken(Batch), useValue: batches },
      { provide: getRepositoryToken(DispatchAudit), useValue: audit },
      { provide: getRepositoryToken(OfferExclusion), useValue: exclusions },
      { provide: getRepositoryToken(RiderIncident), useValue: incidents },
      { provide: getRepositoryToken(RiderBlock), useValue: blocks },
      { provide: getRepositoryToken(RiderIdentifierAudit), useValue: createMockRepository<RiderIdentifierAudit>() },
      { provide: getRepositoryToken(RiderPerformanceConfig), useValue: createMockRepository<RiderPerformanceConfig>() },
      { provide: getRepositoryToken(RiderPerformanceRecord), useValue: createMockRepository<RiderPerformanceRecord>() },
      { provide: getRepositoryToken(RiderPerformanceAudit), useValue: createMockRepository<RiderPerformanceAudit>() },
      { provide: ORE_BUS, useValue: bus },
      { provide: ORE_SCHEDULER, useValue: scheduler },
      { provide: ORE_NOTIFY, useValue: notify },
      // Audit M-2: DispatchService now reads its knobs from the injected OreEnv, so the
      // harness starts from the real loadEnv() defaults rather than a two-field stub —
      // every dispatch/rider knob the service touches is present and correctly typed.
      { provide: ORE_ENV, useValue: { ...loadEnv(), riderClearHours: 24, ...envOverrides } },
    ],
  }).compile();

  return {
    service: module.get<DispatchService>(DispatchService),
    riders, offers, assignments, batches, audit, exclusions, incidents, blocks,
    bus, scheduler, notify, module,
  };
}

/** A minimally-populated assignment row. */
export function makeAssignment(over: Partial<Assignment> = {}): Assignment {
  return {
    id: 'assign-1',
    orderId: 'order-1',
    riderId: 'rider-1',
    status: 'ACTIVE',
    riderFeePesewas: 0,
    peakPayPesewas: 0,
    earningsPostedAt: null,
    assignedAt: new Date('2026-09-01T10:00:00.000Z'),
    completedAt: null,
    ...over,
  } as Assignment;
}

/**
 * A rider who passes every eligibility gate. Specs override one field at a time so each test
 * proves that one gate, rather than a soup of overlapping rejections.
 */
export function makeRider(over: Partial<Rider> = {}): Rider {
  return {
    id: 'rider-1',
    userId: 'user-1',
    name: 'Ama',
    phone: '+233200000000',
    vehicle: 'MOTORBIKE',
    licensePlate: 'GT-1234-24',
    status: 'AVAILABLE',
    lat: 5.6037,
    lng: -0.187,
    verified: true,
    riderIdentifier: 'ORE-ACC-2026-0001',
    cityId: 'accra',
    deliveryPartnerId: null,
    deliveryPartnerType: 'INDEPENDENT_DELIVERY_PARTNER',
    fleetPartnerId: null,
    contractType: 'ORE_DELIVERY_PARTNER',
    settlementMethod: 'INTERNAL_LEDGER',
    residentStatus: 'RESIDENT',
    codBlocked: false,
    codBlockReason: null,
    codTier: 'NEW',
    codStatus: 'ACTIVE',
    completedDeliveries: 10,
    errandTrustTier: 'NEW',
    completedErrands: 0,
    rating: 4,
    reliabilityScore: 1,
    declineCount: 0,
    timeoutCount: 0,
    cancellationCount: 0,
    restrictedUntil: null,
    restrictionReason: null,
    cooldownUntil: null,
    lastJobAt: null,
    idleSince: null,
    pausedUntil: null,
    sessionEndsAt: null,
    maxCodLimitPesewas: 0,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...over,
  } as unknown as Rider;
}

/** An order snapshot that no gate objects to: light, prepaid, ordinary food delivery. */
export function makeOrderSnapshot(over: Record<string, unknown> = {}): never {
  return {
    id: 'order-1',
    customerId: 'cust-1',
    vendorId: 'vendor-1',
    vendorType: 'FOOD',
    serviceCode: 'FD',
    orderType: 'DELIVERY',
    status: 'READY_FOR_PICKUP',
    paymentMethod: 'PREPAID',
    totalPesewas: 5000,
    riderFeePesewas: 0,
    peakPayPesewas: 0,
    parcelJson: null,
    errandJson: null,
    addressJson: { lat: 5.5913, lng: -0.2064, line1: '12 Oxford St', city: 'Accra' },
    ...over,
  } as never;
}
