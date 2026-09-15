import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import {
  DEFAULT_VENDOR_PERFORMANCE_CONFIG,
  PerformanceCorrectionDto,
  PerformanceEngineConfig,
  PerformanceHistorySearchDto,
  PerformanceMetricInput,
  PerformanceReviewRunDto,
  Role,
  scorePerformance,
} from '@ore/contracts';
import { internalFetch, JwtPayload, serviceUrl } from '@ore/core';
import { Vendor } from './entities/vendor.entity';
import { VendorReview } from './entities/vendor-review.entity';
import { VendorSlaViolation } from './entities/vendor-sla.entity';
import { VendorPerformanceAudit, VendorPerformanceConfig, VendorPerformanceRecord } from './entities/vendor-performance.entity';

interface VendorPerformanceOrder {
  orderId: string;
  status: string;
  prepTimeMin: number;
  timeline?: { from?: string; to: string; at: string }[];
}

@Injectable()
export class VendorPerformanceService {
  constructor(
    @InjectRepository(Vendor) private readonly vendors: Repository<Vendor>,
    @InjectRepository(VendorReview) private readonly reviews: Repository<VendorReview>,
    @InjectRepository(VendorSlaViolation) private readonly violations: Repository<VendorSlaViolation>,
    @InjectRepository(VendorPerformanceConfig) private readonly configs: Repository<VendorPerformanceConfig>,
    @InjectRepository(VendorPerformanceRecord) private readonly records: Repository<VendorPerformanceRecord>,
    @InjectRepository(VendorPerformanceAudit) private readonly audits: Repository<VendorPerformanceAudit>,
  ) {}

  async activeConfig(): Promise<PerformanceEngineConfig> {
    const row = await this.configs.findOne({ where: { active: true }, order: { createdAt: 'DESC' } });
    return row?.configJson ?? DEFAULT_VENDOR_PERFORMANCE_CONFIG;
  }

  async listConfigs(): Promise<VendorPerformanceConfig[]> {
    return this.configs.find({ order: { createdAt: 'DESC' }, take: 50 });
  }

  async upsertConfig(actor: JwtPayload, input: { name?: string; active: boolean; config: PerformanceEngineConfig; notes?: string }): Promise<VendorPerformanceConfig> {
    if (input.config.subject !== 'VENDOR') throw new BadRequestException('Vendor performance config must have subject=VENDOR');
    const totalWeight = input.config.metrics.filter((metric) => metric.enabled !== false).reduce((sum, metric) => sum + metric.weight, 0);
    if (totalWeight <= 0) throw new BadRequestException('At least one enabled metric must have a positive weight');
    if (input.active) await this.configs.update({ active: true }, { active: false });
    const row = await this.configs.save(this.configs.create({
      name: input.name ?? `Vendor Performance v${input.config.version}`,
      version: input.config.version,
      reviewPeriod: input.config.reviewPeriod,
      active: input.active,
      configJson: input.config,
      createdBy: actor.sub,
      approvedBy: null,
      notes: input.notes?.trim() || null,
    }));
    await this.audit(null, 'CONFIG_CREATED', actor.sub, row.id, { version: row.version, active: row.active }, input.notes ?? null);
    return row;
  }

