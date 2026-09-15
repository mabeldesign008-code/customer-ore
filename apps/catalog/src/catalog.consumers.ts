/** Doc §4 SLA engine — record violations from order lifecycle events and auto-escalate
 *  penalties (warning → financial → suspension 24h/72h/7d → permanent). Financial penalties
 *  are absorbed by the vendor (ledger `owed`); suspensions block new orders. */

import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThanOrEqual, Repository } from 'typeorm';
import { EVENTS, OrderEventPayload, VendorPenaltyLevel } from '@ore/contracts';
import { ORE_BUS, ORE_NOTIFY, ORE_SCHEDULER, internalFetch, serviceUrl, ORE_DEDUPE, ConsumerDedupe } from '@ore/core';
import { Bus } from '@ore/bus';
import { NotifyClient } from '@ore/notify';
import { Scheduler } from '@ore/jobs';
import { Vendor } from './entities/vendor.entity';
import { VendorSlaViolation, VendorPenalty } from './entities/vendor-sla.entity';

const num = (v: string | undefined, d: number) => { const n = Number(v); return Number.isFinite(n) && v !== undefined && v !== '' ? n : d; };

@Injectable()
export class CatalogConsumers {

  constructor(
    @InjectRepository(Vendor) private readonly vendors: Repository<Vendor>,
    @InjectRepository(VendorSlaViolation) private readonly violations: Repository<VendorSlaViolation>,
    @InjectRepository(VendorPenalty) private readonly penalties: Repository<VendorPenalty>,
    @Inject(ORE_BUS) private readonly bus: Bus,
    @Inject(ORE_NOTIFY) private readonly notify: NotifyClient,
    @Inject(ORE_SCHEDULER) private readonly scheduler: Scheduler,
    @Inject(ORE_DEDUPE) private readonly dedupe: ConsumerDedupe,
  ) {}

  /**
   * doc §4: a suspension is a bounded window (24h/72h/7d). The window end used to only
   * clear if an admin manually lifted the penalty — otherwise the vendor stayed offline
   * forever (audit F-BUG-10). This sweeper restores `accepting` the moment the window
   * passes. Permanent deactivations never set suspendUntil, so they are untouched.
   */
  private startSuspensionSweeper(): void {
    this.scheduler.onInterval('catalog-suspension-sweeper', 60_000, async () => {
      const now = new Date();
      const due = await this.vendors.find({
        where: { accepting: false, suspendUntil: LessThanOrEqual(now), approved: true },
      });
      for (const vendor of due) {
        vendor.accepting = true;
        vendor.suspendUntil = null;
        await this.vendors.save(vendor);
        await this.notify.sendPush({
          userId: vendor.ownerUserId,
          title: 'Suspension lifted',
          body: 'Your SLA suspension window has ended — your store is accepting new orders again.',
          data: {},
        }).catch(() => undefined);
      }
    });
  }

  async init(): Promise<void> {
    this.startSuspensionSweeper();

    // late accept (doc §4 SLA: accept ≤3 min)
    await this.bus.subscribe<OrderEventPayload & { acceptLatencySec?: number }>(EVENTS.ORDER_ACCEPTED, async (env) => {
      if (!(await this.take(env.id))) return;
      const sla = num(process.env.SLA_LATE_ACCEPT_SEC, 180);
      const latency = env.payload.acceptLatencySec ?? 0;
      if (latency > sla) await this.record(env.payload.vendorId, 'LATE_ACCEPT', env.payload.orderId, latency - sla, `accepted ${latency}s (> ${sla}s)`);
    });

    // ready before EPT (doc §4: ready = fully prepared; ready-too-early is a penalty trigger)
    await this.bus.subscribe<OrderEventPayload & { prepTimeMin?: number }>(EVENTS.ORDER_READY_FOR_PICKUP, async (env) => {
      if (!(await this.take(env.id))) return;
      const res = await internalFetch(`${serviceUrl('order')}/internal/orders/${env.payload.orderId}`).catch(() => null);
      if (!res || !res.ok) return;
      const order = (await res.json()) as { createdAt: string; prepTimeMin: number } | null;
      if (!order) return;
      const toleranceMin = num(process.env.SLA_READY_EARLY_MIN, 1);
      const minReadyAt = new Date(new Date(order.createdAt).getTime() + (order.prepTimeMin - toleranceMin) * 60_000);
      if (new Date() < minReadyAt) {
        await this.record(env.payload.vendorId, 'READY_EARLY', env.payload.orderId, 1, 'marked ready before prep completed');
      }
    });

    // cancel/reject after accept (doc §4: out-of-stock-after-accept etc.)
    for (const evt of [EVENTS.ORDER_CANCELLED, EVENTS.ORDER_REJECTED]) {
      await this.bus.subscribe<OrderEventPayload & { fromStatus?: string }>(evt, async (env) => {
        if (!(await this.take(env.id))) return;
        const from = env.payload.fromStatus;
        if (from && ['ACCEPTED', 'PREPARING', 'READY_FOR_PICKUP', 'RIDER_ASSIGNED'].includes(from)) {
          await this.record(env.payload.vendorId, 'CANCEL_AFTER_ACCEPT', env.payload.orderId, 3, `order ${from.toLowerCase()} → ${env.payload.status.toLowerCase()}`);
        }
      });
    }
  }

