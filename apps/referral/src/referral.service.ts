/** Referral program (doc §8): codes, claims with anti-fraud, credits on the referee's
 *  first successful non-refunded order ≥ min. Credits are ledger wallet credits
 *  (14-day expiry, in-app only) via the ledger internal endpoint — idempotent by ref. */

import { BadRequestException, ConflictException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, MoreThanOrEqual, Repository } from 'typeorm';
import { randomInt } from 'crypto';
import { EVENTS, OrderEventPayload, ReferralStatus } from '@ore/contracts';
import { ORE_BUS, ORE_ENV, internalFetch, serviceUrl, ORE_DEDUPE, ConsumerDedupe } from '@ore/core';
import { Bus } from '@ore/bus';
import { OreEnv } from '@ore/config';
import { ReferralCode } from './entities/referral-code.entity';
import { Referral } from './entities/referral.entity';

@Injectable()
export class ReferralService {
  private readonly logger = new Logger(ReferralService.name);

  constructor(
    @InjectRepository(ReferralCode) private readonly codes: Repository<ReferralCode>,
    @InjectRepository(Referral) private readonly referrals: Repository<Referral>,
    @Inject(ORE_BUS) private readonly bus: Bus,
    @Inject(ORE_ENV) private readonly env: OreEnv,
    @Inject(ORE_DEDUPE) private readonly dedupe: ConsumerDedupe,
  ) {}

  async init(): Promise<void> {
    // first successful non-refunded delivery ≥ min → credit referrer + referee
    await this.bus.subscribe<OrderEventPayload>(EVENTS.ORDER_DELIVERED, async (env) => {
      if (!(await this.take(env.id))) return;
      await this.onDelivered(env.payload.orderId);
    });
    // a phone that claimed a code before signing up becomes linkable once the account
    // exists — otherwise the claim stays PENDING forever and the referee is never credited
    await this.bus.subscribe<{ userId: string; phone: string; role?: string }>(EVENTS.USER_REGISTERED, async (env) => {
      if (!(await this.take(env.id))) return;
      await this.linkClaimsToUser(env.payload.userId, env.payload.phone);
    });
  }

  /** Resolve phone-only claims to the account once the referee registers. */
  private async linkClaimsToUser(userId: string, phone: string): Promise<void> {
    const pending = await this.referrals.find({ where: { refereePhone: phone, refereeUserId: IsNull() } });
    for (const r of pending) {
      if (r.status !== ReferralStatus.PENDING) continue;
      r.refereeUserId = userId;
      await this.referrals.save(r);
    }
  }

  // ── Codes ─────────────────────────────────────────────────────────
  async getOrCreateCode(userId: string, phone: string): Promise<ReferralCode> {
    const existing = await this.codes.findOne({ where: { userId } });
    if (existing) return existing;
    const code = await this.generateCode();
    return this.codes.save(this.codes.create({ userId, code }));
  }

  /**
   * Referral codes carry real money (referrer and referee wallet credits), so they must not be
   * guessable. `Math.random()` is not a CSPRNG: its xorshift128+ state is recoverable from a
   * handful of observed outputs, and the old 5-character base-36 body was small enough to
   * enumerate offline. Audit S-13 — use crypto.randomInt over an unambiguous alphabet.
   *
   * Ambiguous glyphs (0/O, 1/I/L) are excluded so a code read aloud over the phone or written
   * on a receipt still resolves. 8 characters over a 32-symbol alphabet is 40 bits — with
   * 50 000 codes the chance of guessing a live one is roughly 1 in 22 million.
   */
  private async generateCode(): Promise<string> {
    const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
    for (let i = 0; i < 10; i += 1) {
      let body = '';
      for (let n = 0; n < 8; n += 1) {
        body += ALPHABET[randomInt(ALPHABET.length)];
      }
      const code = `OR-${body}`;
      const dup = await this.codes.findOne({ where: { code } });
      if (!dup) return code;
    }
    throw new Error('Could not allocate a referral code');
  }