  async runReview(vendorId: string, actor: JwtPayload, dto: PerformanceReviewRunDto): Promise<VendorPerformanceRecord> {
    await this.requireVendor(vendorId);
    const period = this.parsePeriod(dto.periodStart, dto.periodEnd);
    const configRow = await this.configs.findOne({ where: { active: true }, order: { createdAt: 'DESC' } });
    const config = configRow?.configJson ?? DEFAULT_VENDOR_PERFORMANCE_CONFIG;
    const previous = await this.previousScores(vendorId, period.start);
    const metrics = dto.metrics ?? await this.measuredMetrics(vendorId, period.start, period.end);
    const result = scorePerformance({ config, metrics, previousScores: previous });
    const actionCodes = unique([...(dto.actionOverrides ?? []), ...result.triggeredActions.map((action) => action.code)]);
    const record = await this.records.save(this.records.create({
      vendorId,
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
    await this.audit(vendorId, 'REVIEW_RECORDED', actor.sub, record.id, { status: record.status, grade: record.grade, actions: actionCodes }, dto.notes ?? null);
    return record;
  }

  async recordCorrection(vendorId: string, actor: JwtPayload, dto: PerformanceCorrectionDto): Promise<VendorPerformanceRecord> {
    await this.requireVendor(vendorId);
    const linked = await this.records.findOne({ where: { id: dto.linkedRecordId, vendorId } });
    if (!linked) throw new NotFoundException('Linked performance record not found');
    const period = this.parsePeriod(dto.periodStart, dto.periodEnd);
    const config = await this.activeConfig();
    const previous = await this.previousScores(vendorId, period.start);
    const result = scorePerformance({ config, metrics: dto.metrics ?? linked.resultJson.metricScores.map((metric) => ({ code: metric.code, value: metric.actual ?? 0, sampleSize: metric.sampleSize })), previousScores: previous });
    const actionCodes = unique([...(dto.actionOverrides ?? []), ...result.triggeredActions.map((action) => action.code)]);
    const record = await this.records.save(this.records.create({
      vendorId,
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
    await this.audit(vendorId, dto.correctionType, actor.sub, record.id, { linkedRecordId: linked.id, status: record.status }, dto.reason);
    return record;
  }

  async searchHistory(opts: PerformanceHistorySearchDto): Promise<VendorPerformanceRecord[]> {
    const qb = this.records.createQueryBuilder('record').orderBy('record.createdAt', 'DESC').take(opts.limit ?? 100);
    if (opts.subjectId) qb.andWhere('record.vendorId = :vendorId', { vendorId: opts.subjectId });
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

  async myHistory(user: JwtPayload): Promise<VendorPerformanceRecord[]> {
    const vendor = await this.vendors.findOne({ where: { ownerUserId: user.sub } });
    if (!vendor) throw new NotFoundException('Vendor not found');
    return this.records.find({ where: { vendorId: vendor.id }, order: { createdAt: 'DESC' }, take: 24 });
  }

  async vendorHistory(user: JwtPayload, vendorId: string): Promise<VendorPerformanceRecord[]> {
    if (user.role !== Role.ADMIN) {
      const vendor = await this.requireVendor(vendorId);
      if (vendor.ownerUserId !== user.sub) throw new ForbiddenException('Not your vendor');
    }
    return this.records.find({ where: { vendorId }, order: { createdAt: 'DESC' }, take: 24 });
  }

  private async measuredMetrics(vendorId: string, start: Date, end: Date): Promise<PerformanceMetricInput[]> {
    const [orders, reviews, violations] = await Promise.all([
      this.fetchVendorOrders(vendorId),
      this.reviews.find({ where: { vendorId, createdAt: Between(start, end) } }),
      this.violations.find({ where: { vendorId, createdAt: Between(start, end) } }),
    ]);
    const periodOrders = orders.filter((order) => {
      const first = new Date(order.timeline?.[0]?.at ?? 0);
      return Number.isFinite(first.getTime()) && first >= start && first <= end;
    });
    const accepted = periodOrders.filter((order) => !['REJECTED', 'CANCELLED'].includes(order.status)).length;
    const vendorCancelled = periodOrders.filter((order) => order.status === 'REJECTED').length;
    const prepEligible = periodOrders.filter((order) => eventAt(order, 'PREPARING') && eventAt(order, 'READY_FOR_PICKUP'));
    const prepMet = prepEligible.filter((order) => {
      const prepAt = eventAt(order, 'PREPARING')!;
      const readyAt = eventAt(order, 'READY_FOR_PICKUP')!;
      return (readyAt.getTime() - prepAt.getTime()) / 60_000 <= Math.max(1, order.prepTimeMin);
    }).length;
    const ratingCount = reviews.length;
    const avgRating = ratingCount ? reviews.reduce((sum, review) => sum + review.rating, 0) / ratingCount : 0;
    const serious = violations.filter((violation) => violation.severity >= 3 || /SERIOUS|SAFETY|PRICE_MANIPULATION/i.test(violation.type)).length;
    return [
      { code: 'acceptance_rate', numerator: accepted, denominator: periodOrders.length, sampleSize: periodOrders.length, attribution: 'RESPONSIBLE' },
      { code: 'prep_time_met_rate', numerator: prepMet, denominator: prepEligible.length, sampleSize: prepEligible.length, attribution: 'RESPONSIBLE' },
      { code: 'cancellation_rate', numerator: vendorCancelled, denominator: periodOrders.length, sampleSize: periodOrders.length, attribution: 'RESPONSIBLE', incidentType: vendorCancelled ? 'VENDOR_REJECTION' : null },
      { code: 'customer_rating', value: avgRating, sampleSize: ratingCount, attribution: 'RESPONSIBLE' },
      { code: 'serious_incidents', value: serious, sampleSize: Math.max(violations.length, 1), attribution: 'RESPONSIBLE', incidentType: serious ? 'SERIOUS_VENDOR_INCIDENT' : null },
    ];
  }

  private async fetchVendorOrders(vendorId: string): Promise<VendorPerformanceOrder[]> {
    const res = await internalFetch(`${serviceUrl('order')}/internal/vendors/${vendorId}/orders`);
    if (!res.ok) return [];
    return (await res.json()) as VendorPerformanceOrder[];
  }

  private async previousScores(vendorId: string, before: Date): Promise<number[]> {
    const rows = await this.records.find({ where: { vendorId }, order: { periodEnd: 'DESC' }, take: 6 });
    return rows
      .filter((row) => row.periodEnd < before && row.overallScore !== null)
      .map((row) => row.overallScore as number)
      .reverse();
  }

  private parsePeriod(startRaw: string, endRaw: string): { start: Date; end: Date } {
    const start = new Date(startRaw);
    const end = new Date(endRaw);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) throw new BadRequestException('Performance review period is invalid');
    if (start >= end) throw new BadRequestException('Performance review period start must be before end');
    return { start, end };
  }

  private async requireVendor(vendorId: string): Promise<Vendor> {
    const vendor = await this.vendors.findOne({ where: { id: vendorId } });
    if (!vendor) throw new NotFoundException('Vendor not found');
    return vendor;
  }

  private async audit(vendorId: string | null, action: string, actorId: string, recordId: string | null, payloadJson: Record<string, unknown> | null, reason: string | null): Promise<void> {
    await this.audits.save(this.audits.create({ vendorId, action, actorId, recordId, payloadJson, reason }));
  }
}

function eventAt(order: VendorPerformanceOrder, status: string): Date | null {
  const hit = (order.timeline ?? []).find((event) => event.to === status);
  if (!hit) return null;
  const date = new Date(hit.at);
  return Number.isNaN(date.getTime()) ? null : date;
}

function unique(values: Array<string | null | undefined>): string[] | null {
  const result = [...new Set(values.filter((value): value is string => !!value))];
  return result.length ? result : null;
}
