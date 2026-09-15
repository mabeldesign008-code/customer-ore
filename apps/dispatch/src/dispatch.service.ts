/** Dispatch engine — ore doc §2 (Dispatch, Delivery & Rider Logic).
 *  Competitive acceptance model: eligible riders scored + ranked, offer sent to top-N
 *  simultaneously, first eligible accept within the window wins, others cancelled.
 *  Declined/timed-out riders excluded from the same order. Radius expands +2km per wave.
 *  Every dispatch decision is audit-logged. Rider payout = distance-based formula. */

import { BadRequestException, ConflictException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, EntityManager, In, Like, MoreThanOrEqual, Repository } from 'typeorm';
import {
  BatchStatus,
  BatchType,
  BatchDto,
  BatchRouteStop,
  ErrandTrustTier,
  EVENTS,
  OfferStatus,
  OrderStatus,
  OrderType,
  PaymentMethod,
  Role,
  RiderCodStatus,
  RiderCodTier,
  RiderStatus,
  VehicleType,
  VendorType,
  OfferDto,
  RiderTaskDto,
  RiderOrderItemDto,
  RiderRouteStopDto,
  RiderLaundryContextDto,
  RiderMarketContextDto,
  RiderPharmacyContextDto,
  RiderErrandContextDto,
  RiderParcelContextDto,
  RiderDemandZonesDto,
  RiderPerformanceDto,
  feePolicyFromEnv,
  riderPayout,
  nextCodTier,
  codLimitPesewas,
  evaluatePeakPay,
  parsePeakPayWindows,
  PeakPayDecision,
  RiderBlockDto,
  RiderIdentifierCorrectionDto,
  RiderIdentifierStatus,
  OnboardRiderDto,
  findOreLocationCode,
  formatRiderIdentifier,
  normalizeOreCityCode,
  coveringRiderBlock,
  evaluateRiderBlock,
  parseRiderBlockTimes,
  shouldDropUnstartedBlock,
  DeliveryAddressDto,
  DeliveryPartnerTaxProfileUpsertDto,
  DEFAULT_RIDER_PERFORMANCE_CONFIG,
  PerformanceCorrectionDto,
  PerformanceEngineConfig,
  PerformanceHistorySearchDto,
  PerformanceMetricInput,
  PerformanceReviewRunDto,
  RiderIncidentAttributionDto,
  scorePerformance, PrepTimeAdjustment, PrepTimeSignals, estimatePrepTime } from '@ore/contracts';
import { distanceKm, isPointInZone, loadZone, withinM, isOppositeDirection } from '@ore/geo';
import { ORE_BUS, ORE_ENV, ORE_SCHEDULER, ORE_NOTIFY, JwtPayload, internalFetch, serviceUrl } from '@ore/core';
import { Bus } from '@ore/bus';
import { Scheduler } from '@ore/jobs';
import { OreEnv } from '@ore/config';
import { NotifyClient } from '@ore/notify';
import { Rider } from './entities/rider.entity';
import { Offer } from './entities/offer.entity';
import { Assignment, AssignmentStatus } from './entities/assignment.entity';
import { parseScoringWeights, scoreCandidate, pickupEtaMin, vehicleSuitability, isMarketLoad, DispatchScoringWeights } from './candidate-score';
import { boundingBox } from './geo-filter';
import { Batch } from './entities/batch.entity';
import { RiderIncident } from './entities/rider-incident.entity';
import { RiderBlock } from './entities/rider-block.entity';
import { RiderIdentifierAudit, RiderIdentifierSequence } from './entities/rider-identifier.entity';
import { RiderPerformanceAudit, RiderPerformanceConfig, RiderPerformanceRecord } from './entities/rider-performance.entity';
import { DispatchAudit } from './entities/dispatch-audit.entity';
import { OfferExclusion } from './entities/offer-exclusion.entity';
import { DemandOrderSignal, DemandRiderSignal, DemandZoneDefinition, scoreDemandZones } from './demand-score';

interface OrderSnapshot {
  id: string;
  ref: string;
  status: string;
  checkoutId: string;
  orderType: string;
  vendorId: string;
  vendorName: string;
  vendorType: VendorType;
  serviceCode: string;
  serviceLevel?: 'STANDARD' | 'SCHEDULED' | 'PRIORITY';
  customerId: string;
  customerPhone: string | null;
  recipientJson: { phone: string } | null;
  paymentMethod: string;
  totalPesewas: number;
  riderFeePesewas: number;
  tipPesewas?: number;
  peakPayPesewas?: number;
  leaveAtDoor?: boolean;
  dropNote?: string | null;
  scheduledFor?: string | null;
  note?: string | null;
  createdAt?: string;
  acceptedAt?: string | null;
  readyAt?: string | null;
  estimatedReadyAt?: string | null;
  originalPrepTimeMin?: number | null;
  prepTimeExtendedByMin?: number;
  prepExtensionCount?: number;
  addressJson: DeliveryAddressDto;
  pickupJson?: { locationId: string | null; name: string; address: string | null; lat: number; lng: number } | null;
  parcelJson?: {
    sender: { name: string; phone: string; address: DeliveryAddressDto };
    recipient: { name: string; phone: string; address: DeliveryAddressDto };
    category: string;
    weightKg: number;
    dimensionsCm: { length: number; width: number; height: number } | null;
    declaredValuePesewas: number;
    description: string;
    fragile: boolean;
    sealed: boolean;
    pickupMode: string;
    proofMode: string;
    parcelStatus: string;
    returnReason: string | null;
  } | null;
  prescriptionStatus?: string;
  conditionJson?: Record<string, unknown> | null;
  marketFulfillmentJson?: {
    recordedAt: string;
    lines: { orderItemId: string; actualQuantity: number; unit: string; actualPricePesewas: number | null; note: string | null }[];
  } | null;
  laundryStage?: string | null;
  items?: Array<{
    id: string;
    itemId: string;
    name: string;
    qty: number;
    unit?: string | null;
    modifiers?: string[];
    selectedOptions?: Record<string, unknown>[];
    optionsTotalPesewas?: number;
    prescriptionOnly?: boolean;
  }>;
  errandJson: {
    task: string;
    shopName: string | null;
    shopLat: number;
    shopLng: number;
    budgetPesewas: number;
    escrowPesewas: number;
    errandStatus: string;
    trustTier: string | null;
    spentPesewas: number;
    receipts?: { amountPesewas: number; photoKey: string; note: string | null; at: string }[];
    substitution?: { item: string; pricePesewas: number; status: string } | null;
  } | null;
}

interface VendorMeta {
  name: string;
  vendorType: VendorType;
  lat: number;
  lng: number;
  locations?: Array<{
    id: string;
    vendorId: string;
    name: string;
    address: string;
    lat: number;
    lng: number;
    deliveryRadiusKm: number;
    accepting: boolean;
    active: boolean;
  }>;
}

interface EligibilityValidation {
  ok: boolean;
  reasons: string[];
  distanceKm?: number;
  score?: number;
  vehicleSuitability?: number;
  codExposurePesewas?: number;
  etaMin?: number;
  routeExtraKm?: number;
}

interface DispatchCandidate {
  rider: Rider;
  distanceKm: number;
  score: number;
  validationJson: EligibilityValidation;
}

const JOB_T5 = (orderId: string) => `dispatch-t5-${orderId}`;
const JOB_OFFER = (offerId: string) => `offer-expiry-${offerId}`;
const JOB_RETRY = (orderId: string) => `dispatch-retry-${orderId}`;
const JOB_READY = (orderId: string) => `dispatch-ready-${orderId}`;
const JOB_PAUSE_RESUME = (riderId: string) => `rider-pause-resume-${riderId}`;
const JOB_SESSION_END = (riderId: string) => `rider-session-end-${riderId}`;

@Injectable()
export class DispatchService {
  constructor(
    @InjectRepository(Rider) private readonly riders: Repository<Rider>,
    @InjectRepository(Offer) private readonly offers: Repository<Offer>,
    @InjectRepository(Assignment) private readonly assignments: Repository<Assignment>,
    @InjectRepository(Batch) private readonly batches: Repository<Batch>,
    @InjectRepository(DispatchAudit) private readonly audit: Repository<DispatchAudit>,
    @InjectRepository(OfferExclusion) private readonly exclusions: Repository<OfferExclusion>,
    @InjectRepository(RiderIncident) private readonly incidents: Repository<RiderIncident>,
    @InjectRepository(RiderBlock) private readonly blocks: Repository<RiderBlock>,
    @InjectRepository(RiderIdentifierAudit) private readonly identifierAudits: Repository<RiderIdentifierAudit>,
    @InjectRepository(RiderPerformanceConfig) private readonly performanceConfigs: Repository<RiderPerformanceConfig>,
    @InjectRepository(RiderPerformanceRecord) private readonly performanceRecords: Repository<RiderPerformanceRecord>,
    @InjectRepository(RiderPerformanceAudit) private readonly performanceAudits: Repository<RiderPerformanceAudit>,
    @Inject(ORE_BUS) private readonly bus: Bus,
    @Inject(ORE_SCHEDULER) private readonly scheduler: Scheduler,
    @Inject(ORE_ENV) private readonly env: OreEnv,
    @Inject(ORE_NOTIFY) private readonly notify: NotifyClient,
  ) {
    this.registerJobs();
  }

  // ── config (doc §2B–2E) ───────────────────────────────────────────
  private poolRadiusKm(): number { return this.env.dispatchPoolRadiusKm; }
  private expandStepKm(): number { return this.env.dispatchExpandStepKm; }
  private maxRadiusKm(): number { return this.env.dispatchMaxRadiusKm; }
  private waveSize(): number { return this.env.dispatchWaveSize; }
  private offerWindowSec(): number { return clamp(this.env.riderOfferWindowSec, 10, 20); }
  private declineCooldownAfter(): number { return this.env.riderDeclineCooldownAfter; }
  private cooldownMin(): number { return this.env.riderCooldownMin; }
  private tierExperiencedDeliveries(): number { return this.env.riderTierExperiencedDeliveries; }
  private tierSeniorDeliveries(): number { return this.env.riderTierSeniorDeliveries; }

  // ── doc §2 grouping/batching knobs ────────────────────────────────
  private groupingEnabled(): boolean { return this.env.dispatchGrouping; }
  /** doc §2: short join window after READY so sibling orders/vendors can group before dispatch. */
  private groupJoinWindowMs(): number { return this.env.groupJoinWindowMs; }
  private groupMaxVendors(): number { return this.env.groupMaxVendors; }
  private groupVendorDistanceKm(): number { return this.env.groupVendorDistanceKm; }
  private batchMaxOrders(): number { return this.env.batchMaxOrders; }
  private batchVendorDistanceKm(): number { return this.env.batchVendorDistanceKm; }
  private batchDropDistanceKm(): number { return this.env.batchDropDistanceKm; }
  private groupingThresholdMin(): number { return this.env.multiVendorGroupingThresholdMin; }
  private routeMaxExtraKm(): number { return this.env.dispatchRouteMaxExtraKm; }
  private excludeTimeoutsFromSameOrder(): boolean { return this.env.dispatchExcludeTimeouts; }

  private validationRecord(validation: EligibilityValidation): Record<string, unknown> {
    return { ...validation };
  }

  private approvedOperatingLocation(locationId?: string) {
    const requested = locationId ?? (this.env.defaultRiderLocationId || loadZone().id);
    const location = findOreLocationCode(requested);
    if (!location || !location.active) {
      throw new BadRequestException('Approved Rider operating location is not in the Ore location-code register');
    }
    return location;
  }

  private approvalYearFor(date: Date): number {
    return date.getUTCFullYear();
  }

  private async nextRiderIdentifierSequence(
    manager: EntityManager,
    cityCode: string,
    approvalYear: number,
  ): Promise<number> {
    const repo = manager.getRepository(RiderIdentifierSequence);
    const code = normalizeOreCityCode(cityCode);
    const isPostgres = manager.connection.options.type === 'postgres';

    if (isPostgres) {
      const schema = repo.metadata.schema ? `"${repo.metadata.schema}".` : '';
      const table = `${schema}"${repo.metadata.tableName}"`;
      const rows = (await manager.query(
        `INSERT INTO ${table} ("cityCode", "approvalYear", "seq") VALUES ($1, $2, 1)
         ON CONFLICT ("cityCode", "approvalYear") DO UPDATE SET "seq" = "${repo.metadata.tableName}"."seq" + 1
         RETURNING "seq"`,
        [code, approvalYear],
      )) as Array<{ seq: number | string }>;
      return Number(rows[0]?.seq ?? 1);
    }

    await manager.query(
      `INSERT INTO "${repo.metadata.tableName}" ("cityCode", "approvalYear", "seq") VALUES (?, ?, 1)
       ON CONFLICT ("cityCode", "approvalYear") DO UPDATE SET "seq" = "seq" + 1`,
      [code, approvalYear],
    );
    const rows = (await manager.query(
      `SELECT "seq" FROM "${repo.metadata.tableName}" WHERE "cityCode" = ? AND "approvalYear" = ?`,
      [code, approvalYear],
    )) as Array<{ seq: number | string }>;
    return Number(rows[0]?.seq ?? 1);
  }

  private scoringWeights(): DispatchScoringWeights {
    return parseScoringWeights(this.env.dispatchScoringWeightsJson || undefined);
  }

  /** doc §8 rider milestones — GHS 100 @25 / GHS 200 @50 deliveries, verified + good standing. */
  private async maybeMilestone(rider: Rider): Promise<void> {
    if (!rider.verified) return;
    if (rider.codStatus === RiderCodStatus.INVESTIGATION || rider.codStatus === RiderCodStatus.TERMINATED) return;
    const m25 = this.env.riderMilestone25Deliveries;
    const m50 = this.env.riderMilestone50Deliveries;
    if (rider.completedDeliveries === m25) {
      await this.bus.publish(EVENTS.RIDER_MILESTONE_EARNED, { riderId: rider.id, milestone: m25, amountPesewas: this.env.riderMilestone25Pesewas });
    } else if (rider.completedDeliveries === m50) {
      await this.bus.publish(EVENTS.RIDER_MILESTONE_EARNED, { riderId: rider.id, milestone: m50, amountPesewas: this.env.riderMilestone50Pesewas });
    }
  }

  // ── doc §Errands trust tiers ──────────────────────────────────────
  private errandTierLimit(tier: ErrandTrustTier): number {
    switch (tier) {
      case ErrandTrustTier.CAP: return this.env.errandTierCapLimitPesewas;
      case ErrandTrustTier.TRUSTED: return this.env.errandTierTrustedLimitPesewas;
      case ErrandTrustTier.VERIFIED: return this.env.errandTierVerifiedLimitPesewas;
      default: return this.env.errandTierNewLimitPesewas;
    }
  }

  private errandTierFor(completedErrands: number): ErrandTrustTier {
    if (completedErrands >= this.env.errandTierCapDeliveries) return ErrandTrustTier.CAP;
    if (completedErrands >= this.env.errandTierTrustedDeliveries) return ErrandTrustTier.TRUSTED;
    if (completedErrands >= this.env.errandTierVerifiedDeliveries) return ErrandTrustTier.VERIFIED;
    return ErrandTrustTier.NEW;
  }

  // ── Rider lifecycle (doc §5 rider) ────────────────────────────────
  async updateRiderProfile(user: JwtPayload, body: { vehicle: VehicleType; licensePlate?: string | null }): Promise<Rider> {
    const rider = await this.riderForUser(user);
    if ([RiderStatus.ASSIGNED, RiderStatus.PICKED_UP, RiderStatus.OFFERED].includes(rider.status)) {
      throw new ConflictException('Finish or decline the current task before changing vehicle');
    }
    if ((body.vehicle === VehicleType.MOTORBIKE || body.vehicle === VehicleType.CAR) && !body.licensePlate?.trim()) {
      throw new BadRequestException('A license plate is required for motorbike and car');
    }
    rider.vehicle = body.vehicle;
    rider.licensePlate = body.vehicle === VehicleType.BICYCLE ? (body.licensePlate?.trim() || null) : body.licensePlate!.trim();
    await this.riders.save(rider);
    await this.auditLog(null, 'rider_vehicle_updated', { riderId: rider.id, vehicle: rider.vehicle });
    return rider;
  }

  async registerRider(user: JwtPayload, body: { name: string; phone: string; vehicle?: VehicleType; licensePlate?: string; lat?: number; lng?: number }): Promise<Rider> {
    const existing = await this.riders.findOne({ where: { userId: user.sub } });
    if (existing) throw new ConflictException('Rider profile already exists');
    const rider = await this.riders.save(
      this.riders.create({
        userId: user.sub,
        name: body.name,
        phone: body.phone,
        vehicle: body.vehicle ?? VehicleType.MOTORBIKE,
        licensePlate: body.licensePlate?.trim() || null,
        status: RiderStatus.OFFLINE, // must be approved + go online before orders
        lat: body.lat ?? null,
        lng: body.lng ?? null,
        idleSince: new Date(),
      }),
    );
    return rider;
  }

  async setAvailability(user: JwtPayload, status: RiderStatus.AVAILABLE | RiderStatus.OFFLINE): Promise<Rider> {
    const rider = await this.riderForUser(user);
    if (status === RiderStatus.AVAILABLE && (!rider.verified || !rider.riderIdentifier)) {
      throw new ForbiddenException('Rider not approved yet — Rider ID has not been assigned');
    }
    if (status === RiderStatus.OFFLINE) {
      const active = await this.assignments.findOne({ where: { riderId: rider.id, status: 'ACTIVE' } });
      if (active) throw new ConflictException('Complete your current delivery before going offline');
    }
    rider.status = status;
    rider.pausedUntil = null;
    if (status === RiderStatus.AVAILABLE) {
      rider.idleSince = new Date();
      rider.sessionEndsAt = new Date(Date.now() + this.env.riderDefaultSessionMin * 60_000);
      await this.applyCoveringBlock(rider);
      await this.scheduler.schedule('rider-session-end', { riderId: rider.id }, Math.max(1, rider.sessionEndsAt.getTime() - Date.now()), JOB_SESSION_END(rider.id));
    } else {
      rider.sessionEndsAt = null;
      await this.scheduler.cancel(JOB_SESSION_END(rider.id));
      await this.completeActiveBlocks(rider.id);
    }
    await this.riders.save(rider);
    return rider;
  }

  async pauseRider(user: JwtPayload, minutes: number): Promise<Rider> {
    const rider = await this.riderForUser(user);
    if (!rider.verified || !rider.riderIdentifier) throw new ForbiddenException('Rider not approved yet — Rider ID has not been assigned');
    const active = await this.assignments.findOne({ where: { riderId: rider.id, status: 'ACTIVE' } });
    if (active) throw new ConflictException('Complete your current delivery before pausing');
    const pending = await this.offers.find({ where: { riderId: rider.id, status: OfferStatus.PENDING } });
    for (const offer of pending) {
      offer.status = OfferStatus.SUPERSEDED;
      await this.offers.save(offer);
      await this.scheduler.cancel(JOB_OFFER(offer.id));
    }
    rider.status = RiderStatus.PAUSED;
    rider.idleSince = null;
    rider.pausedUntil = new Date(Date.now() + minutes * 60_000);
    await this.riders.save(rider);
    await this.scheduler.schedule('rider-pause-resume', { riderId: rider.id }, minutes * 60_000, JOB_PAUSE_RESUME(rider.id));
    await this.auditLog(null, 'rider_paused', { riderId: rider.id, minutes });
    return rider;
  }

  async resumeRider(user: JwtPayload): Promise<Rider> {
    const rider = await this.riderForUser(user);
    if (!rider.verified || !rider.riderIdentifier) throw new ForbiddenException('Rider not approved yet — Rider ID has not been assigned');
    if (rider.status !== RiderStatus.PAUSED) return rider;
    rider.status = RiderStatus.AVAILABLE;
    rider.pausedUntil = null;
    rider.idleSince = new Date();
    if (!rider.sessionEndsAt || rider.sessionEndsAt.getTime() <= Date.now()) {
      rider.sessionEndsAt = new Date(Date.now() + this.env.riderDefaultSessionMin * 60_000);
    }
    await this.riders.save(rider);
    await this.scheduler.schedule('rider-session-end', { riderId: rider.id }, Math.max(1, rider.sessionEndsAt.getTime() - Date.now()), JOB_SESSION_END(rider.id));
    await this.auditLog(null, 'rider_resumed', { riderId: rider.id });
    return rider;
  }