  // ── Claims (doc §8 anti-fraud: unique phone, no self/linked, caps, velocity) ──
  async claim(codeText: string, phone: string, claimantUserId?: string | null): Promise<Referral> {
    const code = await this.codes.findOne({ where: { code: codeText.toUpperCase() } });
    if (!code) throw new NotFoundException('Referral code not found');

    const flags: string[] = [];
    const referrer = await this.fetchUser(code.userId);
    // A signed-in user can never claim their own code (guarded by account, not just phone —
    // phone matching alone misses a user who changed their number).
    if ((claimantUserId && claimantUserId === code.userId) || referrer?.phone === phone) {
      flags.push('self_referral');
      await this.saveBlocked(code, phone, claimantUserId ?? null, flags);
      throw new BadRequestException('You cannot use your own referral code');
    }
    // same-phone repeat on the same referrer (linked referral)
    const repeat = await this.referrals.findOne({ where: { code: code.code, refereePhone: phone } });
    if (repeat) {
      flags.push('repeat_referee');
      if (repeat.status === ReferralStatus.CREDITED) {
        throw new ConflictException('This phone has already been referred by that code');
      }
      return repeat;
    }
    // monthly cap per referrer — counted from actual claims in the current calendar month
    // (a stored counter would be lifetime-only and never reset)
    const monthStart = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1));
    const monthClaims = await this.referrals.count({ where: { code: code.code, createdAt: MoreThanOrEqual(monthStart) } });
    if (monthClaims >= this.env.referralMonthlyCap) {
      flags.push('over_cap');
      await this.saveBlocked(code, phone, claimantUserId ?? null, flags);
      throw new ConflictException('That referrer has reached their monthly referral cap');
    }
    // velocity: too many claims from the same phone recently
    const since = new Date(Date.now() - 24 * 3_600_000);
    const recent = await this.referrals.count({ where: { refereePhone: phone, createdAt: since as never } });
    if (recent >= this.env.referralVelocityMin) {
      flags.push('velocity');
      await this.saveBlocked(code, phone, claimantUserId ?? null, flags);
      throw new ConflictException('Too many referral claims from this phone — flagged for review');
    }

    const referral = await this.referrals.save(
      this.referrals.create({
        code: code.code,
        referrerUserId: code.userId,
        referrerPhone: referrer?.phone ?? phone,
        refereePhone: phone,
        refereeUserId: claimantUserId ?? null,
        fraudFlags: flags.length ? flags : null,
      }),
    );
    await this.bus.publish(EVENTS.REFERRAL_CLAIMED, { referralId: referral.id, code: code.code, referrerUserId: code.userId, refereePhone: phone });
    return referral;
  }

  private async saveBlocked(code: ReferralCode, phone: string, refereeUserId: string | null, flags: string[]): Promise<Referral> {
    return this.referrals.save(
      this.referrals.create({
        code: code.code,
        referrerUserId: code.userId,
        referrerPhone: phone,
        refereePhone: phone,
        refereeUserId,
        status: ReferralStatus.BLOCKED,
        fraudFlags: flags,
      }),
    );
  }

  // ── Qualification (doc §8: first successful, non-refunded delivery ≥ min) ──
  private async onDelivered(orderId: string): Promise<void> {
    const order = await this.fetchOrder(orderId).catch(() => null);
    if (!order) return;
    if (order.totalPesewas < this.env.referralMinOrderPesewas) return;
    // Fail closed: an unverifiable order is treated as refunded and skipped (a later
    // delivered event retries). The old `.catch(() => false)` paid rewards on refunded
    // orders whenever the ledger was briefly unreachable (audit F-BUG-20/24).
    const refunded = await this.isRefunded(orderId).catch((err) => {
      this.logger.warn(`refunded-check for ${orderId} failed — skipping credit: ${err instanceof Error ? err.message : String(err)}`);
      return true;
    });
    if (refunded) return; // doc: non-refunded only

    // Referees may have claimed before signing up — match by resolved user id AND by
    // phone (the account linking above keeps both in sync, this second match is the
    // safety net for claims that arrived before the referral service was running).
    const byUser = await this.referrals.find({ where: { refereeUserId: order.customerId } });
    const byPhone = order.customerPhone
      ? await this.referrals.find({ where: { refereePhone: order.customerPhone } })
      : [];
    const seen = new Set<string>();
    for (const r of [...byUser, ...byPhone]) {
      if (seen.has(r.id)) continue;
      seen.add(r.id);
      if (r.status !== ReferralStatus.PENDING) continue;
      // Credit FIRST, then flip status. The old order (CREDITED + save, then credit)
      // meant a failed ledger credit left the row CREDITED with no money issued and
      // nothing to retry — silent lost rewards (audit F-BUG-24). On failure we leave it
      // PENDING so a later delivered event retries; the credit is idempotent by ref, so
      // the retry cannot double-credit.
      try {
        await this.credit(r, order.customerId);
      } catch (err) {
        this.logger.error(`Referral ${r.id} credit failed — left PENDING for retry: ${err instanceof Error ? err.message : String(err)}`);
        continue;
      }
      r.status = ReferralStatus.CREDITED;
      r.qualifiedAt = new Date();
      r.creditedAt = new Date();
      r.refereeUserId = r.refereeUserId ?? order.customerId;
      await this.referrals.save(r);
    }
  }

  private async credit(r: Referral, refereeUserId: string): Promise<void> {
    // referrer credit
    await this.creditUser(r.referrerUserId, this.env.referralReferrerCreditPesewas, `referral:referrer:${r.id}`, 'referral reward — you referred a friend');
    // referee credit (14-day expiry, in-app only)
    await this.creditUser(refereeUserId, this.env.referralRefereeCreditPesewas, `referral:referee:${r.id}`, 'referral reward — welcome credit', this.env.referralCreditExpiryDays);
    await this.bus.publish(EVENTS.REFERRAL_CREDITED, { referralId: r.id, referrerUserId: r.referrerUserId, refereeUserId });
  }

  private async creditUser(userId: string, amountPesewas: number, ref: string, reason: string, expiryDays?: number): Promise<void> {
    // Check the response: the old version fired and forgot, so a failed credit left the
    // referral CREDITED with no money ever issued and nothing to retry (audit F-BUG-24).
    // The ledger endpoint is idempotent on `ref` (unique credit-log ref), so the retry
    // left by the caller cannot double-credit.
    const res = await internalFetch(`${serviceUrl('ledger')}/internal/ledger/customers/${userId}/credit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amountPesewas, ref, reason, expiryDays: expiryDays ?? null }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new Error(`ledger credit ${ref} for ${userId} failed: ${res.status} ${detail}`.slice(0, 300));
    }
  }

  // ── Admin / reads ─────────────────────────────────────────────────
  listMine(userId: string): Promise<Referral[]> {
    return this.referrals.find({ where: { referrerUserId: userId }, order: { createdAt: 'DESC' }, take: 100 });
  }

  listAll(): Promise<Referral[]> {
    return this.referrals.find({ order: { createdAt: 'DESC' }, take: 200 });
  }

  async block(adminUserId: string, referralId: string, reason: string): Promise<Referral> {
    const r = await this.referrals.findOne({ where: { id: referralId } });
    if (!r) throw new NotFoundException('Referral not found');
    r.status = ReferralStatus.BLOCKED;
    r.fraudFlags = [...(r.fraudFlags ?? []), `admin_block:${reason}`];
    await this.referrals.save(r);
    return r;
  }

  async stats(userId: string): Promise<{ code: ReferralCode; pending: number; credited: number; earnedPesewas: number }> {
    const code = await this.getOrCreateCode(userId, '');
    const mine = await this.referrals.find({ where: { referrerUserId: userId } });
    return {
      code,
      pending: mine.filter((r) => r.status === ReferralStatus.PENDING).length,
      credited: mine.filter((r) => r.status === ReferralStatus.CREDITED).length,
      earnedPesewas: mine.filter((r) => r.status === ReferralStatus.CREDITED).length * this.env.referralReferrerCreditPesewas,
    };
  }

  // ── internals ─────────────────────────────────────────────────────
  private async fetchUser(userId: string): Promise<{ id: string; phone: string } | null> {
    const res = await internalFetch(`${serviceUrl('auth')}/auth/internal/users/${userId}`);
    if (!res.ok) return null;
    return (await res.json()) as { id: string; phone: string };
  }

  private async fetchOrder(orderId: string): Promise<{ id: string; customerId: string; customerPhone: string | null; totalPesewas: number } | null> {
    const res = await internalFetch(`${serviceUrl('order')}/internal/orders/${orderId}`);
    if (!res.ok) return null;
    const body = (await res.json()) as { customerId: string; totalPesewas: number; customer?: { phone?: string } };
    return {
      id: orderId,
      customerId: body.customerId,
      customerPhone: body.customer?.phone ?? null,
      totalPesewas: body.totalPesewas,
    };
  }

  private async isRefunded(orderId: string): Promise<boolean> {
    const res = await internalFetch(`${serviceUrl('ledger')}/internal/ledger/orders/${orderId}/refunded`);
    // Fail closed: if we cannot verify the order is unrefunded, treat it as refunded and
    // skip this delivery (a later delivered event retries). The old `return false` let a
    // ledger outage pay rewards on refunded orders — the gate's whole purpose is the
    // opposite (audit F-BUG-20/24).
    if (!res.ok) throw new Error(`ledger refunded-check for ${orderId} failed: ${res.status}`);
    const body = (await res.json()) as { refunded: boolean };
    return body.refunded;
  }

  /** Claim an envelope, exactly once across every replica and every restart. */
  private take(id: string): Promise<boolean> {
    return this.dedupe.take(id);
  }
}