  /** Record a violation and run the auto-penalty ladder (N violations in 7d → escalate). */
  private async record(vendorId: string, type: string, orderId: string | null, severity: number, note: string): Promise<void> {
    await this.violations.save(this.violations.create({ vendorId, type, orderId, severity, note }));
    const since = new Date(Date.now() - 7 * 86_400_000);
    const recent = await this.violations.count({ where: { vendorId, createdAt: since as never } });
    const threshold = num(process.env.SLA_PENALTY_LATE_ACCEPTS, 3);
    if (recent < threshold) return; // below auto-penalty threshold
    const active = await this.penalties.find({ where: { vendorId, active: true } });
    const level = this.nextLevel(active.length, active.at(-1)?.level);
    await this.applyPenalty(vendorId, level, `${recent} violations in 7d (${type})`, 0, 'system');
  }

  private nextLevel(count: number, last?: VendorPenaltyLevel): VendorPenaltyLevel {
    if (count === 0) return VendorPenaltyLevel.WARNING;
    if (count === 1) return VendorPenaltyLevel.FINANCIAL;
    if (last === VendorPenaltyLevel.FINANCIAL) return VendorPenaltyLevel.SUSPENSION_24H;
    if (last === VendorPenaltyLevel.SUSPENSION_24H) return VendorPenaltyLevel.SUSPENSION_72H;
    if (last === VendorPenaltyLevel.SUSPENSION_72H) return VendorPenaltyLevel.SUSPENSION_7D;
    return VendorPenaltyLevel.PERMANENT;
  }

  /** Apply a penalty: financial → vendor owes (ledger); suspension → accepting=false for a window; permanent → deactivate. */
  async applyPenalty(vendorId: string, level: VendorPenaltyLevel, trigger: string, amountPesewas: number, actor: string, note?: string): Promise<VendorPenalty> {
    const vendor = await this.vendors.findOne({ where: { id: vendorId } });
    if (!vendor) throw new Error('Vendor not found');
    const amount = level === VendorPenaltyLevel.FINANCIAL ? amountPesewas || num(process.env.SLA_PENALTY_FINANCIAL_PESEWAS, 2000) : 0;
    const penalty = await this.penalties.save(this.penalties.create({ vendorId, level, trigger, amountPesewas: amount, note: note ?? null, decidedBy: actor }));

    if (level === VendorPenaltyLevel.PERMANENT) {
      vendor.approved = false;
      vendor.accepting = false;
    } else if (level.startsWith('SUSPENSION_')) {
      const hours = { SUSPENSION_24H: 24, SUSPENSION_72H: 72, SUSPENSION_7D: 168 }[level as 'SUSPENSION_24H' | 'SUSPENSION_72H' | 'SUSPENSION_7D'] ?? 24;
      vendor.accepting = false;
      vendor.suspendUntil = new Date(Date.now() + hours * 3_600_000);
    } else if (level === VendorPenaltyLevel.FINANCIAL) {
      await this.bus.publish(EVENTS.VENDOR_PENALTY, { vendorId, amountPesewas: amount, trigger });
    }
    await this.vendors.save(vendor);
    await this.notify.sendPush({ userId: vendor.ownerUserId, title: `SLA penalty: ${level}`, body: `${trigger} — ${level === 'FINANCIAL' ? `GHS ${(amount / 100).toFixed(2)} deducted` : level === 'PERMANENT' ? 'account deactivated' : 'new orders suspended'}.`, data: {} });
    return penalty;
  }

  /** Admin lifts a suspension/penalty (doc §4: 48h appeal, admin final). */
  async liftPenalty(adminId: string, penaltyId: string): Promise<VendorPenalty> {
    const penalty = await this.penalties.findOne({ where: { id: penaltyId } });
    if (!penalty) throw new Error('Penalty not found');
    penalty.active = false;
    penalty.note = `${penalty.note ?? ''} — lifted by ${adminId}`.trim();
    await this.penalties.save(penalty);
    const vendor = await this.vendors.findOne({ where: { id: penalty.vendorId } });
    if (vendor && penalty.level.startsWith('SUSPENSION_')) {
      vendor.accepting = true;
      vendor.suspendUntil = null;
      await this.vendors.save(vendor);
    }
    return penalty;
  }

  // admin ops (doc §4: manual penalty, 48h appeal → admin lift)
  async listPenalties(): Promise<VendorPenalty[]> {
    return this.penalties.find({ order: { createdAt: 'DESC' }, take: 100 });
  }
  async listViolations(): Promise<VendorSlaViolation[]> {
    return this.violations.find({ order: { createdAt: 'DESC' }, take: 100 });
  }

  /**
   * Claim an envelope for processing, exactly once across every replica and every restart.
   *
   * This was a plain in-memory `Set`. It died with the process, so a redelivery after a deploy
   * was reprocessed; it was per-replica, so a fanned-out event was handled once per replica; and
   * it called `.clear()` wholesale at 10 000 entries, so the next redelivery of any of those
   * events was reprocessed too. All three are reachable on an at-least-once bus.
   */
  private take(id: string): Promise<boolean> {
    return this.dedupe.take(id);
  }
}