  async extendSession(user: JwtPayload, minutes: number): Promise<Rider> {
    const rider = await this.riderForUser(user);
    if (![RiderStatus.AVAILABLE, RiderStatus.PAUSED].includes(rider.status)) {
      throw new ConflictException('An online Rider session is required to extend availability');
    }
    const base = rider.sessionEndsAt && rider.sessionEndsAt.getTime() > Date.now() ? rider.sessionEndsAt.getTime() : Date.now();
    rider.sessionEndsAt = new Date(base + minutes * 60_000);
    await this.riders.save(rider);
    await this.scheduler.schedule('rider-session-end', { riderId: rider.id }, Math.max(1, rider.sessionEndsAt.getTime() - Date.now()), JOB_SESSION_END(rider.id));
    await this.auditLog(null, 'rider_session_extended', { riderId: rider.id, minutes, sessionEndsAt: rider.sessionEndsAt.toISOString() });
    return rider;
  }

  async createIncident(user: JwtPayload, dto: { type: string; orderId?: string; note?: string; lat?: number; lng?: number; severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' }): Promise<RiderIncident> {
    const rider = await this.riderForUser(user);
    const incident = this.incidents.create({
      riderId: rider.id,
      orderId: dto.orderId ?? null,
      type: dto.type.trim().toUpperCase(),
      note: dto.note?.trim() || null,
      lat: dto.lat ?? rider.lat ?? null,
      lng: dto.lng ?? rider.lng ?? null,
      status: 'OPEN',
      severity: dto.severity ?? 'LOW',
      attribution: 'UNKNOWN',
      excludedFromPerformance: false,
      exclusionReason: null,
      performanceImpact: true,
      reviewerId: null,
      reviewedAt: null,
      outcome: null,
    });
    const saved = await this.incidents.save(incident);
    await this.auditLog(dto.orderId ?? null, 'rider_incident_created', { riderId: rider.id, incidentId: saved.id, type: saved.type });
    return saved;
  }

  async approveRider(
    admin: JwtPayload,
    riderId: string,
    verified = true,
    approvedOperatingLocationId?: string,
  ): Promise<Rider> {
    const rider = await this.riderById(riderId);
    if (!verified) {
      rider.verified = false;
      await this.riders.save(rider);
      await this.auditLog(null, 'rider_verified', {
        actor: admin.sub,
        riderId,
        verified,
        riderIdentifier: rider.riderIdentifier,
      });
      return rider;
    }

    if ((rider.vehicle === VehicleType.MOTORBIKE || rider.vehicle === VehicleType.CAR) && !rider.licensePlate?.trim()) {
      throw new BadRequestException('A license plate is required before Rider ID assignment for motorbike and car riders');
    }

    const approved = await this.ensureRiderIdentifier(rider, {
      actorId: admin.sub,
      actorRole: String(admin.adminRole ?? admin.role ?? 'admin'),
      locationId: approvedOperatingLocationId,
      reason: 'Operations/Admin approval completed after rider identity and vehicle verification.',
      approvalReference: 'dispatch-admin-approval',
    });
    approved.verified = true;
    await this.riders.save(approved);
    await this.auditLog(null, 'rider_verified', {
      actor: admin.sub,
      riderId,
      verified,
      riderIdentifier: approved.riderIdentifier,
      cityCode: approved.cityCode,
      approvalYear: approved.approvalYear,
      sequenceNumber: approved.sequenceNumber,
    });
    return approved;
  }

  async setRiderTaxProfile(admin: JwtPayload, riderId: string, dto: DeliveryPartnerTaxProfileUpsertDto): Promise<Rider> {
    if (admin.role !== Role.ADMIN) throw new ForbiddenException('Admin role required');
    const rider = await this.riderById(riderId);
    const deliveryPartnerType = dto.deliveryPartnerType ?? rider.deliveryPartnerType;
    const fleetPartnerId = dto.fleetPartnerId !== undefined ? dto.fleetPartnerId?.trim() || null : rider.fleetPartnerId;
    if (deliveryPartnerType === 'FLEET_DELIVERY_PARTNER' && !fleetPartnerId) {
      throw new BadRequestException('Fleet delivery partners require a fleetPartnerId');
    }
    rider.residentStatus = dto.residentStatus;
    rider.deliveryPartnerType = deliveryPartnerType;
    if (dto.deliveryPartnerId !== undefined) rider.deliveryPartnerId = dto.deliveryPartnerId?.trim() || null;
    if (dto.fleetPartnerId !== undefined) rider.fleetPartnerId = fleetPartnerId;
    if (dto.contractType !== undefined) rider.contractType = dto.contractType.trim();
    if (dto.settlementMethod !== undefined) rider.settlementMethod = dto.settlementMethod;
    const saved = await this.riders.save(rider);
    await this.auditLog(null, 'rider_tax_profile_updated', {
      actor: admin.sub,
      riderId: saved.id,
      deliveryPartnerId: saved.deliveryPartnerId ?? saved.id,
      deliveryPartnerType: saved.deliveryPartnerType,
      fleetPartnerId: saved.fleetPartnerId,
      residentStatus: saved.residentStatus,
      contractType: saved.contractType,
      settlementMethod: saved.settlementMethod,
    });
    return saved;
  }

  private async ensureRiderIdentifier(
    rider: Rider,
    opts: {
      actorId: string;
      actorRole?: string | null;
      locationId?: string;
      reason: string;
      approvalReference?: string | null;
      metadata?: Record<string, unknown> | null;
    },
  ): Promise<Rider> {
    if (rider.riderIdentifier) {
      return rider;
    }

    const location = this.approvedOperatingLocation(opts.locationId);
    const approvedAt = rider.approvedAt ?? new Date();
    const approvalYear = this.approvalYearFor(approvedAt);

    return this.riders.manager.transaction(async (manager) => {
      const riderRepo = manager.getRepository(Rider);
      const current = await riderRepo.findOne({
        where: { id: rider.id },
        ...(manager.connection.options.type === 'postgres' ? { lock: { mode: 'pessimistic_write' as const } } : {}),
      });
      if (!current) throw new NotFoundException('Rider not found');
      if (current.riderIdentifier) return current;

      const sequenceNumber = await this.nextRiderIdentifierSequence(manager, location.cityCode, approvalYear);
      const riderIdentifier = formatRiderIdentifier(location.cityCode, approvalYear, sequenceNumber);
      current.riderIdentifier = riderIdentifier;
      current.cityId = location.id;
      current.cityCode = location.cityCode;
      current.approvalYear = approvalYear;
      current.sequenceNumber = sequenceNumber;
      current.approvedAt = approvedAt;
      current.identifierStatus = RiderIdentifierStatus.ACTIVE;
      const saved = await riderRepo.save(current);

      await manager.getRepository(RiderIdentifierAudit).save(
        manager.getRepository(RiderIdentifierAudit).create({
          riderId: saved.id,
          eventType: 'CREATED',
          identifier: riderIdentifier,
          previousIdentifier: null,
          cityId: location.id,
          cityCode: location.cityCode,
          approvalYear,
          sequenceNumber,
          previousCityId: null,
          previousCityCode: null,
          previousApprovalYear: null,
          previousSequenceNumber: null,
          reason: opts.reason,
          actorId: opts.actorId,
          actorRole: opts.actorRole ?? null,
          approvalReference: opts.approvalReference ?? null,
          metadataJson: opts.metadata ?? null,
        }),
      );

      return saved;
    });
  }

  async correctRiderIdentifier(
    admin: JwtPayload,
    riderId: string,
    dto: RiderIdentifierCorrectionDto,
  ): Promise<Rider> {
    const rider = await this.riderById(riderId);
    if (!rider.riderIdentifier || !rider.approvedAt || !rider.approvalYear) {
      throw new BadRequestException('Rider does not have an assigned Rider ID to correct');
    }
    const previous = {
      identifier: rider.riderIdentifier,
      cityId: rider.cityId,
      cityCode: rider.cityCode,
      approvalYear: rider.approvalYear,
      sequenceNumber: rider.sequenceNumber,
    };
    const location = this.approvedOperatingLocation(dto.approvedOperatingLocationId ?? rider.cityId ?? undefined);
    const approvalYear = rider.approvalYear;

    const corrected = await this.riders.manager.transaction(async (manager) => {
      const riderRepo = manager.getRepository(Rider);
      const current = await riderRepo.findOne({
        where: { id: rider.id },
        ...(manager.connection.options.type === 'postgres' ? { lock: { mode: 'pessimistic_write' as const } } : {}),
      });
      if (!current?.riderIdentifier) throw new BadRequestException('Rider does not have an assigned Rider ID to correct');
      const sequenceNumber = await this.nextRiderIdentifierSequence(manager, location.cityCode, approvalYear);
      const identifier = formatRiderIdentifier(location.cityCode, approvalYear, sequenceNumber);
      current.riderIdentifier = identifier;
      current.cityId = location.id;
      current.cityCode = location.cityCode;
      current.sequenceNumber = sequenceNumber;
      current.identifierStatus = RiderIdentifierStatus.ACTIVE;
      const saved = await riderRepo.save(current);

      await manager.getRepository(RiderIdentifierAudit).save(
        manager.getRepository(RiderIdentifierAudit).create({
          riderId: saved.id,
          eventType: 'CORRECTED',
          identifier,
          previousIdentifier: previous.identifier,
          cityId: saved.cityId,
          cityCode: saved.cityCode,
          approvalYear: saved.approvalYear,
          sequenceNumber: saved.sequenceNumber,
          previousCityId: previous.cityId,
          previousCityCode: previous.cityCode,
          previousApprovalYear: previous.approvalYear,
          previousSequenceNumber: previous.sequenceNumber,
          reason: dto.reason.trim(),
          actorId: admin.sub,
          actorRole: String(admin.adminRole ?? admin.role ?? 'admin'),
          approvalReference: dto.approvalReference.trim(),
          metadataJson: { correctionRequestedLocationId: dto.approvedOperatingLocationId ?? null },
        }),
      );
      return saved;
    });

    await this.auditLog(null, 'rider_identifier_corrected', {
      actor: admin.sub,
      riderId: corrected.id,
      previousRiderIdentifier: previous.identifier,
      riderIdentifier: corrected.riderIdentifier,
      reason: dto.reason.trim(),
      approvalReference: dto.approvalReference.trim(),
    });
    return corrected;
  }

  async riderIdentifierAudit(riderId: string): Promise<RiderIdentifierAudit[]> {
    await this.riderById(riderId);
    return this.identifierAudits.find({ where: { riderId }, order: { createdAt: 'DESC' } });
  }

  async setCodBlock(admin: JwtPayload, riderId: string, blocked: boolean): Promise<Rider> {
    const rider = await this.riderById(riderId);
    rider.codBlocked = blocked;
    rider.codBlockReason = blocked ? 'admin' : null; // admin blocks never auto-clear (doc §5)
    await this.riders.save(rider);
    await this.auditLog(null, 'rider_cod_block', { actor: admin.sub, riderId, blocked });
    await this.publishCodStatus(rider);
    return rider;
  }

  /** Admin sets the COD exposure tier (NEW/EXPERIENCED/SENIOR) — doc §5. */
  async setCodTier(admin: JwtPayload, riderId: string, tier: RiderCodTier, reason?: string): Promise<Rider> {
    const rider = await this.riderById(riderId);
    rider.codTier = tier;
    await this.riders.save(rider);
    await this.auditLog(null, 'rider_cod_tier', { actor: admin.sub, riderId, tier, reason });
    await this.publishCodStatus(rider);
    return rider;
  }

  /** Admin override of the escalation-ladder status (e.g. clear INVESTIGATION after remit). */
  async setCodStatus(admin: JwtPayload, riderId: string, status: RiderCodStatus, reason?: string): Promise<Rider> {
    const rider = await this.riderById(riderId);
    rider.codStatus = status;
    await this.riders.save(rider);
    await this.auditLog(null, 'rider_cod_status', { actor: admin.sub, riderId, status, reason });
    await this.publishCodStatus(rider);
    return rider;
  }

  /** Doc §5: the wallet engine (ledger) drives COD control — apply its verdict idempotently. */
  async applyCodStatusEvent(payload: {
    riderId: string;
    codTier?: RiderCodTier;
    codStatus?: RiderCodStatus;
    codBlocked?: boolean;
    codBlockReason?: string | null;
  }): Promise<void> {
    const rider = await this.riders.findOne({ where: { id: payload.riderId } });
    if (!rider) return;
    if (payload.codTier && payload.codTier !== rider.codTier) rider.codTier = payload.codTier;
    if (payload.codStatus !== undefined && payload.codStatus !== rider.codStatus) rider.codStatus = payload.codStatus;
    if (payload.codBlocked !== undefined && payload.codBlocked !== rider.codBlocked) rider.codBlocked = payload.codBlocked;
    if (payload.codBlockReason !== undefined) rider.codBlockReason = payload.codBlockReason;
    await this.riders.save(rider);
  }

  private async publishCodStatus(rider: Rider): Promise<void> {
    await this.bus.publish(EVENTS.RIDER_COD_STATUS_CHANGED, {
      riderId: rider.id,
      userId: rider.userId,
      phone: rider.phone,
      codTier: rider.codTier,
      codStatus: rider.codStatus,
      codBlocked: rider.codBlocked,
      codBlockReason: rider.codBlockReason,
      source: 'dispatch',
    });
  }

  async riderForUser(user: JwtPayload): Promise<Rider> {
    const rider = await this.riders.findOne({ where: { userId: user.sub } });
    if (!rider) throw new NotFoundException('Rider profile not found — register first');
    if (rider.status === RiderStatus.PAUSED && rider.pausedUntil && rider.pausedUntil.getTime() <= Date.now()) {
      rider.status = RiderStatus.AVAILABLE;
      rider.pausedUntil = null;
      rider.idleSince = new Date();
      if (!rider.sessionEndsAt || rider.sessionEndsAt.getTime() <= Date.now()) {
        rider.sessionEndsAt = new Date(Date.now() + this.env.riderDefaultSessionMin * 60_000);
      }
      await this.riders.save(rider);
      await this.scheduler.schedule('rider-session-end', { riderId: rider.id }, Math.max(1, rider.sessionEndsAt!.getTime() - Date.now()), JOB_SESSION_END(rider.id));
    }
    return rider;
  }

  async riderById(id: string): Promise<Rider> {
    const rider = await this.riders.findOne({ where: { id } });
    if (!rider) throw new NotFoundException('Rider not found');
    return rider;
  }

  /** Ledger confirms this leg's earnings are booked. Idempotent: the first stamp wins. */
  async markEarningsPosted(assignmentId: string): Promise<{ ok: true }> {
    const assignment = await this.assignments.findOne({ where: { id: assignmentId } });
    if (!assignment) throw new NotFoundException('Assignment not found');
    if (!assignment.earningsPostedAt) {
      assignment.earningsPostedAt = new Date();
      await this.assignments.save(assignment);
    }
    return { ok: true };
  }

  async riderByUserId(userId: string): Promise<Rider> {
    const rider = await this.riders.findOne({ where: { userId } });
    if (!rider) throw new NotFoundException('Rider profile not found');
    return rider;
  }

  /**
   * The legs worked on an order, oldest first, with what each is owed.
   *
   * RELEASED assignments are excluded: a rider who was assigned and then released without
   * completing the leg did not do the work. COMPLETED and still-ACTIVE legs are both included —
   * at settlement time the final leg is typically still ACTIVE, having only just delivered.
   */
  async assignmentsForOrder(orderId: string): Promise<Array<{
    id: string;
    riderId: string;
    status: AssignmentStatus;
    riderFeePesewas: number;
    peakPayPesewas: number;
    earningsPostedAt: string | null;
    assignedAt: string;
    completedAt: string | null;
  }>> {
    const rows = await this.assignments.find({
      where: [
        { orderId, status: 'COMPLETED' },
        { orderId, status: 'ACTIVE' },
      ],
      order: { assignedAt: 'ASC' },
    });
    return rows.map((a) => ({
      id: a.id,
      riderId: a.riderId,
      status: a.status,
      riderFeePesewas: a.riderFeePesewas ?? 0,
      peakPayPesewas: a.peakPayPesewas ?? 0,
      earningsPostedAt: a.earningsPostedAt ? a.earningsPostedAt.toISOString() : null,
      assignedAt: a.assignedAt.toISOString(),
      completedAt: a.completedAt ? a.completedAt.toISOString() : null,
    }));
  }

  async riderList(query?: string): Promise<Rider[]> {
    const trimmed = query?.trim();
    if (!trimmed) return this.riders.find({ order: { createdAt: 'ASC' } });

    const q = `%${trimmed}%`;
    const assignmentMatches = await this.assignments.find({
      where: { orderId: Like(q) },
      take: 100,
    });
    const historicalMatches = await this.identifierAudits.createQueryBuilder('audit')
      .where('LOWER(audit.identifier) LIKE LOWER(:q)', { q })
      .orWhere('LOWER(audit.previousIdentifier) LIKE LOWER(:q)', { q })
      .take(100)
      .getMany();
    const riderIds = Array.from(new Set([
      ...assignmentMatches.map((assignment) => assignment.riderId),
      ...historicalMatches.map((audit) => audit.riderId),
    ].filter(Boolean)));

    const qb = this.riders.createQueryBuilder('rider')
      .where('LOWER(rider.name) LIKE LOWER(:q)', { q })
      .orWhere('LOWER(rider.phone) LIKE LOWER(:q)', { q })
      .orWhere('LOWER(rider.riderIdentifier) LIKE LOWER(:q)', { q })
      .orWhere('LOWER(rider.userId) LIKE LOWER(:q)', { q });
    if (riderIds.length > 0) qb.orWhere('rider.id IN (:...riderIds)', { riderIds });
    return qb.orderBy('rider.createdAt', 'ASC').getMany();
  }

  async listRiderBlocks(riderId: string): Promise<RiderBlockDto[]> {
    await this.sweepRiderBlocks(riderId);
    const since = new Date(Date.now() - 7 * 86_400_000);
    const rows = await this.blocks.find({
      where: { riderId },
      order: { startsAt: 'ASC' },
      take: 50,
    });
    return rows
      .filter((row) => row.status === 'SCHEDULED' || row.status === 'ACTIVE' || row.endsAt >= since)
      .map((row) => this.toBlockDto(row));
  }

  async createRiderBlock(user: JwtPayload, body: { startsAt: string; endsAt: string }): Promise<RiderBlockDto> {
    const rider = await this.riderForUser(user);
    const parsed = parseRiderBlockTimes(body.startsAt, body.endsAt);
    if (!parsed) throw new BadRequestException('Block start and end must be valid ISO dates, with end after start');
    const open = await this.blocks.find({ where: { riderId: rider.id, status: In(['SCHEDULED', 'ACTIVE']) } });
    const decision = evaluateRiderBlock({
      startsAt: parsed.startsAt,
      endsAt: parsed.endsAt,
      now: new Date(),
      existing: open,
      minMin: this.env.riderBlockMinMin,
      maxMin: this.env.riderBlockMaxMin,
      maxDaysAhead: this.env.riderBlockMaxDaysAhead,
      maxOpen: this.env.riderBlockMaxOpen,
    });
    if (!decision.ok) {
      const msg =
        decision.reason === 'too_short' ? `A scheduled dash must be at least ${this.env.riderBlockMinMin} minutes`
        : decision.reason === 'too_long' ? `A scheduled dash cannot exceed ${this.env.riderBlockMaxMin} minutes`
        : decision.reason === 'in_past' ? 'A scheduled dash cannot start in the past'
        : decision.reason === 'too_far' ? `A scheduled dash can be booked at most ${this.env.riderBlockMaxDaysAhead} days ahead`
        : decision.reason === 'overlap' ? 'That window overlaps another scheduled dash'
        : decision.reason === 'too_many' ? `You can hold at most ${this.env.riderBlockMaxOpen} upcoming dashes`
        : 'Invalid scheduled dash window';
      throw new BadRequestException(msg);
    }
    const now = new Date();
    const coveringNow = parsed.startsAt.getTime() <= now.getTime() && parsed.endsAt.getTime() > now.getTime();
    const status = coveringNow && rider.status === RiderStatus.AVAILABLE ? 'ACTIVE' : 'SCHEDULED';
    const saved = await this.blocks.save(this.blocks.create({
      riderId: rider.id,
      startsAt: parsed.startsAt,
      endsAt: parsed.endsAt,
      status,
    }));
    if (status === 'ACTIVE') {
      await this.applyCoveringBlock(rider);
      await this.riders.save(rider);
      if (rider.sessionEndsAt) {
        await this.scheduler.schedule('rider-session-end', { riderId: rider.id }, Math.max(1, rider.sessionEndsAt.getTime() - Date.now()), JOB_SESSION_END(rider.id));
      }
    }
    await this.auditLog(null, 'rider_block_created', { riderId: rider.id, blockId: saved.id, startsAt: saved.startsAt.toISOString(), endsAt: saved.endsAt.toISOString() });
    return this.toBlockDto(saved);
  }

  async cancelRiderBlock(user: JwtPayload, blockId: string): Promise<RiderBlockDto> {
    const rider = await this.riderForUser(user);
    const block = await this.blocks.findOne({ where: { id: blockId, riderId: rider.id } });
    if (!block) throw new NotFoundException('Scheduled dash not found');
    if (block.status !== 'SCHEDULED') {
      throw new ConflictException(`Only a dash that has not started can be cancelled (status: ${block.status})`);
    }
    block.status = 'CANCELLED';
    await this.blocks.save(block);
    await this.auditLog(null, 'rider_block_cancelled', { riderId: rider.id, blockId: block.id });
    return this.toBlockDto(block);
  }

  /** If the rider is inside a booked window, bind the session end to that window. */
  private async applyCoveringBlock(rider: Rider, opts?: { replaceSession?: boolean }): Promise<void> {
    const open = await this.blocks.find({ where: { riderId: rider.id, status: In(['SCHEDULED', 'ACTIVE']) } });
    const covering = coveringRiderBlock(open, new Date());
    if (!covering) return;
    if (covering.status !== 'ACTIVE') {
      covering.status = 'ACTIVE';
      await this.blocks.save(covering);
    }
    if (opts?.replaceSession !== false) {
      rider.sessionEndsAt = covering.endsAt;
      return;
    }
    if (!rider.sessionEndsAt || rider.sessionEndsAt.getTime() < covering.endsAt.getTime()) {
      rider.sessionEndsAt = covering.endsAt;
    }
  }

  private async completeActiveBlocks(riderId: string): Promise<void> {
    const active = await this.blocks.find({ where: { riderId, status: 'ACTIVE' } });
    for (const block of active) {
      block.status = 'COMPLETED';
      await this.blocks.save(block);
    }
  }

  async sweepRiderBlocks(riderId?: string): Promise<void> {
    const now = new Date();
    const graceMin = this.env.riderBlockGraceMin;
    const open = await this.blocks.find({
      where: riderId
        ? { riderId, status: In(['SCHEDULED', 'ACTIVE']) }
        : { status: In(['SCHEDULED', 'ACTIVE']) },
    });
    for (const block of open) {
      if (block.endsAt.getTime() <= now.getTime()) {
        block.status = 'COMPLETED';
        await this.blocks.save(block);
        continue;
      }
      if (shouldDropUnstartedBlock(block, now, graceMin)) {
        block.status = 'COMPLETED';
        await this.blocks.save(block);
        continue;
      }
      if (block.status === 'SCHEDULED' && block.startsAt.getTime() <= now.getTime()) {
        const rider = await this.riders.findOne({ where: { id: block.riderId } });
        if (rider && rider.status === RiderStatus.AVAILABLE) {
          await this.applyCoveringBlock(rider);
          await this.riders.save(rider);
          if (rider.sessionEndsAt) {
            await this.scheduler.schedule('rider-session-end', { riderId: rider.id }, Math.max(1, rider.sessionEndsAt.getTime() - Date.now()), JOB_SESSION_END(rider.id));
          }
        }
      }
    }
  }

  private toBlockDto(block: RiderBlock): RiderBlockDto {
    return {
      id: block.id,
      startsAt: block.startsAt.toISOString(),
      endsAt: block.endsAt.toISOString(),
      status: block.status,
    };
  }

  /** Active funded peak for this rider's current location. 0 when no window matches. */
  async riderPeakPay(riderId: string): Promise<PeakPayDecision> {
    const rider = await this.riderById(riderId);
    return evaluatePeakPay({
      now: new Date(),
      lat: rider.lat,
      lng: rider.lng,
      windows: parsePeakPayWindows(this.env.peakPayWindowsJson || undefined),
    });
  }

  /**
   * Returns explainable nearby positioning areas for an online Rider. The
   * calculation uses fresh operational order activity and nearby supply; it
   * never returns customer data or a promise of an order.
   */
  async demandZones(riderId: string): Promise<RiderDemandZonesDto> {
    const rider = await this.riderById(riderId);
    const freshAt = new Date();
    const expiresAt = new Date(freshAt.getTime() + 10 * 60_000);
    if (rider.lat === null || rider.lng === null || rider.status !== RiderStatus.AVAILABLE) {
      return { freshAt: freshAt.toISOString(), expiresAt: expiresAt.toISOString(), zones: [] };
    }

    // Keep seven days so the scorer can compare the current slot with the
    // same weekday/time history while still emphasizing the last hour.
    const from = new Date(freshAt.getTime() - 7 * 24 * 60 * 60_000);
    const [orders, riders] = await Promise.all([
      this.fetchDemandOrders(from, freshAt),
      this.riders.find({ where: [{ status: RiderStatus.AVAILABLE }, { status: RiderStatus.OFFERED }] }),
    ]);
    const scores = scoreDemandZones({
      zones: this.configuredDemandZones(),
      orders,
      riders: riders
        .filter((row) => row.lat !== null && row.lng !== null)
        .map((row): DemandRiderSignal => ({ lat: row.lat!, lng: row.lng!, status: row.status })),
      riderLat: rider.lat,
      riderLng: rider.lng,
      now: freshAt,
    });
    const maxDistanceKm = this.env.riderDemandMaxDistanceKm;
    // Map needs more than a 3-row list; still scored + distance-capped, never invented.
    const maxZones = Math.min(24, Math.max(1, this.env.riderDemandMaxZones));
    const nearby = scores.filter((zone) => zone.distanceFromRiderKm <= maxDistanceKm).slice(0, maxZones);
    return {
      freshAt: freshAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
      zones: nearby.map(({ score: _score, ...zone }) => ({
        ...zone,
        freshAt: freshAt.toISOString(),
        expiresAt: expiresAt.toISOString(),
      })),
    };
  }

  async performance(riderId: string, periodDays = 30): Promise<RiderPerformanceDto> {
    const rider = await this.riderById(riderId);
    const days = Math.min(90, Math.max(1, Math.trunc(periodDays)));
    const since = new Date(Date.now() - days * 24 * 60 * 60_000);
    const [offers, assignments] = await Promise.all([
      this.offers.find({ where: { riderId, createdAt: MoreThanOrEqual(since) } }),
      this.assignments.find({ where: { riderId, assignedAt: MoreThanOrEqual(since) } }),
    ]);
    const answered = offers.filter((offer) => [OfferStatus.ACCEPTED, OfferStatus.DECLINED, OfferStatus.EXPIRED].includes(offer.status));
    const accepted = offers.filter((offer) => offer.status === OfferStatus.ACCEPTED).length;
    const completed = assignments.filter((assignment) => assignment.status === 'COMPLETED').length;
    const released = assignments.filter((assignment) => assignment.status === 'RELEASED').length;
    const performanceResult = await this.calculateRiderPerformance(riderId, since, new Date());
    return {
      periodDays: days,
      generatedAt: new Date().toISOString(),
      rating: rider.rating,
      reliabilityScore: rider.reliabilityScore,
      completedDeliveries: rider.completedDeliveries,
      declineCount: rider.declineCount,
      totalAnsweredOffers: answered.length,
      acceptedOffers: accepted,
      acceptanceRate: answered.length === 0 ? null : round2(accepted / answered.length),
      completedAssignments: completed,
      releasedAssignments: released,
      completionRate: completed + released === 0 ? null : round2(completed / (completed + released)),
      performanceScore: {
        configVersion: performanceResult.configVersion,
        overallScore: performanceResult.overallScore,
        grade: performanceResult.grade,
        status: performanceResult.status,
        trend: performanceResult.trend,
        insufficientData: performanceResult.insufficientData,
        metrics: performanceResult.metricScores,
        categoryScores: performanceResult.categoryScores,
        triggeredActions: performanceResult.triggeredActions,
      },
    };
  }

  async listRiderPerformanceConfigs(): Promise<RiderPerformanceConfig[]> {
    return this.performanceConfigs.find({ order: { createdAt: 'DESC' }, take: 50 });
  }

  async upsertRiderPerformanceConfig(actor: JwtPayload, input: { name?: string; active: boolean; config: PerformanceEngineConfig; notes?: string }): Promise<RiderPerformanceConfig> {
    if (input.config.subject !== 'RIDER') throw new BadRequestException('Rider performance config must have subject=RIDER');
    const totalWeight = input.config.metrics.filter((metric) => metric.enabled !== false).reduce((sum, metric) => sum + metric.weight, 0);
    if (totalWeight <= 0) throw new BadRequestException('At least one enabled metric must have a positive weight');
    if (input.active) await this.performanceConfigs.update({ active: true }, { active: false });
    const row = await this.performanceConfigs.save(this.performanceConfigs.create({
      name: input.name ?? `Rider Performance v${input.config.version}`,
      version: input.config.version,
      reviewPeriod: input.config.reviewPeriod,
      active: input.active,
      configJson: input.config,
      createdBy: actor.sub,
      approvedBy: null,
      notes: input.notes?.trim() || null,
    }));
    await this.performanceAudit(null, 'CONFIG_CREATED', actor.sub, row.id, { version: row.version, active: row.active }, input.notes ?? null);
    return row;
  }

  async runRiderPerformanceReview(riderId: string, actor: JwtPayload, dto: PerformanceReviewRunDto): Promise<RiderPerformanceRecord> {
    await this.riderById(riderId);
    const period = this.parsePerformancePeriod(dto.periodStart, dto.periodEnd);
    const configRow = await this.performanceConfigs.findOne({ where: { active: true }, order: { createdAt: 'DESC' } });
    const config = configRow?.configJson ?? DEFAULT_RIDER_PERFORMANCE_CONFIG;
    const previous = await this.previousRiderScores(riderId, period.start);
    const metrics = dto.metrics ?? await this.riderPerformanceMetrics(riderId, period.start, period.end);
    const result = scorePerformance({ config, metrics, previousScores: previous });
    const actionCodes = unique([...(dto.actionOverrides ?? []), ...result.triggeredActions.map((action) => action.code)]);
    const record = await this.performanceRecords.save(this.performanceRecords.create({
      riderId,
      periodStart: period.start,
      periodEnd: period.end,
      configVersion: config.version,
      configId: configRow?.id ?? null,
      reviewerId: dto.reviewerId ?? actor.sub,
      overallScore: result.overallScore,
      grade: result.grade,
      status: result.status,
      trend: result.trend,
      insufficientData: result.insufficientData,
      resultJson: result,
      metricCategories: unique(result.metricScores.map((metric) => metric.category)),
      incidentTypes: unique([...(dto.incidents ?? []).map((incident) => incident.type), ...result.metricScores.map((metric) => metric.incidentType).filter((type): type is string => !!type)]),
      actionCodes,
      outcome: dto.outcome ?? null,
      recordType: 'REVIEW',
      linkedRecordId: null,
      notes: dto.notes?.trim() || null,
    }));
    await this.performanceAudit(riderId, 'REVIEW_RECORDED', actor.sub, record.id, { status: record.status, grade: record.grade, actions: actionCodes }, dto.notes ?? null);
    return record;
  }

  async recordRiderPerformanceCorrection(riderId: string, actor: JwtPayload, dto: PerformanceCorrectionDto): Promise<RiderPerformanceRecord> {
    await this.riderById(riderId);
    const linked = await this.performanceRecords.findOne({ where: { id: dto.linkedRecordId, riderId } });
    if (!linked) throw new NotFoundException('Linked performance record not found');
    const period = this.parsePerformancePeriod(dto.periodStart, dto.periodEnd);
    const config = await this.activeRiderPerformanceConfig();
    const previous = await this.previousRiderScores(riderId, period.start);
    const result = scorePerformance({ config, metrics: dto.metrics ?? linked.resultJson.metricScores.map((metric) => ({ code: metric.code, value: metric.actual ?? 0, sampleSize: metric.sampleSize })), previousScores: previous });
    const actionCodes = unique([...(dto.actionOverrides ?? []), ...result.triggeredActions.map((action) => action.code)]);
    const record = await this.performanceRecords.save(this.performanceRecords.create({
      riderId,
      periodStart: period.start,
      periodEnd: period.end,
      configVersion: config.version,
      configId: linked.configId,
      reviewerId: dto.reviewerId ?? actor.sub,
      overallScore: dto.correctionType === 'REVERSAL' ? null : result.overallScore,
      grade: dto.correctionType === 'REVERSAL' ? null : result.grade,
      status: dto.correctionType === 'REVERSAL' ? 'REVERSED' : result.status,
      trend: result.trend,
      insufficientData: dto.correctionType === 'REVERSAL' ? true : result.insufficientData,
      resultJson: result,
      metricCategories: unique(result.metricScores.map((metric) => metric.category)),
      incidentTypes: unique([...(dto.incidents ?? []).map((incident) => incident.type), ...result.metricScores.map((metric) => metric.incidentType).filter((type): type is string => !!type)]),
      actionCodes,
      outcome: dto.outcome ?? dto.correctionType,
      recordType: dto.correctionType,
      linkedRecordId: linked.id,
      notes: dto.reason,
    }));
    await this.performanceAudit(riderId, dto.correctionType, actor.sub, record.id, { linkedRecordId: linked.id, status: record.status }, dto.reason);
    return record;
  }

  async searchRiderPerformanceHistory(opts: PerformanceHistorySearchDto): Promise<RiderPerformanceRecord[]> {
    const qb = this.performanceRecords.createQueryBuilder('record').orderBy('record.createdAt', 'DESC').take(opts.limit ?? 100);
    if (opts.subjectId) qb.andWhere('record.riderId = :riderId', { riderId: opts.subjectId });
    if (opts.status) qb.andWhere('record.status = :status', { status: opts.status });
    if (opts.reviewer) qb.andWhere('record.reviewerId = :reviewer', { reviewer: opts.reviewer });
    if (opts.outcome) qb.andWhere('record.outcome = :outcome', { outcome: opts.outcome });
    if (opts.metricCategory) qb.andWhere('LOWER(record.metricCategories) LIKE LOWER(:metricCategory)', { metricCategory: `%${opts.metricCategory}%` });
    if (opts.incidentType) qb.andWhere('LOWER(record.incidentTypes) LIKE LOWER(:incidentType)', { incidentType: `%${opts.incidentType}%` });
    if (opts.action) qb.andWhere('LOWER(record.actionCodes) LIKE LOWER(:action)', { action: `%${opts.action}%` });
    if (opts.periodStart) qb.andWhere('record.periodEnd >= :periodStart', { periodStart: new Date(opts.periodStart) });
    if (opts.periodEnd) qb.andWhere('record.periodStart <= :periodEnd', { periodEnd: new Date(opts.periodEnd) });
    return qb.getMany();
  }

  async classifyRiderIncident(actor: JwtPayload, incidentId: string, dto: RiderIncidentAttributionDto): Promise<RiderIncident> {
    const incident = await this.incidents.findOne({ where: { id: incidentId } });
    if (!incident) throw new NotFoundException('Rider incident not found');
    incident.severity = dto.severity ?? incident.severity;
    incident.attribution = dto.attribution;
    incident.excludedFromPerformance = dto.excludedFromPerformance;
    incident.exclusionReason = dto.exclusionReason?.trim() || null;
    incident.performanceImpact = dto.performanceImpact;
    incident.outcome = dto.outcome ?? incident.outcome;
    incident.reviewerId = actor.sub;
    incident.reviewedAt = new Date();
    const saved = await this.incidents.save(incident);
    await this.performanceAudit(incident.riderId, 'INCIDENT_CLASSIFIED', actor.sub, incident.id, {
      severity: incident.severity,
      attribution: incident.attribution,
      excludedFromPerformance: incident.excludedFromPerformance,
      performanceImpact: incident.performanceImpact,
    }, incident.exclusionReason);
    return saved;
  }

  private async activeRiderPerformanceConfig(): Promise<PerformanceEngineConfig> {
    const row = await this.performanceConfigs.findOne({ where: { active: true }, order: { createdAt: 'DESC' } });
    return row?.configJson ?? DEFAULT_RIDER_PERFORMANCE_CONFIG;
  }

  private async calculateRiderPerformance(riderId: string, start: Date, end: Date) {
    const config = await this.activeRiderPerformanceConfig();
    const previous = await this.previousRiderScores(riderId, start);
    const metrics = await this.riderPerformanceMetrics(riderId, start, end);
    return scorePerformance({ config, metrics, previousScores: previous });
  }

  private async riderPerformanceMetrics(riderId: string, start: Date, end: Date): Promise<PerformanceMetricInput[]> {
    const [offers, assignments, incidents, rider] = await Promise.all([
      this.offers.find({ where: { riderId, createdAt: Between(start, end) } }),
      this.assignments.find({ where: { riderId, assignedAt: Between(start, end) } }),
      this.incidents.find({ where: { riderId, createdAt: Between(start, end) } }),
      this.riderById(riderId),
    ]);
    const answered = offers.filter((offer) => [OfferStatus.ACCEPTED, OfferStatus.DECLINED, OfferStatus.EXPIRED].includes(offer.status));
    const accepted = offers.filter((offer) => offer.status === OfferStatus.ACCEPTED).length;
    const completed = assignments.filter((assignment) => assignment.status === 'COMPLETED');
    const released = assignments.filter((assignment) => assignment.status === 'RELEASED');
    const onTimeLimitMin = Math.max(1, this.env.riderOnTimeTargetMin);
    const onTime = completed.filter((assignment) => assignment.completedAt && (assignment.completedAt.getTime() - assignment.assignedAt.getTime()) / 60_000 <= onTimeLimitMin).length;
    const impactIncidents = incidents.filter((incident) => incident.performanceImpact && !incident.excludedFromPerformance);
    const responsibleIncidents = impactIncidents.filter((incident) => ['RESPONSIBLE', 'RIDER', 'UNKNOWN'].includes(incident.attribution ?? 'UNKNOWN'));
    const serious = responsibleIncidents.filter((incident) => ['HIGH', 'CRITICAL'].includes(incident.severity) || /SERIOUS|SAFETY|ACCIDENT|FRAUD|CASH/i.test(incident.type)).length;
    return [
      { code: 'offer_acceptance_rate', numerator: accepted, denominator: answered.length, sampleSize: answered.length, attribution: 'RESPONSIBLE' },
      { code: 'assignment_completion_rate', numerator: completed.length, denominator: completed.length + released.length, sampleSize: completed.length + released.length, attribution: 'RESPONSIBLE' },
      { code: 'on_time_rate', numerator: onTime, denominator: completed.length, sampleSize: completed.length, attribution: 'RESPONSIBLE' },
      { code: 'customer_rating', value: rider.rating, sampleSize: completed.length, attribution: 'RESPONSIBLE' },
      { code: 'serious_incidents', value: serious, sampleSize: Math.max(incidents.length, 1), attribution: serious ? 'RESPONSIBLE' : 'UNKNOWN', incidentType: serious ? 'SERIOUS_RIDER_INCIDENT' : null },
    ];
  }

  private async previousRiderScores(riderId: string, before: Date): Promise<number[]> {
    const rows = await this.performanceRecords.find({ where: { riderId }, order: { periodEnd: 'DESC' }, take: 6 });
    return rows.filter((row) => row.periodEnd < before && row.overallScore !== null).map((row) => row.overallScore as number).reverse();
  }

  private parsePerformancePeriod(startRaw: string, endRaw: string): { start: Date; end: Date } {
    const start = new Date(startRaw);
    const end = new Date(endRaw);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) throw new BadRequestException('Performance review period is invalid');
    if (start >= end) throw new BadRequestException('Performance review period start must be before end');
    return { start, end };
  }

  private async performanceAudit(riderId: string | null, action: string, actorId: string, recordId: string | null, payloadJson: Record<string, unknown> | null, reason: string | null): Promise<void> {
    await this.performanceAudits.save(this.performanceAudits.create({ riderId, action, actorId, recordId, payloadJson, reason }));
  }

  private async fetchDemandOrders(from: Date, to: Date): Promise<DemandOrderSignal[]> {
    try {
      const query = new URLSearchParams({ from: from.toISOString(), to: to.toISOString() });
      const response = await internalFetch(`${serviceUrl('order')}/internal/demand/orders?${query.toString()}`);
      if (!response.ok) return [];
      const rows = (await response.json()) as Array<{
        vendorId: string;
        vendorType: string;
        serviceCode: string;
        status: string;
        createdAt: string;
        pickup: { lat: number; lng: number } | null;
      }>;
      const vendorIds = [...new Set(rows.filter((row) => !row.pickup).map((row) => row.vendorId))];
      const vendorEntries = await Promise.all(vendorIds.map(async (vendorId) => [vendorId, await this.fetchVendor(vendorId)] as const));
      const vendorMap = new Map(vendorEntries.filter((entry): entry is [string, VendorMeta] => entry[1] !== null));
      return rows.flatMap((row) => {
        const vendor = vendorMap.get(row.vendorId);
        const pickup = row.pickup ?? (vendor ? { lat: vendor.lat, lng: vendor.lng } : null);
        const createdAt = new Date(row.createdAt);
        if (!pickup || Number.isNaN(createdAt.getTime())) return [];
        return [{
          createdAt,
          pickupLat: pickup.lat,
          pickupLng: pickup.lng,
          serviceType: row.vendorType || row.serviceCode,
          status: row.status,
        }];
      });
    } catch {
      return [];
    }
  }

  private configuredDemandZones(): DemandZoneDefinition[] {
    const raw = this.env.riderDemandZonesJson || undefined;
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as Array<Partial<DemandZoneDefinition>>;
        const configured = parsed
          .filter((zone) => typeof zone.zoneId === 'string' && typeof zone.zoneName === 'string')
          .filter((zone) => Number.isFinite(zone.centerLat) && Number.isFinite(zone.centerLng))
          .map((zone) => ({
            zoneId: zone.zoneId!,
            zoneName: zone.zoneName!,
            centerLat: zone.centerLat!,
            centerLng: zone.centerLng!,
            radiusMeters: Number.isFinite(zone.radiusMeters) ? zone.radiusMeters! : 900,
          }));
        if (configured.length > 0) return configured;
      } catch {
        // Fall through to deterministic cells generated from the configured service polygon.
      }
    }

    const zone = loadZone();
    const minLat = Math.min(...zone.polygon.map((point) => point.lat));
    const maxLat = Math.max(...zone.polygon.map((point) => point.lat));
    const minLng = Math.min(...zone.polygon.map((point) => point.lng));
    const maxLng = Math.max(...zone.polygon.map((point) => point.lng));
    const cellKm = Math.max(0.5, this.env.riderDemandCellKm);
    const latStep = cellKm / 111;
    const lngStep = cellKm / Math.max(1, 111 * Math.cos((minLat * Math.PI) / 180));
    const cells: DemandZoneDefinition[] = [];
    let index = 0;
    for (let lat = minLat; lat <= maxLat; lat += latStep) {
      for (let lng = minLng; lng <= maxLng; lng += lngStep) {
        const center = { lat: lat + latStep / 2, lng: lng + lngStep / 2 };
        if (!isPointInZone(center, zone)) continue;
        cells.push({
          zoneId: `${zone.id}:cell:${index++}`,
          zoneName: `${zone.name} demand area ${index}`,
          centerLat: center.lat,
          centerLng: center.lng,
          radiusMeters: Math.round(cellKm * 700),
        });
      }
    }
    return cells;
  }

  /** Onboarding approval creates/verifies the rider and assigns YDR Rider ID server-side. */
  async onboardRider(body: OnboardRiderDto): Promise<Rider> {
    const vehicle = body.vehicle ?? VehicleType.MOTORBIKE;
    const licensePlate = body.licensePlate?.trim() || null;
    if ((vehicle === VehicleType.MOTORBIKE || vehicle === VehicleType.CAR) && !licensePlate) {
      throw new BadRequestException('A license plate is required before Rider ID assignment for motorbike and car riders');
    }

    let rider = await this.riders.findOne({ where: { userId: body.userId } });
    if (rider) {
      rider.name = body.name;
      rider.phone = body.phone;
      rider.vehicle = vehicle;
      rider.licensePlate = licensePlate || rider.licensePlate || null;
    } else {
      rider = this.riders.create({
        userId: body.userId,
        name: body.name,
        phone: body.phone,
        vehicle,
        licensePlate,
        status: RiderStatus.OFFLINE,
        verified: false,
        identifierStatus: RiderIdentifierStatus.UNASSIGNED,
        idleSince: new Date(),
      });
    }

    rider = await this.riders.save(rider);
    const identified = await this.ensureRiderIdentifier(rider, {
      actorId: body.approvalActorId ?? 'onboarding-service',
      actorRole: body.approvalActorId ? 'admin' : 'service',
      locationId: body.approvedOperatingLocationId,
      reason: 'Onboarding approval completed after identity and vehicle verification.',
      approvalReference: body.sourceApplicationId ? `application:${body.sourceApplicationId}` : 'onboarding-approval',
      metadata: { sourceApplicationId: body.sourceApplicationId ?? null },
    });
    identified.verified = true;
    await this.riders.save(identified);
    await this.auditLog(null, 'rider_onboarded', {
      riderId: identified.id,
      userId: identified.userId,
      riderIdentifier: identified.riderIdentifier,
      cityCode: identified.cityCode,
      approvalYear: identified.approvalYear,
      sequenceNumber: identified.sequenceNumber,
      sourceApplicationId: body.sourceApplicationId ?? null,
    });
    return identified;
  }

  // ── Dispatch trigger (doc §3) ─────────────────────────────────────
  async scheduleT5(orderId: string, prepTimeMin: number, extraMinutes = 0, vendorId?: string): Promise<void> {
    const zone = loadZone();
    const leadMs = zone.config.dispatchLeadMin * 60_000;

    // The order's `prepTimeMin` is a property of the menu, not of the kitchen: it does not know
    // that eleven orders are already on the pass, or that this vendor has missed its promise on
    // half of the last hour's orders. Dispatching against it sends the rider to stand at a
    // counter, unpaid, while their next job goes to someone else.
    const adjusted = await this.adjustedPrepTime(orderId, prepTimeMin, vendorId);

    // Re-read the order AFTER the prep-signal round trip, because the kitchen may have finished
    // while we were asking how busy it is.
    //
    // `order.accepted` and `order.ready_for_pickup` are delivered on two independent NATS
    // consumers, so there is no ordering between them — and this handler is the slow one, since
    // `adjustedPrepTime` makes an HTTP call to catalog. A vendor who accepts and immediately
    // marks ready (pre-made items, drinks, a vendor clearing several taps at once) therefore
    // lands the ready event first, and the accepted handler finishes last.
    //
    // The old code then cancelled JOB_READY unconditionally and replaced an imminent dispatch
    // with a prep-time timer: the order silently waited out the full prep window with no rider
    // assigned. Guarding on current status rather than on arrival order is what makes this
    // race-proof — a late event cannot undo a state the order has already left.
    const current = await this.fetchOrder(orderId).catch(() => null);
    const stillCooking = !current || current.status === OrderStatus.CONFIRMED || current.status === OrderStatus.ACCEPTED || current.status === OrderStatus.PREPARING;
    if (!stillCooking) {
      await this.auditLog(orderId, 'dispatch_trigger_skipped', {
        reason: 'order already past preparing',
        status: current.status,
        prepTimeMin,
      });
      return;
    }

    const delayMs = Math.max(0, (adjusted.estimatedPrepTimeMin + extraMinutes) * 60_000 - leadMs);
    await this.scheduler.cancel(JOB_T5(orderId));
    await this.scheduler.cancel(JOB_READY(orderId));
    await this.scheduler.schedule('dispatch-t5', { orderId }, delayMs, JOB_T5(orderId));
    await this.auditLog(orderId, 'dispatch_trigger_scheduled', {
      prepTimeMin,
      // Both numbers are recorded, so the effect of the adjustment can be measured against
      // actual rider wait time rather than assumed.
      estimatedPrepTimeMin: adjusted.estimatedPrepTimeMin,
      queueMinutes: adjusted.queueMinutes,
      stressMinutes: adjusted.stressMinutes,
      prepSignalReason: adjusted.reason,
      extraMinutes,
      dispatchLeadMin: zone.config.dispatchLeadMin,
      delayMs,
    });
  }

  /**
   * Widen the prep-time estimate using live signals from the vendor's kitchen.
   *
   * Falls back to the static estimate on any failure. A missing signal must never stop an order
   * being dispatched — an unscheduled order is a lost order, whereas a rider arriving on the old
   * timing is merely the behaviour that existed before.
   */
  private async adjustedPrepTime(
    orderId: string,
    prepTimeMin: number,
    vendorId?: string,
  ): Promise<PrepTimeAdjustment> {
    const id = vendorId ?? (await this.fetchOrder(orderId).catch(() => null))?.vendorId;
    if (!id || id === 'ERRAND' || !/^[0-9a-f-]{36}$/i.test(id)) {
      return estimatePrepTime(prepTimeMin, null);
    }
    try {
      const res = await internalFetch(`${serviceUrl('catalog')}/internal/vendors/${id}/prep-signals`);
      if (!res.ok) return estimatePrepTime(prepTimeMin, null);
      return estimatePrepTime(prepTimeMin, (await res.json()) as PrepTimeSignals);
    } catch {
      return estimatePrepTime(prepTimeMin, null);
    }
  }

  async dispatchNow(orderId: string): Promise<void> {
    await this.scheduler.cancel(JOB_T5(orderId));
    await this.scheduler.cancel(JOB_READY(orderId));
    await this.attemptDispatch(orderId, 0);
  }

  /** ORDER_READY_FOR_PICKUP → wait the grouping join window, then dispatch (doc §2). */
  async onReady(orderId: string): Promise<void> {
    await this.scheduler.cancel(JOB_T5(orderId));
    const order = await this.fetchOrder(orderId).catch(() => null);
    if (order?.scheduledFor) {
      const slot = new Date(order.scheduledFor);
      const delayMs = slot.getTime() - loadZone().config.dispatchLeadMin * 60_000 - Date.now();
      if (delayMs > 0) {
        await this.scheduler.schedule('dispatch-ready', { orderId }, delayMs, JOB_READY(orderId));
        return;
      }
    }
    if (this.groupingEnabled()) {
      await this.scheduler.schedule('dispatch-ready', { orderId }, this.groupJoinWindowMs(), JOB_READY(orderId));
    } else {
      await this.attemptDispatch(orderId, 0);
    }
  }

  async retryDispatch(orderId: string): Promise<void> {
    await this.attemptDispatch(orderId, 0);
  }

  // ── Offers (competitive acceptance — doc §6/§7) ───────────────────
  async pendingOffers(riderId: string): Promise<OfferDto[]> {
    const offers = await this.offers.find({ where: { riderId, status: OfferStatus.PENDING }, order: { createdAt: 'DESC' } });
    const out: OfferDto[] = [];
    for (const o of offers) {
      if (o.expiresAt < new Date()) continue;
      const order = await this.fetchOrder(o.orderId).catch(() => null);
      if (!order) continue;
      const vendor = await this.fetchVendor(o.vendorId);
      out.push(await this.toOfferDto(o, order, vendor));
    }
    return out;
  }

  private isParcel(order: OrderSnapshot): boolean {
    return order.orderType === OrderType.PARCEL || order.vendorType === VendorType.PARCEL || order.serviceCode.toUpperCase() === 'PR';
  }

  private vendorPickupContext(order: OrderSnapshot, vendor: VendorMeta | null): {
    locationId: string | null;
    name: string;
    address: string | null;
    lat: number;
    lng: number;
  } {
    if (order.parcelJson) {
      return {
        locationId: null,
        name: order.parcelJson.sender.name,
        address: order.parcelJson.sender.address.label,
        lat: order.parcelJson.sender.address.lat,
        lng: order.parcelJson.sender.address.lng,
      };
    }
    if (order.errandJson) {
      return {
        locationId: null,
        name: order.errandJson.shopName ?? 'Shop',
        address: null,
        lat: order.errandJson.shopLat,
        lng: order.errandJson.shopLng,
      };
    }
    if (order.pickupJson) return order.pickupJson;
    const onlyLocation = vendor?.locations?.length === 1 ? vendor.locations[0] : null;
    if (onlyLocation) {
      return {
        locationId: onlyLocation.id,
        name: onlyLocation.name,
        address: onlyLocation.address,
        lat: onlyLocation.lat,
        lng: onlyLocation.lng,
      };
    }
    return {
      locationId: null,
      name: vendor?.name ?? order.vendorName,
      address: null,
      lat: vendor?.lat ?? 0,
      lng: vendor?.lng ?? 0,
    };
  }

  private isLaundryCollection(order: OrderSnapshot): boolean {
    return (order.vendorType === VendorType.LAUNDRY || order.serviceCode.toUpperCase() === 'LD') &&
      (order.laundryStage ?? 'AWAITING_COLLECTION') === 'AWAITING_COLLECTION';
  }

  private pickupContext(order: OrderSnapshot, vendor: VendorMeta | null) {
    if (this.isParcel(order) && order.parcelJson) {
      return {
        locationId: null,
        name: order.parcelJson.sender.name,
        address: order.parcelJson.sender.address.label,
        lat: order.parcelJson.sender.address.lat,
        lng: order.parcelJson.sender.address.lng,
      };
    }
    if (this.isLaundryCollection(order)) {
      return {
        locationId: null,
        name: 'Customer collection',
        address: order.addressJson.label,
        lat: order.addressJson.lat,
        lng: order.addressJson.lng,
      };
    }
    return this.vendorPickupContext(order, vendor);
  }

  private dropContext(order: OrderSnapshot, vendor: VendorMeta | null) {
    if (this.isParcel(order) && order.parcelJson) {
      return {
        locationId: null,
        name: order.parcelJson.recipient.name,
        address: addressLabel(order.parcelJson.recipient.address),
        lat: order.parcelJson.recipient.address.lat,
        lng: order.parcelJson.recipient.address.lng,
      };
    }
    if (this.isLaundryCollection(order)) return this.vendorPickupContext(order, vendor);
    return {
      locationId: null,
      name: 'Customer drop-off',
      address: addressLabel(order.addressJson),
      lat: order.addressJson.lat,
      lng: order.addressJson.lng,
    };
  }

  private riderItems(order: OrderSnapshot): RiderOrderItemDto[] {
    return (order.items ?? []).map((item) => ({
      id: item.id,
      itemId: item.itemId,
      name: item.name,
      qty: item.qty,
      unit: item.unit ?? null,
      modifiers: item.modifiers ?? [],
      selectedOptions: (item.selectedOptions ?? []) as never,
      optionsTotalPesewas: item.optionsTotalPesewas ?? 0,
      prescriptionOnly: item.prescriptionOnly ?? false,
      handlingFlags: item.prescriptionOnly ? ['SEALED_PACKAGE'] : [],
    }));
  }

  private riderPharmacy(order: OrderSnapshot): RiderPharmacyContextDto | null {
    if (order.vendorType !== VendorType.PHARMACY && order.serviceCode.toUpperCase() !== 'PH') return null;
    return {
      operationalFlag: order.prescriptionStatus === 'APPROVED' ? 'SEALED_PACKAGE' : 'PICKUP_REVIEW_REQUIRED',
    };
  }

  private riderMarket(order: OrderSnapshot): RiderMarketContextDto | null {
    if (order.vendorType !== VendorType.MARKET && order.serviceCode.toUpperCase() !== 'MK') return null;
    return {
      fulfillmentRecorded: !!order.marketFulfillmentJson,
      lines: order.marketFulfillmentJson?.lines.map((line) => ({
        orderItemId: line.orderItemId,
        actualQuantity: line.actualQuantity,
        unit: line.unit,
        note: line.note,
      })),
    };
  }

  private riderLaundry(order: OrderSnapshot): RiderLaundryContextDto | null {
    if (order.vendorType !== VendorType.LAUNDRY && order.serviceCode.toUpperCase() !== 'LD') return null;
    const stage = order.laundryStage ?? 'AWAITING_COLLECTION';
    const leg = stage === 'AWAITING_COLLECTION'
      ? 'COLLECTION'
      : stage === 'READY_FOR_RETURN'
        ? 'RETURN'
        : 'VENDOR_HANDOFF';
    return {
      stage,
      leg,
      nextStopKind: leg === 'COLLECTION' ? 'LAUNDRY_COLLECTION' : leg === 'RETURN' ? 'LAUNDRY_RETURN' : 'PICKUP',
      packageSealed: stage === 'READY_FOR_RETURN',
    };
  }

  private riderErrand(order: OrderSnapshot): RiderErrandContextDto | null {
    const errand = order.errandJson;
    if (order.orderType !== OrderType.ERRAND || !errand) return null;
    return {
      task: errand.task,
      shopName: errand.shopName,
      shopLat: errand.shopLat,
      shopLng: errand.shopLng,
      budgetPesewas: errand.budgetPesewas,
      spentPesewas: errand.spentPesewas,
      remainingBudgetPesewas: Math.max(0, errand.budgetPesewas - errand.spentPesewas),
      errandStatus: errand.errandStatus,
      receiptCount: errand.receipts?.length ?? 0,
      substitution: errand.substitution ?? null,
      requiresReceipt: true,
    };
  }

  private riderParcel(order: OrderSnapshot): RiderParcelContextDto | null {
    const parcel = order.parcelJson;
    if (!this.isParcel(order) || !parcel) return null;
    return {
      senderName: parcel.sender.name,
      senderPhone: parcel.sender.phone,
      recipientName: parcel.recipient.name,
      recipientPhone: parcel.recipient.phone,
      category: parcel.category,
      weightKg: parcel.weightKg,
      dimensionsCm: parcel.dimensionsCm,
      declaredValuePesewas: parcel.declaredValuePesewas,
      description: parcel.description,
      fragile: parcel.fragile,
      sealed: parcel.sealed,
      pickupMode: parcel.pickupMode,
      proofMode: parcel.proofMode,
      parcelStatus: parcel.parcelStatus,
      returnReason: parcel.returnReason,
    };
  }

  private handlingNote(order: OrderSnapshot): string | null {
    const flags: string[] = [];
    if (order.parcelJson?.fragile) flags.push('Fragile parcel');
    if (order.parcelJson?.weightKg && order.parcelJson.weightKg > 10) flags.push(`${order.parcelJson.weightKg}kg parcel`);
    if (order.vendorType === VendorType.MARKET || order.serviceCode.toUpperCase() === 'MK') flags.push('Market/load handling');
    if (order.vendorType === VendorType.PHARMACY || order.serviceCode.toUpperCase() === 'PH') flags.push('Sealed pharmacy package');
    if (order.vendorType === VendorType.LAUNDRY || order.serviceCode.toUpperCase() === 'LD') flags.push('Laundry handoff');
    return flags.length > 0 ? flags.join('; ') : null;
  }

  private async riderBatchStops(batch: Batch): Promise<RiderRouteStopDto[]> {
    const pickupStops = await Promise.all(batch.pickupOrder.map(async (stop, index) => {
      const order = await this.fetchOrder(stop.orderId).catch(() => null);
      const vendor = order ? await this.fetchVendor(order.vendorId) : null;
      const pickup = order ? this.pickupContext(order, vendor) : null;
      return {
        stopId: `${batch.id}:pickup:${index}`,
        orderId: stop.orderId,
        sequence: index + 1,
        kind: (order && this.isLaundryCollection(order) ? 'LAUNDRY_COLLECTION' : 'PICKUP') as RiderRouteStopDto['kind'],
        label: pickup?.name ?? stop.name,
        address: pickup?.address ?? null,
        lat: pickup?.lat ?? stop.lat,
        lng: pickup?.lng ?? stop.lng,
        status: order?.status ?? null,
        serviceCode: order?.serviceCode ?? null,
      };
    }));
    const dropStops = await Promise.all(batch.dropOrder.map(async (stop, index) => {
      const order = await this.fetchOrder(stop.orderId).catch(() => null);
      const vendor = order ? await this.fetchVendor(order.vendorId) : null;
      const drop = order ? this.dropContext(order, vendor) : null;
      return {
        stopId: `${batch.id}:dropoff:${index}`,
        orderId: stop.orderId,
        sequence: batch.pickupOrder.length + index + 1,
        kind: (order && this.isLaundryCollection(order) ? 'LAUNDRY_RETURN' : 'DROPOFF') as RiderRouteStopDto['kind'],
        label: drop?.name ?? stop.name,
        address: drop?.address ?? null,
        lat: drop?.lat ?? stop.lat,
        lng: drop?.lng ?? stop.lng,
        status: order?.status ?? null,
        serviceCode: order?.serviceCode ?? null,
      };
    }));
    return [...pickupStops, ...dropStops];
  }

  private async toOfferDto(o: Offer, order: OrderSnapshot, vendor: VendorMeta | null): Promise<OfferDto> {
    let pickupCount = 1;
    let dropCount = 1;
    let codExposurePesewas = order.paymentMethod === PaymentMethod.COD ? order.totalPesewas : 0;
    let totalFee = o.riderFeePesewas ?? order.riderFeePesewas;
    let batch: Batch | null = null;
    if (o.batchId) {
      batch = await this.batches.findOne({ where: { id: o.batchId } });
      if (batch) {
        pickupCount = batch.pickupOrder.length;
        dropCount = batch.dropOrder.length;
        codExposurePesewas = batch.codExposurePesewas;
        totalFee = batch.totalRiderFeePesewas;
      }
    }
    const pickup = this.pickupContext(order, vendor);
    const drop = this.dropContext(order, vendor);
    const vendorReadiness = order.status === OrderStatus.READY_FOR_PICKUP
      ? 'ready'
      : [OrderStatus.PREPARING, OrderStatus.ACCEPTED].includes(order.status as OrderStatus)
        ? 'preparing'
        : 'delayed';
    const batchStops = batch ? await this.riderBatchStops(batch) : [];
    const pickupSequence = batchStops.filter((stop) => stop.kind === 'PICKUP' || stop.kind === 'LAUNDRY_COLLECTION');
    const dropoffSequence = batchStops.filter((stop) => stop.kind === 'DROPOFF' || stop.kind === 'LAUNDRY_RETURN');
    const assignmentType = batch
      ? batch.type === BatchType.GROUP_VENDORS && dropCount === 1
        ? 'MULTI_PICKUP_DELIVERY'
        : batch.type === BatchType.BATCH_CUSTOMERS && pickupCount > 1 && dropCount > 1
          ? 'MULTI_VENDOR_MULTI_CUSTOMER_BATCH'
          : 'MULTI_CUSTOMER_BATCH_DELIVERY'
      : 'SINGLE_DELIVERY';
    return {
      id: o.id,
      batchId: o.batchId ?? null,
      orderId: o.orderId,
      vendorId: o.vendorId,
      vendorLocationId: pickup.locationId,
      vendorName: pickup.name,
      vendorLocationName: order.pickupJson?.name ?? (pickup.locationId ? pickup.name : null),
      pickupAddress: pickup.address,
      vendorLat: pickup.lat,
      vendorLng: pickup.lng,
      dropLat: drop.lat,
      dropLng: drop.lng,
      dropAddress: drop.address ?? drop.name,
      customerPhone: order.parcelJson?.recipient.phone ?? order.recipientJson?.phone ?? order.customerPhone,
      customerNote: order.note ?? null,
      items: this.riderItems(order),
      pharmacy: this.riderPharmacy(order),
      market: this.riderMarket(order),
      laundry: this.riderLaundry(order),
      errand: this.riderErrand(order),
      parcel: this.riderParcel(order),
      batchStops,
      expiresAt: o.expiresAt.toISOString(),
      riderFeePesewas: totalFee,
      tipPesewas: order.tipPesewas ?? 0,
      peakPayPesewas: await this.peakPayForOffer(order, batch),
      leaveAtDoor: !!order.leaveAtDoor,
      dropNote: order.dropNote ?? order.addressJson.deliveryInstructions ?? order.parcelJson?.recipient.address.deliveryInstructions ?? null,
      scheduledFor: order.scheduledFor ?? null,
      pickupWindowMin: loadZone().config.dispatchLeadMin,
      pickupCount,
      dropCount,
      pickupDistanceKm: o.pickupDistanceKm ?? 0,
      deliveryDistanceKm: o.deliveryDistanceKm ?? 0,
      totalRouteKm: round1((o.pickupDistanceKm ?? 0) + (o.deliveryDistanceKm ?? 0)),
      codExposurePesewas,
      vendorReadiness,
      acceptanceWindowSec: this.offerWindowSec(),
      serviceCode: order.serviceCode,
      assignmentType,
      pickupSequence,
      dropoffSequence,
      handlingNote: this.handlingNote(order),
      routeMayResequence: !!batch,
      routeRule: batch ? 'Accept only if the grouped route remains efficient and customer delivery windows are protected.' : null,
    };
  }

  /** First eligible rider to accept wins — final eligibility is revalidated and assignment is locked (doc §7). */
  async acceptOffer(riderId: string, offerId: string): Promise<Offer> {
    const offer = await this.offers.findOne({ where: { id: offerId, riderId, status: OfferStatus.PENDING } });
    if (!offer) throw new NotFoundException('Offer not found or already answered');
    if (offer.expiresAt < new Date()) throw new ConflictException('Offer expired');

    const rider = await this.riders.findOneOrFail({ where: { id: riderId } });
    const order = await this.fetchOrder(offer.orderId);
    const vendor = await this.fetchVendor(order.vendorId).catch(() => null);
    const origin = this.dispatchOrigin(order, vendor);
    const excluded = new Set((await this.exclusions.find({ where: { orderId: order.id } })).map((e) => e.riderId));
    const validation = await this.validateCandidateEligibility(
      rider,
      order,
      origin,
      Math.max(this.maxRadiusKm(), (offer.pickupDistanceKm ?? 0) + 0.5),
      order.paymentMethod === PaymentMethod.COD,
      { excluded, allowOffered: true, attempt: offer.attempt },
    );

    const batch = offer.batchId ? await this.batches.findOne({ where: { id: offer.batchId } }) : null;
    if (batch && batch.codExposurePesewas > 0) {
      const codExposure = await this.activeCodExposurePesewas(rider.id);
      const limit = this.riderCodLimitPesewas(rider);
      if (limit > 0 && codExposure + batch.codExposurePesewas > limit) {
        validation.ok = false;
        validation.reasons.push('batch_cod_limit_exceeded');
        validation.codExposurePesewas = codExposure;
      }
    }

    if (!validation.ok) {
      offer.status = OfferStatus.EXPIRED;
      offer.validationJson = this.validationRecord(validation);
      await this.offers.save(offer);
      await this.scheduler.cancel(JOB_OFFER(offer.id));
      await this.releaseOfferedRiderIfIdle(riderId);
      await this.auditLog(order.id, 'final_eligibility_failed', { offerId: offer.id, riderId, validation, batchId: offer.batchId ?? null });
      if (offer.batchId) await this.cleanupPendingBatchIfClosed(offer.batchId, 'final_eligibility_failed');
      await this.maybeNextWave(order.id, offer.attempt);
      throw new ConflictException(`Rider no longer eligible: ${validation.reasons.join(', ')}`);
    }

    const existingAssignment = await this.assignments.findOne({ where: { orderId: offer.orderId, status: 'ACTIVE' } });
    if (existingAssignment && existingAssignment.riderId !== riderId) {
      throw new ConflictException('Order already assigned to another rider');
    }

    // one rider, one active task — batches count as one task with N orders
    const active = await this.assignments.findOne({ where: { riderId, status: 'ACTIVE' } });
    const inBatch = !!offer.batchId;
    if (active && active.orderId !== offer.orderId && !inBatch) {
      const orderStatus = await this.fetchOrder(active.orderId).then((o) => o.status).catch(() => null);
      if (orderStatus && ['DELIVERED', 'CANCELLED', 'REJECTED', 'FAILED_DELIVERY'].includes(orderStatus)) {
        active.status = 'RELEASED';
        active.completedAt = new Date();
        await this.assignments.save(active);
      } else {
        throw new ConflictException('You already have an active delivery');
      }
    }

    const claim = await this.offers.update(
      { id: offer.id, riderId, status: OfferStatus.PENDING },
      { status: OfferStatus.ACCEPTED },
    );
    if (!claim.affected) throw new ConflictException('Offer was already answered');
    offer.status = OfferStatus.ACCEPTED;
    offer.validationJson = this.validationRecord(validation);
    offer.score = offer.score || validation.score || 0;
    await this.offers.save(offer);

    rider.status = RiderStatus.ASSIGNED;
    rider.lastJobAt = new Date();
    rider.idleSince = null;
    await this.riders.save(rider);

    const assignedOrderIds: string[] = [];
    const assignmentMeta = {
      offerId: offer.id,
      pickupDistanceKm: offer.pickupDistanceKm ?? validation.distanceKm ?? 0,
      score: offer.score ?? validation.score ?? 0,
      source: offer.batchId ? 'grouped_route' : 'competitive_wave',
      validationJson: this.validationRecord(validation),
      // The fee is fixed here, at acceptance, and belongs to THIS leg. The order-level total
      // is a separate running sum — see computeAndPersistRiderFee.
      riderFeePesewas: offer.riderFeePesewas ?? 0,
      peakPayPesewas: offer.peakPayPesewas ?? 0,
    };

    try {
      if (offer.batchId) {
        if (!batch) throw new NotFoundException('Batch not found');
        batch.riderId = riderId;
        batch.status = BatchStatus.ACTIVE;
        await this.batches.save(batch);
        for (const oid of batch.orderIds) {
          const ex = await this.assignments.findOne({ where: { orderId: oid, status: 'ACTIVE' } });
          if (ex && ex.riderId !== riderId) throw new ConflictException('Order already assigned to another rider');
          // The offer's fee covers the whole batch; this assignment is worth only its own order.
          const legPay = batch.feeByOrderJson?.[oid] ?? { fee: 0, peak: 0 };
          if (!ex) {
            await this.assignments.save(this.assignments.create({
              orderId: oid,
              riderId,
              batchId: batch.id,
              ...assignmentMeta,
              riderFeePesewas: legPay.fee,
              peakPayPesewas: legPay.peak,
            }));
          } else {
            ex.offerId = offer.id;
            ex.batchId = batch.id;
            ex.pickupDistanceKm = assignmentMeta.pickupDistanceKm;
            ex.score = assignmentMeta.score;
            ex.source = assignmentMeta.source;
            ex.validationJson = assignmentMeta.validationJson;
            await this.assignments.save(ex);
          }
          assignedOrderIds.push(oid);
        }
        await this.auditLog(offer.orderId, 'batch_assigned', { batchId: batch.id, riderId, orderIds: batch.orderIds, validation });
      } else {
        await this.assignments.save(this.assignments.create({
          orderId: offer.orderId,
          riderId,
          ...assignmentMeta,
        }));
        assignedOrderIds.push(offer.orderId);
      }
    } catch (err) {
      await this.auditLog(offer.orderId, 'assignment_lock_failed', { offerId: offer.id, riderId, batchId: offer.batchId ?? null, error: err instanceof Error ? err.message : String(err) });
      throw new ConflictException('Order already assigned to another rider');
    }

    // supersede all other pending offers for every order in the task and every grouped sibling offer (doc §7).
    const toSupersede = new Map<string, Offer>();
    for (const oid of assignedOrderIds) {
      const others = await this.offers.find({ where: { orderId: oid, status: OfferStatus.PENDING } });
      for (const oth of others) if (oth.id !== offer.id) toSupersede.set(oth.id, oth);
    }
    if (offer.batchId) {
      const siblings = await this.offers.find({ where: { batchId: offer.batchId, status: OfferStatus.PENDING } });
      for (const oth of siblings) if (oth.id !== offer.id) toSupersede.set(oth.id, oth);
    }
    for (const oth of toSupersede.values()) {
      oth.status = OfferStatus.SUPERSEDED;
      await this.offers.save(oth);
      await this.scheduler.cancel(JOB_OFFER(oth.id));
      await this.releaseOfferedRiderIfIdle(oth.riderId);
      await this.auditLog(oth.orderId, 'superseded', { offerId: oth.id, riderId: oth.riderId, winner: riderId, batchId: oth.batchId ?? null });
    }

    await this.scheduler.cancel(JOB_OFFER(offer.id));
    await this.auditLog(offer.orderId, 'assigned', { offerId: offer.id, riderId, feePesewas: offer.riderFeePesewas, batchId: offer.batchId ?? null, acceptedAt: new Date().toISOString(), validation });
    await this.bus.publish(EVENTS.DISPATCH_OFFER_ACCEPTED, { riderId, orderId: offer.orderId, offerId: offer.id, batchId: offer.batchId ?? undefined });
    for (const oid of assignedOrderIds) {
      await this.bus.publish(EVENTS.DISPATCH_RIDER_ASSIGNED, { riderId, orderId: oid, offerId: offer.id, batchId: offer.batchId ?? undefined, score: offer.score, validation });
    }
    await this.notify.sendPush({ userId: rider.userId, title: inBatch ? 'Grouped delivery assigned' : 'Delivery assigned', body: inBatch ? `${assignedOrderIds.length} orders on one route — head to the first pickup.` : 'Head to the vendor to pick up the order.' });
    return offer;
  }

  /** Decline → excluded from the whole task (batch orders too) permanently (doc §7). */
  async declineOffer(riderId: string, offerId: string): Promise<Offer> {
    const offer = await this.offers.findOne({ where: { id: offerId, riderId, status: OfferStatus.PENDING } });
    if (!offer) throw new NotFoundException('Offer not found or already answered');
    offer.status = OfferStatus.DECLINED;
    await this.offers.save(offer);
    const rider = await this.riders.findOneOrFail({ where: { id: riderId } });
    rider.declineCount += 1;
    const hasOtherPending = await this.offers.findOne({ where: { riderId, status: OfferStatus.PENDING } });
    if (rider.status === RiderStatus.OFFERED && !hasOtherPending) {
      rider.status = RiderStatus.AVAILABLE;
      rider.idleSince = new Date();
    }
    if (rider.declineCount + rider.timeoutCount >= this.declineCooldownAfter()) {
      rider.cooldownUntil = new Date(Date.now() + this.cooldownMin() * 60_000);
    }
    await this.riders.save(rider);

    // exclude from every order in the batch, then wave onward for the primary
    const orderIds = offer.batchId
      ? ((await this.batches.findOne({ where: { id: offer.batchId } }))?.orderIds ?? [offer.orderId])
      : [offer.orderId];
    for (const oid of orderIds) {
      await this.exclude(oid, riderId, 'declined');
      await this.auditLog(oid, 'declined', { offerId: offer.id, riderId, declineCount: rider.declineCount, batchId: offer.batchId ?? null });
    }
    await this.bus.publish(EVENTS.DISPATCH_OFFER_DECLINED, { riderId, orderId: offer.orderId, offerId: offer.id });
    if (offer.batchId) await this.cleanupPendingBatchIfClosed(offer.batchId, 'declined');
    await this.maybeNextWave(offer.orderId, offer.attempt);
    return offer;
  }

  /** Admin override with mandatory justification (doc §13). */
  async adminAssign(admin: JwtPayload, orderId: string, riderId: string, reason: string): Promise<{ ok: true }> {
    if (!reason?.trim()) throw new BadRequestException('Admin override requires a justification reason');
    const rider = await this.riderById(riderId);
    const order = await this.fetchOrder(orderId);
    const active = await this.assignments.findOne({ where: { orderId, status: 'ACTIVE' } });
    if (active) throw new ConflictException('Order already assigned');

    // supersede pending offers — including any batch covering this order (doc §2 admin override)
    const batchOffers = await this.offers.find({ where: { orderId, status: OfferStatus.PENDING } });
    const coveringBatch = await this.batchCoveringOrder(orderId);
    const batchId = batchOffers.find((o) => o.batchId)?.batchId ?? coveringBatch?.id ?? null;
    if (batchId) {
      const b = await this.batches.findOne({ where: { id: batchId } });
      if (b) {
        b.status = BatchStatus.RELEASED;
        await this.batches.save(b);
        const bo = await this.offers.find({ where: { batchId, status: OfferStatus.PENDING } });
        for (const o of bo) {
          o.status = OfferStatus.SUPERSEDED;
          await this.offers.save(o);
          await this.scheduler.cancel(JOB_OFFER(o.id));
          await this.releaseOfferedRiderIfIdle(o.riderId);
        }
      }
    }
    const pending = await this.offers.find({ where: { orderId, status: OfferStatus.PENDING } });
    for (const o of pending) {
      o.status = OfferStatus.SUPERSEDED;
      await this.offers.save(o);
      await this.scheduler.cancel(JOB_OFFER(o.id));
      await this.releaseOfferedRiderIfIdle(o.riderId);
    }
    rider.status = RiderStatus.ASSIGNED;
    rider.lastJobAt = new Date();
    rider.idleSince = null;
    await this.riders.save(rider);
    await this.assignments.save(this.assignments.create({ orderId, riderId }));
    await this.auditLog(orderId, 'admin_override', { actor: admin.sub, riderId, reason });

    // the rider is still paid the distance-based fee (doc §2.4.2) even on an admin override
    const vendor = await this.fetchVendor(order.vendorId).catch(() => null);
    const pickupKm = rider.lat !== null && rider.lng !== null && vendor
      ? distanceKm({ lat: rider.lat, lng: rider.lng }, { lat: vendor.lat, lng: vendor.lng })
      : 0;
    const fee = await this.computeAndPersistRiderFee(order, vendor, { rider, distanceKm: pickupKm });
    await this.auditLog(orderId, 'rider_fee_persisted', { riderId, feePesewas: fee });

    await this.bus.publish(EVENTS.DISPATCH_RIDER_ASSIGNED, { riderId, orderId });
    return { ok: true };
  }

  // ── Rider task + pickup (doc §8) ──────────────────────────────────
  async task(riderId: string): Promise<RiderTaskDto & { batch?: BatchDto }> {
    const assignment = await this.assignments.findOne({ where: { riderId, status: 'ACTIVE' } });
    if (!assignment) return { offerId: null, currentOrder: null };
    const order = await this.fetchOrder(assignment.orderId);
    const vendor = await this.fetchVendor(order.vendorId);
    const pickup = this.pickupContext(order, vendor);
    const drop = this.dropContext(order, vendor);

    // batch-aware: the task carries the shared route (doc §2 transparency)
    const batch = await this.batches.findOne({ where: { riderId, status: BatchStatus.ACTIVE } });
    const dto: RiderTaskDto & { batch?: BatchDto } = {
      offerId: null,
      currentOrder: {
        orderId: order.id,
        status: order.status,
        vendorId: order.vendorId,
        vendorLocationId: pickup.locationId,
        vendorName: pickup.name,
        vendorLocationName: pickup.locationId ? pickup.name : null,
        pickupAddress: pickup.address,
        vendorLat: pickup.lat,
        vendorLng: pickup.lng,
        dropLat: drop.lat,
        dropLng: drop.lng,
        dropAddress: drop.address ?? drop.name,
        paymentMethod: order.paymentMethod as PaymentMethod,
        codAmountPesewas: order.paymentMethod === 'COD' ? order.totalPesewas : 0,
        customerPhone: order.parcelJson?.recipient.phone ?? order.recipientJson?.phone ?? order.customerPhone,
        customerNote: order.note ?? null,
        items: this.riderItems(order),
        pharmacy: this.riderPharmacy(order),
        market: this.riderMarket(order),
        laundry: this.riderLaundry(order),
        errand: this.riderErrand(order),
        parcel: this.riderParcel(order),
        riderFeePesewas: order.riderFeePesewas,
        tipPesewas: order.tipPesewas ?? 0,
        peakPayPesewas: order.peakPayPesewas ?? 0,
        leaveAtDoor: !!order.leaveAtDoor,
        dropNote: order.dropNote ?? order.addressJson.deliveryInstructions ?? order.parcelJson?.recipient.address.deliveryInstructions ?? null,
        scheduledFor: order.scheduledFor ?? null,
        serviceCode: order.serviceCode,
      },
      stops: batch ? await this.riderBatchStops(batch) : [],
    };
    if (batch) dto.batch = await this.batchDto(batch);
    return dto;
  }

  async confirmPickup(riderId: string, orderId: string, lat: number, lng: number): Promise<{ ok: true }> {
    const assignment = await this.assignments.findOne({ where: { orderId, riderId, status: 'ACTIVE' } });
    if (!assignment) throw new ForbiddenException('Not assigned to this order');
    const order = await this.fetchOrder(orderId);
    const zone = loadZone();
    const vendor = await this.fetchVendor(order.vendorId);
    const pickup = this.pickupContext(order, vendor);
    const pickupPoint = { lat: pickup.lat, lng: pickup.lng };
    if (!withinM({ lat, lng }, pickupPoint, zone.config.pickupGeofenceM)) {
      throw new BadRequestException(`You must be within ${zone.config.pickupGeofenceM}m of the pickup location`);
    }
    const rider = await this.riders.findOneOrFail({ where: { id: riderId } });
    rider.status = RiderStatus.PICKED_UP;
    rider.lat = lat;
    rider.lng = lng;
    await this.riders.save(rider);
    // Stamped here rather than inferred from the event log later: the geofence check above is
    // the only point in the system that proves the rider was physically at the vendor.
    assignment.pickedUpAt = new Date();
    await this.assignments.save(assignment);
    await this.bus.publish(EVENTS.DISPATCH_RIDER_PICKED_UP, { riderId, orderId });
    await this.bus.publish(EVENTS.DISPATCH_RIDER_EN_ROUTE, { riderId, orderId });
    return { ok: true };
  }

  async confirmErrandArrival(riderId: string, orderId: string, lat: number, lng: number): Promise<{ ok: true }> {
    const assignment = await this.assignments.findOne({ where: { orderId, riderId, status: 'ACTIVE' } });
    if (!assignment) throw new ForbiddenException('Not assigned to this Errand');
    const order = await this.fetchOrder(orderId);
    if (order.orderType !== OrderType.ERRAND || !order.errandJson) throw new BadRequestException('This is not an Errand order');
    const zone = loadZone();
    if (!withinM({ lat, lng }, { lat: order.errandJson.shopLat, lng: order.errandJson.shopLng }, zone.config.pickupGeofenceM)) {
      throw new BadRequestException(`You must be within ${zone.config.pickupGeofenceM}m of the Errand shop`);
    }
    const rider = await this.riders.findOneOrFail({ where: { id: riderId } });
    rider.lat = lat;
    rider.lng = lng;
    rider.status = RiderStatus.AT_VENDOR;
    await this.riders.save(rider);
    await this.bus.publish(EVENTS.DISPATCH_RIDER_AT_VENDOR, { riderId, orderId });
    return { ok: true };
  }

  async confirmLaundryHandoff(riderId: string, orderId: string, lat: number, lng: number): Promise<{ ok: true }> {
    const assignment = await this.assignments.findOne({ where: { orderId, riderId, status: 'ACTIVE' } });
    if (!assignment) throw new ForbiddenException('Not assigned to this laundry order');
    const order = await this.fetchOrder(orderId);
    if (!this.isLaundryCollection(order)) throw new BadRequestException('This order is not awaiting a Laundry handoff');
    const vendor = await this.fetchVendor(order.vendorId);
    const pickup = this.vendorPickupContext(order, vendor);
    const zone = loadZone();
    if (!withinM({ lat, lng }, { lat: pickup.lat, lng: pickup.lng }, zone.config.pickupGeofenceM)) {
      throw new BadRequestException(`You must be within ${zone.config.pickupGeofenceM}m of the Laundry Vendor`);
    }
    const rider = await this.riders.findOneOrFail({ where: { id: riderId } });
    rider.lat = lat;
    rider.lng = lng;
    assignment.status = 'COMPLETED';
    assignment.completedAt = new Date();
    await this.assignments.save(assignment);
    rider.status = RiderStatus.AVAILABLE;
    rider.idleSince = new Date();
    await this.riders.save(rider);
    await this.bus.publish(EVENTS.DISPATCH_RIDER_LAUNDRY_HANDOFF, { riderId, orderId });
    return { ok: true };
  }

  async onRiderLocation(riderId: string, lat: number, lng: number, orderId?: string): Promise<void> {
    const rider = await this.riders.findOne({ where: { id: riderId } });
    if (!rider) return;
    rider.lat = lat;
    rider.lng = lng;
    await this.riders.save(rider);

    const assignment = orderId
      ? await this.assignments.findOne({ where: { orderId, riderId, status: 'ACTIVE' } })
      : await this.assignments.findOne({ where: { riderId, status: 'ACTIVE' } });
    if (!assignment) return;
    const order = await this.fetchOrder(assignment.orderId).catch(() => null);
    if (!order) return;
    const zone = loadZone();
    const vendor = await this.fetchVendor(order.vendorId);
    const pickup = this.pickupContext(order, vendor);
    const pickupPoint = { lat: pickup.lat, lng: pickup.lng };
    const vendorPoint = this.vendorPickupContext(order, vendor);

    if (this.isLaundryCollection(order) && order.status === OrderStatus.OUT_FOR_DELIVERY &&
        withinM({ lat, lng }, { lat: vendorPoint.lat, lng: vendorPoint.lng }, zone.config.pickupGeofenceM)) {
      await this.bus.publish(EVENTS.DISPATCH_RIDER_AT_VENDOR, { riderId, orderId: order.id });
    } else if (withinM({ lat, lng }, pickupPoint, zone.config.pickupGeofenceM)) {
      await this.bus.publish(EVENTS.DISPATCH_RIDER_AT_VENDOR, { riderId, orderId: order.id });
    } else if (withinM({ lat, lng }, { lat: order.addressJson.lat, lng: order.addressJson.lng }, zone.config.dropGeofenceM)) {
      await this.bus.publish(EVENTS.DISPATCH_RIDER_AT_CUSTOMER, { riderId, orderId: order.id });
    }
  }

  /** Order delivered → complete its assignment; rider freed only when the whole batch is done. */
  async onDelivered(orderId: string): Promise<void> {
    const assignment = await this.assignments.findOne({ where: { orderId, status: 'ACTIVE' } });
    if (!assignment) return;
    assignment.status = 'COMPLETED';
    assignment.completedAt = new Date();
    await this.assignments.save(assignment);
    const rider = await this.riders.findOne({ where: { id: assignment.riderId } });

    // batch-aware: the rider stays on the task until every batch order is delivered
    const batch = await this.batches.findOne({ where: { riderId: assignment.riderId, status: BatchStatus.ACTIVE } });
    if (batch) {
      const remaining = await this.assignments.find({ where: { riderId: assignment.riderId, status: 'ACTIVE' } });
      if (remaining.length === 0) {
        batch.status = BatchStatus.COMPLETED;
        await this.batches.save(batch);
      } else {
        return; // still delivering other orders in the batch — rider stays ASSIGNED
      }
    }

    if (rider) {
      rider.status = RiderStatus.AVAILABLE;
      rider.idleSince = new Date();
      if (!rider.sessionEndsAt || rider.sessionEndsAt.getTime() <= Date.now()) {
        rider.sessionEndsAt = new Date(Date.now() + this.env.riderDefaultSessionMin * 60_000);
        await this.scheduler.schedule('rider-session-end', { riderId: rider.id }, rider.sessionEndsAt.getTime() - Date.now(), JOB_SESSION_END(rider.id));
      }
      // doc §5: completed deliveries drive auto tier promotion (NEW → EXPERIENCED → SENIOR)
      rider.completedDeliveries += 1;
      const promoted = nextCodTier(rider.codTier, rider.completedDeliveries, {
        newLimitPesewas: 0,
        experiencedLimitPesewas: 0,
        seniorLimitPesewas: 0,
        experiencedDeliveries: this.tierExperiencedDeliveries(),
        seniorDeliveries: this.tierSeniorDeliveries(),
      });
      if (promoted) {
        rider.codTier = promoted;
        await this.auditLog(null, 'rider_tier_promoted', { riderId: rider.id, tier: promoted, deliveries: rider.completedDeliveries });
      }
      // doc §8 rider milestones (GHS 100 @25, GHS 200 @50) — verified & good standing only
      await this.maybeMilestone(rider);

      // doc §Errands: completed errands promote the errand trust tier (NEW → VERIFIED → TRUSTED → CAP)
      const wasErrand = (await this.fetchOrder(orderId).catch(() => null))?.orderType === OrderType.ERRAND;
      if (wasErrand) {
        rider.completedErrands += 1;
        const nextTier = this.errandTierFor(rider.completedErrands);
        const rank: Record<ErrandTrustTier, number> = { NEW: 0, VERIFIED: 1, TRUSTED: 2, CAP: 3 };
        if (rank[nextTier] > rank[rider.errandTrustTier]) {
          rider.errandTrustTier = nextTier;
          await this.auditLog(null, 'errand_tier_promoted', { riderId: rider.id, tier: nextTier, errands: rider.completedErrands });
        }
      }
      await this.riders.save(rider);
      if (promoted) await this.publishCodStatus(rider);
    }
  }

  /** Assigned rider drops the task before pickup. Does not cancel the order. */
  async releaseByRider(user: JwtPayload, orderId: string): Promise<{ ok: true }> {
    const rider = await this.riderForUser(user);
    const assignment = await this.assignments.findOne({ where: { orderId, riderId: rider.id, status: 'ACTIVE' } });
    if (!assignment) throw new ForbiddenException('Not assigned to this order');
    const order = await this.fetchOrder(orderId).catch(() => null);
    if (order && ['PICKED_UP', 'OUT_FOR_DELIVERY', 'OTP_VERIFIED', 'DELIVERED'].includes(order.status)) {
      throw new ConflictException(`Cannot release after pickup (state: ${order.status})`);
    }
    await this.releaseForOrder(orderId);
    await this.auditLog(orderId, 'rider_released', { riderId: rider.id, reason: 'rider-release' });
    return { ok: true };
  }

  /**
   * Split/Skip a single order from a multi-vendor batch (doc §2.5).
   * If the batch only has one order remaining, it fully releases it.
   */
  async skipOrderFromBatch(user: JwtPayload, orderId: string, reason: string): Promise<{ ok: true }> {
    const rider = await this.riderForUser(user);
    const assignment = await this.assignments.findOne({ where: { orderId, riderId: rider.id, status: 'ACTIVE' } });
    if (!assignment) throw new ForbiddenException('Not assigned to this order');
    const order = await this.fetchOrder(orderId).catch(() => null);
    if (order && ['PICKED_UP', 'OUT_FOR_DELIVERY', 'OTP_VERIFIED', 'DELIVERED'].includes(order.status)) {
      throw new ConflictException(`Cannot skip after pickup (state: ${order.status})`);
    }

    const batch = assignment.batchId ? await this.batches.findOne({ where: { id: assignment.batchId } }) : null;
    if (!batch || batch.orderIds.length <= 1) {
      // Not a real batch, or only one left - just release everything
      await this.releaseForOrder(orderId);
      await this.auditLog(orderId, 'rider_skipped_leg', { riderId: rider.id, reason });
      return { ok: true };
    }

    // SPLIT LOGIC
    // Remove from batch orderIds
    batch.orderIds = batch.orderIds.filter(id => id !== orderId);
    
    // Remove from pickup/drop sequences
    batch.pickupOrder = batch.pickupOrder.filter(s => s.orderId !== orderId);
    batch.dropOrder = batch.dropOrder.filter(s => s.orderId !== orderId);

    // Recalculate Fees & COD exposure
    let removedFee = 0;
    if (batch.feeByOrderJson && batch.feeByOrderJson[orderId]) {
      removedFee = batch.feeByOrderJson[orderId].fee;
      delete batch.feeByOrderJson[orderId];
    }
    batch.totalRiderFeePesewas = Math.max(0, batch.totalRiderFeePesewas - removedFee);
    
    if (order && order.paymentMethod === 'COD') {
      batch.codExposurePesewas = Math.max(0, batch.codExposurePesewas - (order.totalPesewas || 0));
    }

    await this.batches.save(batch);

    // Cancel this specific assignment
    assignment.status = 'RELEASED';
    assignment.completedAt = new Date();
    await this.assignments.save(assignment);
    await this.bus.publish(EVENTS.DISPATCH_RIDER_UNASSIGNED, { riderId: assignment.riderId, orderId });

    // Cancel pending offers for this specific order just in case
    const pendingOffers = await this.offers.find({ where: { orderId, status: OfferStatus.PENDING } });
    for (const o of pendingOffers) {
      o.status = OfferStatus.SUPERSEDED;
      await this.offers.save(o);
      await this.scheduler.cancel(JOB_OFFER(o.id));
    }

    await this.auditLog(orderId, 'rider_skipped_leg', { riderId: rider.id, batchId: batch.id, reason });
    
    // Re-dispatch the skipped order so another rider can pick it up immediately
    this.attemptDispatch(orderId, 0).catch(err => console.error(`Re-dispatch failed for skipped order ${orderId}`, err));

    return { ok: true };
  }

  /** Background hook: automatically split an order from an active route if severely delayed. */
  async autoSplitIfBatched(orderId: string, reason: string): Promise<void> {
    const assignment = await this.assignments.findOne({ where: { orderId, status: 'ACTIVE' } });
    if (!assignment || !assignment.batchId) return; // not batched or not assigned
    const rider = await this.riders.findOne({ where: { id: assignment.riderId } });
    if (!rider) return;

    // Must have >1 order to split, otherwise it's just a regular release but we leave
    // solo orders with the waiting rider instead of penalizing them by ejecting.
    const batch = await this.batches.findOne({ where: { id: assignment.batchId } });
    if (!batch || batch.orderIds.length <= 1) return;

    console.log(`Auto-splitting order ${orderId} from batch ${batch.id} (rider: ${rider.id}): ${reason}`);
    
    // We can simulate a rider JWT payload to use the skipOrderFromBatch logic
    // OR we can safely duplicate the exact split lines to keep auth separation clean.
    // It's cleaner to execute the split logic directly here.

    // Remove from batch
    batch.orderIds = batch.orderIds.filter(id => id !== orderId);
    batch.pickupOrder = batch.pickupOrder.filter(s => s.orderId !== orderId);
    batch.dropOrder = batch.dropOrder.filter(s => s.orderId !== orderId);

    let removedFee = 0;
    if (batch.feeByOrderJson && batch.feeByOrderJson[orderId]) {
      removedFee = batch.feeByOrderJson[orderId].fee;
      delete batch.feeByOrderJson[orderId];
    }
    batch.totalRiderFeePesewas = Math.max(0, batch.totalRiderFeePesewas - removedFee);
    await this.batches.save(batch);

    // Release assignment
    assignment.status = 'RELEASED';
    assignment.completedAt = new Date();
    await this.assignments.save(assignment);
    await this.bus.publish(EVENTS.DISPATCH_RIDER_UNASSIGNED, { riderId: assignment.riderId, orderId });

    // Cancel pending offers
    const pendingOffers = await this.offers.find({ where: { orderId, status: OfferStatus.PENDING } });
    for (const o of pendingOffers) {
      o.status = OfferStatus.SUPERSEDED;
      await this.offers.save(o);
      await this.scheduler.cancel(JOB_OFFER(o.id));
    }

    await this.auditLog(orderId, 'system_auto_split', { riderId: rider.id, batchId: batch.id, reason });
    await this.notify.sendPush({ userId: rider.userId, title: 'Route adjusted', body: 'A severely delayed order was removed from your route so you can deliver the rest on time.' });

    // Enqueue for re-dispatch when ready
    this.attemptDispatch(orderId, 0).catch(err => console.error(`Re-dispatch failed for auto-split order ${orderId}`, err));
  }

  async releaseForOrder(orderId: string): Promise<void> {
    const assignment = await this.assignments.findOne({ where: { orderId, status: 'ACTIVE' } });
    const pending = await this.offers.find({ where: { orderId, status: OfferStatus.PENDING } });

    // batch-aware: releasing one order releases the whole batch (its offers + assignments)
    const batch = assignment?.riderId
      ? await this.batches.findOne({ where: { riderId: assignment.riderId, status: BatchStatus.ACTIVE } })
      : await this.batchCoveringOrder(orderId);
    const affectedOrderIds = batch?.orderIds ?? [orderId];
    for (const oid of affectedOrderIds) {
      const pendingOffers = await this.offers.find({ where: { orderId: oid, status: OfferStatus.PENDING } });
      for (const o of pendingOffers) {
        o.status = OfferStatus.SUPERSEDED;
        await this.offers.save(o);
        await this.scheduler.cancel(JOB_OFFER(o.id));
        await this.releaseOfferedRiderIfIdle(o.riderId);
      }
    }
    if (batch) {
      const batchPending = await this.offers.find({ where: { batchId: batch.id, status: OfferStatus.PENDING } });
      for (const o of batchPending) {
        o.status = OfferStatus.SUPERSEDED;
        await this.offers.save(o);
        await this.scheduler.cancel(JOB_OFFER(o.id));
        await this.releaseOfferedRiderIfIdle(o.riderId);
      }
    }
    for (const o of pending) {
      o.status = OfferStatus.SUPERSEDED;
      await this.offers.save(o);
      await this.scheduler.cancel(JOB_OFFER(o.id));
      await this.releaseOfferedRiderIfIdle(o.riderId);
    }
    if (batch) {
      batch.status = BatchStatus.RELEASED;
      await this.batches.save(batch);
      const memberAssignments = batch.riderId
        ? await this.assignments.find({ where: { riderId: batch.riderId, status: 'ACTIVE' } })
        : [];
      for (const a of memberAssignments) {
        a.status = 'RELEASED';
        a.completedAt = new Date();
        await this.assignments.save(a);
        await this.bus.publish(EVENTS.DISPATCH_RIDER_UNASSIGNED, { riderId: a.riderId, orderId: a.orderId });
      }
      const rider = await this.riders.findOne({ where: { id: batch.riderId! } });
      if (rider) { rider.status = RiderStatus.AVAILABLE; rider.idleSince = new Date(); await this.riders.save(rider); }
      return;
    }
    if (assignment) {
      assignment.status = 'RELEASED';
      assignment.completedAt = new Date();
      await this.assignments.save(assignment);
      const rider = await this.riders.findOne({ where: { id: assignment.riderId } });
      if (rider) { rider.status = RiderStatus.AVAILABLE; rider.idleSince = new Date(); await this.riders.save(rider); }
      await this.bus.publish(EVENTS.DISPATCH_RIDER_UNASSIGNED, { riderId: assignment.riderId, orderId });
    }
  }

  // ── The dispatch core (competitive — doc §4–§9) ───────────────────
  private async attemptDispatch(orderId: string, attempt: number): Promise<void> {
    const order = await this.fetchOrder(orderId).catch(() => null);
    if (!order) return;
    if (![OrderStatus.READY_FOR_PICKUP, OrderStatus.WAITING_FOR_RIDER, OrderStatus.CONFIRMED, OrderStatus.PREPARING].includes(order.status as OrderStatus)) return;
    if (await this.assignments.findOne({ where: { orderId, status: 'ACTIVE' } })) return; // already assigned
    if (await this.offers.findOne({ where: { orderId, status: OfferStatus.PENDING } })) return; // a wave is already out

    // doc §2: try to group/batch this order with compatible siblings before solo dispatch
    // (errands are solo — task-based with a shop origin, never grouped)
    const isErrand = order.orderType === OrderType.ERRAND;
    const isParcelOrder = this.isParcel(order);
    if (!isErrand && !isParcelOrder && this.groupingEnabled() && attempt === 0) {
      const group = await this.findGroupFor(order);
      if (group && group.orderIds.length > 1) {
        const dispatched = await this.dispatchGroup(order, group);
        if (dispatched) return;
      }
    }

    const zone = loadZone();
    const vendor = await this.fetchVendor(order.vendorId);
    const origin = this.dispatchOrigin(order, vendor);

    const radiusKm = Math.min(this.poolRadiusKm() + attempt * this.expandStepKm(), this.maxRadiusKm());
    const isCod = order.paymentMethod === PaymentMethod.COD;

    const pool = await this.buildPool(order, origin, radiusKm, isCod, attempt);
    if (pool.length === 0) {
      await this.auditLog(orderId, 'radius_expanded', { attempt, radiusKm, poolSize: 0 });
      await this.bus.publish(EVENTS.ORDER_WAITING_FOR_RIDER, { orderId, status: OrderStatus.WAITING_FOR_RIDER, vendorId: order.vendorId, customerId: order.customerId, paymentMethod: order.paymentMethod, amountPesewas: order.totalPesewas });
      const maxRetries = Math.max(1, Math.round((zone.config.riderRetryMaxMin * 60) / zone.config.riderRetryEverySec));
      if (attempt < maxRetries && radiusKm < this.maxRadiusKm()) {
        await this.scheduler.schedule('dispatch-retry', { orderId, attempt: attempt + 1 }, zone.config.riderRetryEverySec * 1000, JOB_RETRY(orderId));
      }
      return;
    }

    // distance-based rider payout (doc §2.4.2) — computed once per dispatch leg. A laundry
    // order dispatches twice (collection, then return), so this runs once per leg and the
    // order-level total accumulates across them.
    const riderPay = await this.computeAndPersistRiderFee(order, vendor, pool[0]);
    const riderFee = riderPay.fee;

    const wave = pool.slice(0, this.waveSize());
    await this.auditLog(orderId, 'pool_created', {
      attempt, radiusKm, poolSize: pool.length,
      wave: wave.map((r) => ({ riderId: r.rider.id, score: r.score, distanceKm: round1(r.distanceKm) })),
      feePesewas: riderFee,
    });

    for (const candidate of wave) {
      const rider = candidate.rider;
      rider.status = RiderStatus.OFFERED;
      // Counted here, at the offer, not at the response: an offer that times out never produces
      // a response, and a denominator that misses those would make an unresponsive rider look
      // like a selective one.
      rider.offerCount += 1;
      await this.riders.save(rider);
      const offer = await this.offers.save(
        this.offers.create({
          orderId,
          riderId: rider.id,
          vendorId: order.vendorId,
          status: OfferStatus.PENDING,
          expiresAt: new Date(Date.now() + this.offerWindowSec() * 1000),
          attempt,
          riderFeePesewas: riderFee,
          peakPayPesewas: riderPay.peak,
          pickupDistanceKm: candidate.distanceKm,
          deliveryDistanceKm: round1(this.deliveryDistanceKm(order, vendor)),
          score: candidate.score,
          validationJson: this.validationRecord(candidate.validationJson),
        }),
      );
      await this.auditLog(orderId, 'offer_created', { offerId: offer.id, riderId: rider.id, score: candidate.score });
      await this.bus.publish(EVENTS.DISPATCH_OFFER_CREATED, { riderId: rider.id, orderId, offerId: offer.id, riderFeePesewas: riderFee });
      await this.scheduler.schedule('offer-expiry', { offerId: offer.id }, this.offerWindowSec() * 1000, JOB_OFFER(offer.id));
      await this.notify.sendPush({ userId: rider.userId, title: 'New delivery offer', body: `Pick up from ${order.vendorName} — accept within ${this.offerWindowSec()}s.` });
    }
  }

  /** Eligible pool: online+available, verified, not blocked, route-feasible, in radius, not excluded.
   *  Ranking is configurable and audit-friendly (doc §5/§6): distance + pickup ETA, idle fairness,
   *  reliability/rating, decline/timeout/cancellation penalties, vehicle fit, and COD capacity. */
  /**
   * Rank every rider who could take this order, best first.
   *
   * Three things here exist to keep dispatch from degrading as the fleet grows:
   *
   * 1. **The candidate set is narrowed in SQL.** This used to load every AVAILABLE rider on the
   *    platform and reject them one by one in application code, so a dispatch in Accra paid for
   *    riders in Kumasi. A bounding box on the indexed lat/lng columns cuts that to riders
   *    plausibly in range; the exact haversine check still decides who actually is.
   *
   * 2. **Active assignments are fetched once for the whole pool.** Each rider used to trigger
   *    its own query, so a hundred candidates meant a hundred round trips before scoring even
   *    began.
   *
   * 3. **Rejections are written in one insert.** One audit row per rejected rider, written
   *    individually, meant the *unsuccessful* path was the most write-heavy one.
   */
  private async buildPool(
    order: OrderSnapshot,
    origin: { lat: number; lng: number },
    radiusKm: number,
    isCod: boolean,
    attempt: number,
  ): Promise<DispatchCandidate[]> {
    const riders = await this.availableRidersNear(origin, radiusKm);
    const excluded = new Set(
      (await this.exclusions.find({ where: { orderId: order.id } })).map((e) => e.riderId),
    );

    // One query for the whole pool instead of one per rider.
    const activeByRider = await this.activeAssignmentsByRider(riders.map((r) => r.id));

    const scored: DispatchCandidate[] = [];
    const rejections: Array<{ riderId: string; validation: EligibilityValidation }> = [];

    for (const rider of riders) {
      const validation = await this.validateCandidateEligibility(rider, order, origin, radiusKm, isCod, {
        excluded,
        attempt,
        allowOffered: false,
        activeAssignments: activeByRider.get(rider.id) ?? [],
      });
      if (!validation.ok) {
        rejections.push({ riderId: rider.id, validation });
        continue;
      }
      scored.push({
        rider,
        distanceKm: round1(validation.distanceKm ?? 0),
        score: round2(validation.score ?? 0),
        validationJson: validation,
      });
    }

    if (rejections.length > 0) {
      await this.auditLogBulk(
        order.id,
        'rider_filtered',
        rejections.map((r) => ({ riderId: r.riderId, attempt, radiusKm, validation: r.validation })),
      );
    }

    return scored.sort((a, b) => a.score - b.score);
  }

  /**
   * AVAILABLE riders whose last known position falls inside the search box.
   *
   * Riders with no recorded position are included deliberately — `validateCandidateEligibility`
   * rejects them with `missing_location`, and dropping them here instead would hide a fleet-wide
   * location-reporting outage behind an empty pool.
   */
  private async availableRidersNear(origin: { lat: number; lng: number }, radiusKm: number): Promise<Rider[]> {
    const box = boundingBox(origin, radiusKm);
    if (box.degenerate) return this.riders.find({ where: { status: RiderStatus.AVAILABLE } });

    return this.riders
      .createQueryBuilder('rider')
      .where('rider.status = :status', { status: RiderStatus.AVAILABLE })
      .andWhere(
        '(rider.lat IS NULL OR rider.lng IS NULL OR (rider.lat BETWEEN :minLat AND :maxLat AND rider.lng BETWEEN :minLng AND :maxLng))',
        { minLat: box.minLat, maxLat: box.maxLat, minLng: box.minLng, maxLng: box.maxLng },
      )
      .getMany();
  }

  /** Active assignments for a set of riders, in one query, grouped by rider. */
  private async activeAssignmentsByRider(riderIds: string[]): Promise<Map<string, Assignment[]>> {
    const grouped = new Map<string, Assignment[]>();
    if (riderIds.length === 0) return grouped;

    const rows = await this.assignments.find({ where: { riderId: In(riderIds), status: 'ACTIVE' } });
    for (const row of rows) {
      const list = grouped.get(row.riderId);
      if (list) list.push(row);
      else grouped.set(row.riderId, [row]);
    }
    return grouped;
  }


  private async validateCandidateEligibility(
    rider: Rider,
    order: OrderSnapshot,
    origin: { lat: number; lng: number },
    radiusKm: number,
    isCod: boolean,
    opts: { excluded?: Set<string>; attempt?: number; allowOffered?: boolean; activeAssignments?: Assignment[] } = {},
  ): Promise<EligibilityValidation> {
    const now = new Date();
    const reasons: string[] = [];
    const allowedStatuses = opts.allowOffered ? [RiderStatus.AVAILABLE, RiderStatus.OFFERED] : [RiderStatus.AVAILABLE];

    if (!allowedStatuses.includes(rider.status)) reasons.push('not_available');
    if (rider.lat === null || rider.lng === null) reasons.push('missing_location');
    if (!rider.verified) reasons.push('not_verified');
    if (!rider.riderIdentifier) reasons.push('missing_rider_identifier');
    if (rider.pausedUntil && rider.pausedUntil > now) reasons.push('paused');
    if (rider.cooldownUntil && rider.cooldownUntil > now) reasons.push('cooldown');
    if (rider.restrictedUntil && rider.restrictedUntil > now) reasons.push(rider.restrictionReason ?? 'restricted');
    if (opts.excluded?.has(rider.id)) reasons.push('excluded_for_order');

    if (rider.codStatus === RiderCodStatus.INVESTIGATION || rider.codStatus === RiderCodStatus.TERMINATED) {
      reasons.push(`cod_${rider.codStatus.toLowerCase()}`);
    }
    if (isCod) {
      if (rider.codBlocked) reasons.push('cod_blocked');
      if (rider.codStatus === RiderCodStatus.SUSPENDED) reasons.push('cod_suspended');
    }

    // `buildPool` fetches these once for the whole pool; a lone caller falls back to its own
    // query. Passing `[]` explicitly means "no active work", which is not the same as omitting it.
    const activeAssignments = opts.activeAssignments
      ?? await this.assignments.find({ where: { riderId: rider.id, status: 'ACTIVE' } });
    if (activeAssignments.length > 0) reasons.push('route_conflict_active_assignment');

    let distance = Number.POSITIVE_INFINITY;
    let etaMin = Number.POSITIVE_INFINITY;
    if (rider.lat !== null && rider.lng !== null) {
      distance = distanceKm(origin, { lat: rider.lat, lng: rider.lng });
      etaMin = this.pickupEtaMin(distance, rider.vehicle);
      if (distance > radiusKm) reasons.push('outside_radius');
    }

    const vehicleSuitability = this.vehicleSuitability(rider, order);
    if (vehicleSuitability <= 0) reasons.push('vehicle_unsuitable');

    let routeExtraKm = 0;
    if (activeAssignments.length > 0 && rider.lat !== null && rider.lng !== null) {
      routeExtraKm = await this.activeRouteExtraKm(rider, origin).catch(() => 0);
      if (routeExtraKm > this.routeMaxExtraKm()) reasons.push('route_extra_too_high');
    }

    let codExposurePesewas = 0;
    if (isCod) {
      codExposurePesewas = await this.activeCodExposurePesewas(rider.id);
      const tierLimit = this.riderCodLimitPesewas(rider);
      const orderExposure = order.paymentMethod === PaymentMethod.COD ? order.totalPesewas : 0;
      if (tierLimit > 0 && codExposurePesewas + orderExposure > tierLimit) reasons.push('cod_limit_exceeded');
    }

    if (order.orderType === OrderType.ERRAND) {
      const budget = order.errandJson?.budgetPesewas ?? 0;
      const carried = await this.activeErrandCarry(rider.id);
      if (carried + budget > this.errandTierLimit(rider.errandTrustTier)) reasons.push('errand_trust_limit_exceeded');
    }

    const score = this.scoreCandidate(rider, {
      distanceKm: Number.isFinite(distance) ? distance : radiusKm + 1,
      etaMin: Number.isFinite(etaMin) ? etaMin : 999,
      vehicleSuitability,
    });

    return {
      ok: reasons.length === 0,
      reasons,
      distanceKm: Number.isFinite(distance) ? round1(distance) : undefined,
      score: round2(score),
      vehicleSuitability,
      codExposurePesewas,
      etaMin: Number.isFinite(etaMin) ? round1(etaMin) : undefined,
      routeExtraKm: round1(routeExtraKm),
    };
  }

  private scoreCandidate(rider: Rider, facts: { distanceKm: number; etaMin: number; vehicleSuitability: number }): number {
    return scoreCandidate(rider, facts, this.scoringWeights());
  }

  private pickupEtaMin(distance: number, vehicle: VehicleType): number {
    return pickupEtaMin(distance, vehicle);
  }

  private vehicleSuitability(rider: Rider, order: OrderSnapshot): number {
    return vehicleSuitability({
      vehicle: rider.vehicle,
      weightKg: order.parcelJson?.weightKg ?? 0,
      isMarketLoad: isMarketLoad(order.vendorType, order.serviceCode),
    });
  }

  private riderCodLimitPesewas(rider: Rider): number {
    if (rider.maxCodLimitPesewas > 0) return rider.maxCodLimitPesewas;
    return codLimitPesewas(rider.codTier, {
      newLimitPesewas: this.env.codTierNewLimitPesewas,
      experiencedLimitPesewas: this.env.codTierExperiencedLimitPesewas,
      seniorLimitPesewas: this.env.codTierSeniorLimitPesewas,
      experiencedDeliveries: this.tierExperiencedDeliveries(),
      seniorDeliveries: this.tierSeniorDeliveries(),
    });
  }

  private async activeCodExposurePesewas(riderId: string): Promise<number> {
    const active = await this.assignments.find({ where: { riderId, status: 'ACTIVE' } });
    let total = 0;
    for (const a of active) {
      const o = await this.fetchOrder(a.orderId).catch(() => null);
      if (o?.paymentMethod === PaymentMethod.COD) total += o.totalPesewas;
    }
    return total;
  }

  private async activeRouteExtraKm(rider: Rider, nextPickup: { lat: number; lng: number }): Promise<number> {
    const active = await this.assignments.find({ where: { riderId: rider.id, status: 'ACTIVE' } });
    if (active.length === 0 || rider.lat === null || rider.lng === null) return 0;
    let existingKm = 0;
    let withInsertKm = distanceKm({ lat: rider.lat, lng: rider.lng }, nextPickup);
    const start = { lat: rider.lat, lng: rider.lng };
    for (const a of active) {
      const o = await this.fetchOrder(a.orderId).catch(() => null);
      if (!o) continue;
      const vendor = await this.fetchVendor(o.vendorId).catch(() => null);
      const pickup = this.pickupContext(o, vendor);
      const drop = this.dropContext(o, vendor);
      existingKm += distanceKm(start, { lat: pickup.lat, lng: pickup.lng }) + distanceKm({ lat: pickup.lat, lng: pickup.lng }, { lat: drop.lat, lng: drop.lng });
      withInsertKm += distanceKm(nextPickup, { lat: pickup.lat, lng: pickup.lng }) + distanceKm({ lat: pickup.lat, lng: pickup.lng }, { lat: drop.lat, lng: drop.lng });
    }
    return Math.max(0, withInsertKm - existingKm);
  }

  /** Sum of errand budgets on the rider's ACTIVE errand assignments (doc §Errands capacity). */
  private async activeErrandCarry(riderId: string): Promise<number> {
    const active = await this.assignments.find({ where: { riderId, status: 'ACTIVE' } });
    let total = 0;
    for (const a of active) {
      const o = await this.fetchOrder(a.orderId).catch(() => null);
      if (o?.orderType === OrderType.ERRAND) total += o.errandJson?.budgetPesewas ?? 0;
    }
    return total;
  }

  private dispatchOrigin(order: OrderSnapshot, vendor: VendorMeta | null): { lat: number; lng: number } {
    if (order.orderType === OrderType.ERRAND) {
      return { lat: order.errandJson?.shopLat ?? order.addressJson.lat, lng: order.errandJson?.shopLng ?? order.addressJson.lng };
    }
    if (this.isParcel(order) && order.parcelJson) {
      return { lat: order.parcelJson.sender.address.lat, lng: order.parcelJson.sender.address.lng };
    }
    const pickup = this.pickupContext(order, vendor);
    return { lat: pickup.lat, lng: pickup.lng };
  }

  private deliveryDistanceKm(order: OrderSnapshot, vendor: VendorMeta | null): number {
    if (order.errandJson) {
      return distanceKm(
        { lat: order.errandJson.shopLat, lng: order.errandJson.shopLng },
        { lat: order.addressJson.lat, lng: order.addressJson.lng },
      );
    }
    if (order.parcelJson) {
      return distanceKm(
        { lat: order.parcelJson.sender.address.lat, lng: order.parcelJson.sender.address.lng },
        { lat: order.parcelJson.recipient.address.lat, lng: order.parcelJson.recipient.address.lng },
      );
    }
    return vendor
      ? distanceKm({ lat: vendor.lat, lng: vendor.lng }, { lat: order.addressJson.lat, lng: order.addressJson.lng })
      : 0;
  }

  private peakForPickup(order: OrderSnapshot, vendor: VendorMeta | null): number {
    const pickup = this.pickupContext(order, vendor);
    return evaluatePeakPay({
      now: new Date(),
      lat: pickup.lat,
      lng: pickup.lng,
      windows: parsePeakPayWindows(this.env.peakPayWindowsJson || undefined),
    }).amountPesewas;
  }

  private async peakPayForOffer(order: OrderSnapshot, batch: Batch | null): Promise<number> {
    if (!batch) return order.peakPayPesewas ?? 0;
    let total = 0;
    for (const orderId of batch.orderIds) {
      const row = await this.fetchOrder(orderId).catch(() => null);
      total += row?.peakPayPesewas ?? 0;
    }
    return total;
  }

  private async computeAndPersistRiderFee(order: OrderSnapshot, vendor: VendorMeta | null, best: { rider: Rider; distanceKm: number }): Promise<{ fee: number; peak: number }> {
    const policy = feePolicyFromEnv(this.env.rawEnv);
    const pickupKm = best.distanceKm;
    const deliveryKm = this.deliveryDistanceKm(order, vendor);
    const fee = riderPayout(policy, pickupKm, deliveryKm, order.vendorType, { serviceLevel: order.serviceLevel ?? 'STANDARD' });
    const peak = this.peakForPickup(order, vendor);
    try {
      // `accumulate` matters for multi-leg orders. Laundry dispatches twice and each leg is a
      // real, separately-paid journey, so the order's delivery-partner cost is the SUM. The
      // tax engine withholds against that total, so it has to be the true figure — sending
      // only the latest leg understated the cost and left an earlier rider unpaid.
      const res = await internalFetch(`${serviceUrl('order')}/internal/orders/${order.id}/rider-fee`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ riderFeePesewas: fee, peakPayPesewas: peak, accumulate: true }),
      });
      void res;
    } catch {
      // non-fatal; offer still carries the computed fee
    }
    order.peakPayPesewas = peak;
    return { fee, peak };
  }

  private async maybeNextWave(orderId: string, attempt: number): Promise<void> {
    const remaining = await this.offers.find({ where: { orderId, status: OfferStatus.PENDING } });
    const assigned = await this.assignments.findOne({ where: { orderId, status: 'ACTIVE' } });
    if (assigned) return;
    if (remaining.length === 0) {
      await this.attemptDispatch(orderId, attempt + 1); // next radius wave
    }
  }

  private async exclude(orderId: string, riderId: string, reason: string): Promise<void> {
    const existing = await this.exclusions.findOne({ where: { orderId, riderId } });
    if (!existing) {
      await this.exclusions.save(this.exclusions.create({ orderId, riderId, reason }));
    }
  }

  private async releaseOfferedRiderIfIdle(riderId: string, opts: { incrementTimeout?: boolean; incrementDecline?: boolean } = {}): Promise<void> {
    const rider = await this.riders.findOne({ where: { id: riderId } });
    if (!rider || rider.status !== RiderStatus.OFFERED) return;
    const hasOtherPending = await this.offers.findOne({ where: { riderId, status: OfferStatus.PENDING } });
    if (hasOtherPending) return;
    rider.status = RiderStatus.AVAILABLE;
    rider.idleSince = new Date();
    if (opts.incrementTimeout) rider.timeoutCount += 1;
    if (opts.incrementDecline) rider.declineCount += 1;
    if (rider.declineCount + rider.timeoutCount >= this.declineCooldownAfter()) {
      rider.cooldownUntil = new Date(Date.now() + this.cooldownMin() * 60_000);
    }
    await this.riders.save(rider);
  }

  // ── doc §2: multi-vendor grouping + multi-customer batching ───────
  private async ordersReadyForDispatch(): Promise<OrderSnapshot[]> {
    const res = await internalFetch(`${serviceUrl('order')}/internal/orders/dispatch-candidates`);
    if (res.ok) return (await res.json()) as OrderSnapshot[];
    const fallback = await internalFetch(`${serviceUrl('order')}/internal/orders/ready`);
    if (!fallback.ok) return [];
    return (await fallback.json()) as OrderSnapshot[];
  }

  private inGroupingWindow(order: OrderSnapshot): boolean {
    if (order.status === OrderStatus.READY_FOR_PICKUP || order.status === OrderStatus.WAITING_FOR_RIDER) return true;
    if (![OrderStatus.ACCEPTED, OrderStatus.PREPARING].includes(order.status as OrderStatus)) return false;
    const readyAt = order.estimatedReadyAt ? new Date(order.estimatedReadyAt).getTime() : null;
    if (!readyAt || Number.isNaN(readyAt)) return false;
    return readyAt - Date.now() <= this.groupingThresholdMin() * 60_000;
  }

  /** Find a compatible set: (a) same-checkout vendor group, else (b) route-compatible customer batch. */
  private async findGroupFor(order: OrderSnapshot): Promise<{ type: BatchType; orderIds: string[] } | null> {
    const ready = await this.ordersReadyForDispatch();
    const candidates = ready.filter((o) => o.id !== order.id && this.inGroupingWindow(o));

    // (a) GROUP_VENDORS: same checkout, nearby vendors, ≤ GROUP_MAX_VENDORS total
    if (candidates.length > 0) {
      const vendor = await this.fetchVendor(order.vendorId);
      const siblings = [];
      for (const c of candidates) {
        if (c.checkoutId !== order.checkoutId) continue;
        const cv = await this.fetchVendor(c.vendorId).catch(() => null);
        if (!vendor || !cv) continue;
        if (distanceKm({ lat: vendor.lat, lng: vendor.lng }, { lat: cv.lat, lng: cv.lng }) > this.groupVendorDistanceKm()) continue;
        if (await this.assignments.findOne({ where: { orderId: c.id, status: 'ACTIVE' } })) continue;
        if (await this.offers.findOne({ where: { orderId: c.id, status: OfferStatus.PENDING } })) continue;
        if (!(await this.groupRouteCompatible([order, ...siblings, c]))) continue;
        siblings.push(c);
        if (siblings.length + 1 >= this.groupMaxVendors()) break;
      }
      if (siblings.length >= 1) {
        return { type: BatchType.GROUP_VENDORS, orderIds: [order.id, ...siblings.map((s) => s.id)] };
      }
    }

    // (b) BATCH_CUSTOMERS: different customers, vendor + drop route-compatible, ≤ BATCH_MAX_ORDERS total
    const vendorA = await this.fetchVendor(order.vendorId);
    const others = [];
    for (const c of candidates) {
      if (others.length + 1 >= this.batchMaxOrders()) break;
      const cv = await this.fetchVendor(c.vendorId).catch(() => null);
      if (!vendorA || !cv) continue;
      if (distanceKm({ lat: vendorA.lat, lng: vendorA.lng }, { lat: cv.lat, lng: cv.lng }) > this.batchVendorDistanceKm()) continue;
      if (distanceKm({ lat: order.addressJson.lat, lng: order.addressJson.lng }, { lat: c.addressJson.lat, lng: c.addressJson.lng }) > this.batchDropDistanceKm()) continue;
      if (await this.assignments.findOne({ where: { orderId: c.id, status: 'ACTIVE' } })) continue;
      if (await this.offers.findOne({ where: { orderId: c.id, status: OfferStatus.PENDING } })) continue;
      if (!(await this.groupRouteCompatible([order, ...others, c]))) continue;
      others.push(c);
    }
    if (others.length >= 1) {
      return { type: BatchType.BATCH_CUSTOMERS, orderIds: [order.id, ...others.map((o) => o.id)] };
    }
    return null;
  }

  private async groupRouteCompatible(orders: OrderSnapshot[]): Promise<boolean> {
    const vendors = (await Promise.all(orders.map((o) => this.fetchVendor(o.vendorId).catch(() => null)))).filter(Boolean) as VendorMeta[];
    if (vendors.length !== orders.length) return false;

    // Hard exception rule: do not group vendors located in opposite directions from the customer
    if (vendors.length > 1) {
      const customerLoc = { lat: orders[0].addressJson.lat, lng: orders[0].addressJson.lng };
      for (let i = 1; i < vendors.length; i++) {
        if (isOppositeDirection(customerLoc, { lat: vendors[0].lat, lng: vendors[0].lng }, { lat: vendors[i].lat, lng: vendors[i].lng })) {
          return false;
        }
      }
    }

    const start = { lat: vendors[0].lat, lng: vendors[0].lng };
    const plan = this.optimizedBatchRoute(orders, vendors, start);
    return plan.extraKm <= this.routeMaxExtraKm();
  }

  private optimizedBatchRoute(
    orders: OrderSnapshot[],
    vendors: VendorMeta[],
    start: { lat: number; lng: number },
  ): { pickupOrder: BatchRouteStop[]; dropOrder: BatchRouteStop[]; totalKm: number; soloKm: number; extraKm: number } {
    const pickups = orders.map((o, i) => {
      const pickup = this.pickupContext(o, vendors[i]);
      return { orderId: o.id, vendorId: o.vendorId, name: o.vendorName, lat: pickup.lat, lng: pickup.lng } as BatchRouteStop;
    });
    const drops = orders.map((o, i) => {
      const drop = this.dropContext(o, vendors[i]);
      return { orderId: o.id, name: drop.address ?? drop.name, lat: drop.lat, lng: drop.lng } as BatchRouteStop;
    });
    const soloKm = orders.reduce((sum, _order, i) => {
      const p = pickups[i];
      const d = drops[i];
      return sum + distanceKm(start, { lat: p.lat, lng: p.lng }) + distanceKm({ lat: p.lat, lng: p.lng }, { lat: d.lat, lng: d.lng });
    }, 0);

    let bestPickup = pickups;
    let bestDrop = drops;
    let bestKm = Number.POSITIVE_INFINITY;
    for (const pickupOrder of this.permutations(pickups).slice(0, 24)) {
      const lastPickup = pickupOrder[pickupOrder.length - 1] ?? start;
      for (const dropOrderRaw of this.permutations(drops).slice(0, 24)) {
        const dropOrder = this.dedupeSameStop(dropOrderRaw);
        let km = 0;
        let cursor = start;
        for (const stop of pickupOrder) {
          km += distanceKm(cursor, { lat: stop.lat, lng: stop.lng });
          cursor = { lat: stop.lat, lng: stop.lng };
        }
        cursor = { lat: lastPickup.lat, lng: lastPickup.lng };
        for (const stop of dropOrder) {
          km += distanceKm(cursor, { lat: stop.lat, lng: stop.lng });
          cursor = { lat: stop.lat, lng: stop.lng };
        }
        if (km < bestKm) {
          bestKm = km;
          bestPickup = pickupOrder;
          bestDrop = dropOrder;
        }
      }
    }
    return {
      pickupOrder: bestPickup,
      dropOrder: bestDrop,
      totalKm: round1(bestKm),
      soloKm: round1(soloKm),
      extraKm: round1(Math.max(0, bestKm - soloKm)),
    };
  }

  private permutations<T>(items: T[]): T[][] {
    if (items.length <= 1) return [items];
    const out: T[][] = [];
    items.forEach((item, idx) => {
      const rest = [...items.slice(0, idx), ...items.slice(idx + 1)];
      for (const tail of this.permutations(rest)) out.push([item, ...tail]);
    });
    return out;
  }

  private dedupeSameStop(stops: BatchRouteStop[]): BatchRouteStop[] {
    const seen = new Set<string>();
    const out: BatchRouteStop[] = [];
    for (const stop of stops) {
      const key = `${stop.orderId}:${stop.lat.toFixed(5)}:${stop.lng.toFixed(5)}`;
      const sameAddressKey = `${stop.lat.toFixed(5)}:${stop.lng.toFixed(5)}:${stop.name}`;
      if (seen.has(key) || seen.has(sameAddressKey)) continue;
      seen.add(key);
      seen.add(sameAddressKey);
      out.push(stop);
    }
    return out;
  }

  private async batchCoveringOrder(orderId: string, statuses: BatchStatus[] = [BatchStatus.PENDING, BatchStatus.ACTIVE]): Promise<Batch | null> {
    return this.batches
      .createQueryBuilder('b')
      .where('b.status IN (:...statuses)', { statuses })
      .andWhere('b.orderIds LIKE :id', { id: `%${orderId}%` })
      .getOne();
  }

  private async cleanupPendingBatchIfClosed(batchId: string, reason: string): Promise<void> {
    const batch = await this.batches.findOne({ where: { id: batchId } });
    if (!batch || batch.status !== BatchStatus.PENDING) return;
    const stillPending = await this.offers.findOne({ where: { batchId, status: OfferStatus.PENDING } });
    if (stillPending) return;
    const accepted = await this.offers.findOne({ where: { batchId, status: OfferStatus.ACCEPTED } });
    if (accepted) return;
    batch.status = BatchStatus.RELEASED;
    await this.batches.save(batch);
    for (const oid of batch.orderIds) {
      await this.auditLog(oid, 'batch_released', { batchId, reason });
    }
  }

  /** Dispatch one competitive wave for a whole group/batch: one offer per rider, N orders. */
  private async dispatchGroup(primary: OrderSnapshot, group: { type: BatchType; orderIds: string[] }): Promise<boolean> {
    const orders: OrderSnapshot[] = [];
    for (const id of group.orderIds) {
      const o = await this.fetchOrder(id).catch(() => null);
      if (!o) return false;
      // concurrency guard (doc §2): a sibling's dispatch may have already assigned/covered
      // a group member while our job was queued — skip those members instead of aborting
      // the whole group, otherwise the uncovered primary is silently orphaned.
      if (await this.assignments.findOne({ where: { orderId: id, status: 'ACTIVE' } })) {
        if (id === primary.id) return true; // primary already handled
        continue; // sibling already handled — keep dispatching the rest
      }
      if (await this.offers.findOne({ where: { orderId: id, status: OfferStatus.PENDING } })) {
        if (id === primary.id) return true; // primary already has a wave out
        continue; // sibling already covered by a solo or grouped offer
      }
      // already covered by a pending/active batch (e.g. a sibling's dispatch grouped it first) → no double batch
      const covered = await this.batchCoveringOrder(id);
      if (covered) {
        if (id === primary.id) return true; // primary already batched
        continue; // sibling already batched — keep dispatching the rest
      }
      orders.push(o);
    }
    if (orders.length === 0) return true; // every member already covered/assigned — handled
    if (orders.length === 1) return false; // only the primary remains → let attemptDispatch run the solo path
    const vendors = (await Promise.all(orders.map((o) => this.fetchVendor(o.vendorId).catch(() => null)))).filter(Boolean) as VendorMeta[];
    if (vendors.length !== orders.length) return false;

    // COD eligibility: the rider carries the summed COD exposure
    const codExposure = orders.reduce((s, o) => s + (o.paymentMethod === PaymentMethod.COD ? o.totalPesewas : 0), 0);
    const zone = loadZone();
    const radiusKm = this.poolRadiusKm();
    const pool = (await this.buildPool(primary, { lat: vendors[0].lat, lng: vendors[0].lng }, radiusKm, codExposure > 0, 0))
      .filter((candidate) => {
        if (codExposure <= 0) return true;
        const limit = this.riderCodLimitPesewas(candidate.rider);
        const carried = candidate.validationJson.codExposurePesewas ?? 0;
        const ok = limit <= 0 || carried + codExposure <= limit;
        if (!ok) candidate.validationJson.reasons.push('batch_cod_limit_exceeded');
        return ok;
      });
    if (pool.length === 0) return false;

    // per-order distance fees (doc §2: per-order fees unchanged) summed on the offer.
    // The per-order split is kept so each order's assignment records its own worth — the ledger
    // pays per leg per order, not per batch.
    const wave = pool.slice(0, this.waveSize());
    let totalFee = 0;
    const feeByOrder: Record<string, { fee: number; peak: number }> = {};
    for (const o of orders) {
      const v = vendors[orders.indexOf(o)];
      const best = { rider: wave[0].rider, distanceKm: wave[0].distanceKm };
      const pay = await this.computeAndPersistRiderFee(o, v, best);
      feeByOrder[o.id] = { fee: pay.fee, peak: pay.peak };
      totalFee += pay.fee;
    }

    // route optimisation-first: choose the shortest pickup/drop sequence for the offered rider.
    // Dedupe identical drops (same customer, same address → one stop) — doc §2 transparency.
    const from = { lat: wave[0].rider.lat ?? vendors[0].lat, lng: wave[0].rider.lng ?? vendors[0].lng };
    const route = this.optimizedBatchRoute(orders, vendors, from);
    const pickupOrder = route.pickupOrder;
    const dropOrder = route.dropOrder;

    const batch = await this.batches.save(
      this.batches.create({
        type: group.type,
        orderIds: orders.map((o) => o.id),
        pickupOrder,
        dropOrder,
        totalRiderFeePesewas: totalFee,
        codExposurePesewas: codExposure,
        feeByOrderJson: feeByOrder,
      }),
    );

    for (const candidate of wave) {
      const rider = candidate.rider;
      rider.status = RiderStatus.OFFERED;
      // Counted here, at the offer, not at the response: an offer that times out never produces
      // a response, and a denominator that misses those would make an unresponsive rider look
      // like a selective one.
      rider.offerCount += 1;
      await this.riders.save(rider);
      const offer = await this.offers.save(
        this.offers.create({
          orderId: primary.id,
          batchId: batch.id,
          riderId: rider.id,
          vendorId: primary.vendorId,
          status: OfferStatus.PENDING,
          expiresAt: new Date(Date.now() + this.offerWindowSec() * 1000),
          attempt: 0,
          riderFeePesewas: totalFee,
          pickupDistanceKm: round1(candidate.distanceKm),
          deliveryDistanceKm: route.totalKm,
          score: candidate.score,
          validationJson: { ...candidate.validationJson, routeExtraKm: route.extraKm, soloRouteKm: route.soloKm },
        }),
      );
      await this.auditLog(primary.id, 'batch_offer_created', { batchId: batch.id, type: group.type, orderIds: orders.map((o) => o.id), riderId: rider.id, feePesewas: totalFee, score: candidate.score, route });
      await this.bus.publish(EVENTS.DISPATCH_OFFER_CREATED, { riderId: rider.id, orderId: primary.id, offerId: offer.id, riderFeePesewas: totalFee, batchId: batch.id });
      await this.scheduler.schedule('offer-expiry', { offerId: offer.id }, this.offerWindowSec() * 1000, JOB_OFFER(offer.id));
      await this.notify.sendPush({ userId: rider.userId, title: 'New grouped delivery', body: `${orders.length} pickups — ${pickupOrder.length} vendor(s), ${dropOrder.length} drop(s). Accept within ${this.offerWindowSec()}s.` });
    }
    await this.bus.publish(EVENTS.DISPATCH_BATCH_CREATED, {
      batchId: batch.id,
      type: group.type,
      orderIds: orders.map((o) => o.id),
      totalRiderFeePesewas: totalFee,
      codExposurePesewas: codExposure,
      route,
    });
    void zone;
    return true;
  }

  /** Batch DTO for rider task / offer transparency (doc §5: pickup/drop counts). */
  private async batchDto(batch: Batch): Promise<BatchDto> {
    return {
      id: batch.id,
      type: batch.type,
      riderId: batch.riderId,
      status: batch.status,
      pickupCount: batch.pickupOrder.length,
      dropCount: batch.dropOrder.length,
      orderIds: batch.orderIds,
      pickupOrder: batch.pickupOrder,
      dropOrder: batch.dropOrder,
      totalRiderFeePesewas: batch.totalRiderFeePesewas,
      codExposurePesewas: batch.codExposurePesewas,
      createdAt: batch.createdAt.toISOString(),
    };
  }

  private async auditLog(orderId: string | null, eventType: string, detail: Record<string, unknown>): Promise<void> {
    await this.audit.save(
      this.audit.create({
        orderId: orderId ?? 'system',
        riderId: (detail.riderId as string) ?? null,
        eventType,
        detailJson: detail,
      }),
    );
  }

  /**
   * Write many audit rows in one insert.
   *
   * Dispatch rejects far more riders than it accepts, so a per-row write made the unsuccessful
   * path the most write-heavy one — a hundred inserts before a single offer went out.
   */
  private async auditLogBulk(orderId: string | null, eventType: string, details: Record<string, unknown>[]): Promise<void> {
    if (details.length === 0) return;
    await this.audit.save(
      details.map((detail) =>
        this.audit.create({
          orderId: orderId ?? 'system',
          riderId: (detail.riderId as string) ?? null,
          eventType,
          detailJson: detail,
        }),
      ),
    );
  }

  private registerJobs(): void {
    this.scheduler.onProcess('dispatch-t5', async (p) => {
      await this.attemptDispatch(p.orderId as string, 0);
    });
    this.scheduler.onProcess('dispatch-ready', async (p) => {
      // note: NOT dispatchNow — cancelling this very job from inside its handler fails (BullMQ lock)
      await this.scheduler.cancel(JOB_T5(p.orderId as string));
      await this.attemptDispatch(p.orderId as string, 0);
    });
    this.scheduler.onProcess('dispatch-retry', async (p) => {
      await this.attemptDispatch(p.orderId as string, (p.attempt as number) ?? 0);
    });
    this.scheduler.onProcess('rider-session-end', async (p) => {
      const rider = await this.riders.findOne({ where: { id: p.riderId as string } });
      if (!rider || !rider.sessionEndsAt) return;
      if (rider.sessionEndsAt.getTime() > Date.now()) {
        await this.scheduler.schedule('rider-session-end', { riderId: rider.id }, rider.sessionEndsAt.getTime() - Date.now(), JOB_SESSION_END(rider.id));
        return;
      }
      if (rider.status === RiderStatus.ASSIGNED || rider.status === RiderStatus.PICKED_UP) return;
      rider.status = RiderStatus.OFFLINE;
      rider.sessionEndsAt = null;
      rider.pausedUntil = null;
      rider.idleSince = null;
      await this.riders.save(rider);
      await this.completeActiveBlocks(rider.id);
      await this.auditLog(null, 'rider_session_ended', { riderId: rider.id, reason: 'session-expired' });
    });

    this.scheduler.onProcess('rider-pause-resume', async (p) => {
      const rider = await this.riders.findOne({ where: { id: p.riderId as string } });
      if (!rider || rider.status !== RiderStatus.PAUSED) return;
      if (rider.pausedUntil && rider.pausedUntil.getTime() > Date.now()) {
        await this.scheduler.schedule('rider-pause-resume', { riderId: rider.id }, rider.pausedUntil.getTime() - Date.now(), JOB_PAUSE_RESUME(rider.id));
        return;
      }
      rider.status = RiderStatus.AVAILABLE;
      rider.pausedUntil = null;
      rider.idleSince = new Date();
      await this.riders.save(rider);
    });

    this.scheduler.onProcess('offer-expiry', async (p) => {
      const offer = await this.offers.findOne({ where: { id: p.offerId as string } });
      if (!offer || offer.status !== OfferStatus.PENDING) return;
      offer.status = OfferStatus.EXPIRED;
      await this.offers.save(offer);
      const orderIds = offer.batchId
        ? ((await this.batches.findOne({ where: { id: offer.batchId } }))?.orderIds ?? [offer.orderId])
        : [offer.orderId];
      for (const oid of orderIds) {
        if (this.excludeTimeoutsFromSameOrder()) await this.exclude(oid, offer.riderId, 'timed_out');
        await this.auditLog(oid, 'timed_out', { offerId: offer.id, riderId: offer.riderId, batchId: offer.batchId ?? null });
      }
      await this.releaseOfferedRiderIfIdle(offer.riderId, { incrementTimeout: true });
      if (offer.batchId) await this.cleanupPendingBatchIfClosed(offer.batchId, 'timed_out');
      await this.maybeNextWave(offer.orderId, offer.attempt);
    });
  }

  // ── fetchers ───────────────────────────────────────────────────────
  private async fetchOrder(orderId: string): Promise<OrderSnapshot> {
    const res = await internalFetch(`${serviceUrl('order')}/internal/orders/${orderId}`);
    if (!res.ok) throw new NotFoundException('Order not found');
    return (await res.json()) as OrderSnapshot;
  }

  private async fetchVendor(vendorId: string): Promise<VendorMeta | null> {
    if (vendorId === 'ERRAND' || !/^[0-9a-f-]{36}$/i.test(vendorId)) return null; // errands have no vendor
    try {
      const res = await internalFetch(`${serviceUrl('catalog')}/internal/vendors/${vendorId}`);
      if (!res.ok) return null;
      return (await res.json()) as VendorMeta;
    } catch {
      return null;
    }
  }
}

function addressLabel(address: DeliveryAddressDto): string {
  return [address.label, address.landmark, address.digitalAddress, address.what3words]
    .filter((value): value is string => !!value?.trim())
    .join(' • ');
}

function unique(values: Array<string | null | undefined>): string[] | null {
  const result = [...new Set(values.filter((value): value is string => !!value))];
  return result.length ? result : null;
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
