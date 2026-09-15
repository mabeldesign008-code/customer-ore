/** Order service — owns the state machine, OTP lifecycle, timeouts, and audit log. */

import { Transactional as Transaction } from 'typeorm-transactional';

import { BadRequestException, ConflictException, ForbiddenException, Inject, Injectable, NotFoundException, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { createHash, randomBytes, randomInt } from 'crypto';
import {
  EVENTS,
  ErrandStatus,
  ErrandTrustTier,
  OrderStatus,
  OrderType,
  PaymentMethod,
  Role,
  SubstitutionStatus,
  OrderStatusDto,
  SelectedOptionDto,
  ORDER_ACTIVE_STATUSES,
  customerDeliveryFee,
  feePolicyFromEnv,
  CreateErrandDto,
  CreateParcelDto,
  ErrandReceiptDto,
  ErrandSubDecisionDto,
  ErrandSubstitutionDto,
  DeliveryAddressDto, bpsToPct } from '@ore/contracts';
import { distanceKm, isPointInZone, loadZone, withinM } from '@ore/geo';
import { ORE_BUS, ORE_ENV, ORE_SCHEDULER, ORE_NOTIFY, ORE_STORAGE, JwtPayload, internalFetch, serviceUrl } from '@ore/core';
import { Bus } from '@ore/bus';
import { Scheduler } from '@ore/jobs';
import { OreEnv } from '@ore/config';
import { NotifyClient } from '@ore/notify';
import { LocalStorageDriver, StorageDriver, storageKeyFor } from '@ore/storage';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { OrderEvent } from './entities/order-event.entity';
import { OrderSequence } from './entities/order-sequence.entity';
import { OrderIssue } from './entities/order-issue.entity';
import { OrderAddressAudit } from './entities/order-address-audit.entity';
import { canTransition } from './state';
import { CreatedOrder, OrderCreatePayload } from './create.types';
import { nextSequenceValue } from '@ore/db';
import { decryptOtp, encryptOtp, resolveOtpKey } from './otp-crypto';

interface RiderProjection {
  id: string;
  name: string;
  phone: string;
  lat: number;
  lng: number;
  locationUpdatedAt?: string | null;
}

const JOB_PAYMENT_TIMEOUT = (_checkoutId: string, orderId: string) => `payment-timeout-${orderId}`;
const JOB_ACCEPT_TIMEOUT = (orderId: string) => `accept-timeout-${orderId}`;
const JOB_AUTO_READY = (orderId: string) => `auto-ready-${orderId}`;

@Injectable()
export class OrderService implements OnModuleInit {
  constructor(
    @InjectRepository(Order) private readonly orders: Repository<Order>,
    @InjectRepository(OrderItem) private readonly orderItems: Repository<OrderItem>,
    @InjectRepository(OrderEvent) private readonly events: Repository<OrderEvent>,
    @InjectRepository(OrderSequence) private readonly sequences: Repository<OrderSequence>,
    @InjectRepository(OrderIssue) private readonly issues: Repository<OrderIssue>,
    @InjectRepository(OrderAddressAudit) private readonly addressAudits: Repository<OrderAddressAudit>,
    @Inject(ORE_BUS) private readonly bus: Bus,
    @Inject(ORE_SCHEDULER) private readonly scheduler: Scheduler,
    @Inject(ORE_ENV) private readonly env: OreEnv,
    @Inject(ORE_NOTIFY) private readonly notify: NotifyClient,
    @Inject(ORE_STORAGE) private readonly storage: StorageDriver,
  ) {
    this.registerJobs();
  }

  /**
   * Fail at boot, not at the first order.
   *
   * `resolveOtpKey` throws when neither OTP_ENC_KEY nor JWT_SECRET is set. Calling it here means
   * a misconfigured deployment dies during startup — before it takes traffic, and while the
   * error is still attached to the thing that caused it. Left to the lazy path, the same
   * misconfiguration would surface as a 500 on some customer's checkout, hours later.
   */
  onModuleInit(): void {
    resolveOtpKey();
  }

  // ── Creation (internal, called by cart checkout) ──────────────────
  @Transaction()
  async createOrders(payloads: OrderCreatePayload[]): Promise<{ checkoutId: string; orders: CreatedOrder[] }> {
    if (payloads.length === 0) throw new BadRequestException('No orders in checkout');
    const checkoutId = crypto.randomUUID();
    const zone = loadZone();
    const created: CreatedOrder[] = [];

    for (const p of payloads) {
      const ref = await this.nextOrderRef(p.serviceCode);
      // gift order (doc §3 Case 2): recipient must confirm the location before the order begins
      const isGift = !!p.recipient;
      const status = isGift
        ? OrderStatus.AWAITING_RECIPIENT
        : p.paymentMethod === PaymentMethod.COD ? OrderStatus.CONFIRMED : OrderStatus.PENDING_PAYMENT;
      const otp = status === OrderStatus.CONFIRMED ? this.makeOtp() : null;
      const recipientJson = isGift
        ? {
            name: p.recipient!.name,
            phone: p.recipient!.phone,
            status: 'AWAITING_CONFIRMATION' as const,
            token: randomBytes(12).toString('hex'),
            confirmedAt: null,
            address: null,
          }
        : null;
      const order = await this.orders.save(
        this.orders.create({
          ref,
          checkoutId,
          vendorId: p.vendorId,
          vendorName: p.vendorName,
          vendorType: p.vendorType,
          serviceCode: p.serviceCode,
          feePolicyVersion: p.feePolicyVersion,
          commissionBps: p.commissionBps,
          customerId: p.customerId,
          customerPhone: p.customerPhone ?? null,
          paymentMethod: p.paymentMethod,
          status,
          prescriptionStatus: p.items.some((item) => item.prescriptionOnly) ? 'PENDING_UPLOAD' : 'NOT_REQUIRED',
          prescriptionKey: null,
          prescriptionContentType: null,
          prescriptionReviewNote: null,
          conditionJson: null,
          laundryStage: p.vendorType === 'LAUNDRY' || p.serviceCode === 'LD' ? 'AWAITING_COLLECTION' : null,
          addressJson: p.address,
          pickupJson: p.pickup
            ? {
                locationId: p.pickup.locationId ?? null,
                name: p.pickup.name,
                address: p.pickup.address ?? null,
                lat: p.pickup.lat,
                lng: p.pickup.lng,
              }
            : null,
          prepTimeMin: p.prepTimeMin,
          originalPrepTimeMin: p.prepTimeMin,
          prepTimeExtendedByMin: 0,
          prepExtensionCount: 0,
          lastPrepExtendedAt: null,
          lastPrepExtendedBy: null,
          lastPrepExtensionReason: null,
          subtotalPesewas: p.subtotalPesewas,
          deliveryFeePesewas: p.deliveryFeePesewas,
          serviceFeePesewas: p.serviceFeePesewas,
          platformFeePesewas: p.platformFeePesewas,
          vendorSharePesewas: p.vendorSharePesewas,
          riderFeePesewas: p.riderFeePesewas,
          totalPesewas: p.totalPesewas,
          promotionId: p.promotionId ?? null,
          promotionTitle: p.promotionTitle ?? null,
          promotionDiscountPesewas: p.promotionDiscountPesewas ?? 0,
          tipPesewas: p.tipPesewas ?? 0,
          note: p.note ?? null,
          leaveAtDoor: !!p.leaveAtDoor,
          dropNote: p.dropNote?.trim() || null,
          scheduledFor: p.scheduledFor ? new Date(p.scheduledFor) : null,
          serviceLevel: p.serviceLevel ?? (p.scheduledFor ? 'SCHEDULED' : 'STANDARD'),
          otpHash: otp?.hash ?? null,
          otpCipher: otp ? encryptOtp(otp.plain) : null,
          recipientJson,
          giftToken: recipientJson?.token ?? null,
        }),
      );
      await this.orderItems.save(
        p.items.map((i) =>
          this.orderItems.create({
            orderId: order.id,
            itemId: i.itemId,
            name: i.name,
            qty: i.qty,
            unit: i.unit ?? null,
            unitPricePesewas: i.unitPricePesewas,
            prepTimeMin: i.prepTimeMin,
            modifiers: i.modifiers ?? [],
            selectedOptions: (i.selectedOptions ?? []) as unknown as Record<string, unknown>[],
            optionsTotalPesewas: i.optionsTotalPesewas ?? 0,
            prescriptionOnly: i.prescriptionOnly ?? false,
          }),
        ),
      );
      await this.recordEvent(order.id, null, order.status, 'system', { ref });
      await this.recordAddressAudit(order.id, 'SNAPSHOT', null, order.addressJson, 'checkout', 'system', null, 'Checkout delivery-location snapshot');
      await this.bus.publish(EVENTS.ORDER_CREATED, { orderId: order.id, checkoutId, status: order.status, vendorId: p.vendorId, customerId: p.customerId, paymentMethod: p.paymentMethod, amountPesewas: p.totalPesewas, recipientPhone: p.recipient?.phone ?? null, recipientToken: recipientJson?.token ?? null, isGift: !!isGift });

      if (status === OrderStatus.PENDING_PAYMENT) {
        await this.scheduler.schedule('payment-timeout', { orderId: order.id }, zone.config.paymentTimeoutMin * 60_000, JOB_PAYMENT_TIMEOUT(checkoutId, order.id));
      } else if (status === OrderStatus.CONFIRMED) {
        // COD: confirmed immediately (G38) — vendor notified, OTP issued, accept window starts
        await this.transition(order.id, OrderStatus.CONFIRMED, 'system', { paymentMethod: PaymentMethod.COD });
        await this.scheduleAcceptTimeout(order.id);
      }
      // AWAITING_RECIPIENT (gift): nothing until the recipient confirms the location
      created.push(this.toCreated(order, p));
    }
    return { checkoutId, orders: created };
  }

  // ── Vendor actions ────────────────────────────────────────────────
  async accept(user: JwtPayload, orderId: string): Promise<OrderStatusDto> {
    const order = await this.forVendor(user, orderId);
    if (order.prescriptionStatus !== 'NOT_REQUIRED' && order.prescriptionStatus !== 'APPROVED') {
      throw new ConflictException(`Prescription must be approved before accepting this order (status: ${order.prescriptionStatus})`);
    }
    if (order.status !== OrderStatus.CONFIRMED) throw new ConflictException(`Cannot accept order in state ${order.status}`);
    await this.reserveCatalogStock(order.id);
    try {
      await this.scheduler.cancel(JOB_ACCEPT_TIMEOUT(order.id));
      // doc §SLA 2.1: accept/reject within 3 minutes — record SLA latency for monitoring
      const acceptLatencySec = Math.round((Date.now() - order.createdAt.getTime()) / 1000);
      await this.recordEvent(order.id, order.status, OrderStatus.ACCEPTED, `vendor:${user.sub}`, { acceptLatencySec, acceptSlaSec: this.acceptSlaSec() });
      await this.transition(order.id, OrderStatus.ACCEPTED, `vendor:${user.sub}`);
      await this.transition(order.id, OrderStatus.PREPARING, `vendor:${user.sub}`, { prepTimeMin: order.prepTimeMin });
      // auto-ready job: marks READY_FOR_PICKUP if vendor hasn't tapped ready by prep end
      const zone = loadZone();
      await this.scheduler.schedule('auto-ready', { orderId: order.id }, order.prepTimeMin * 60_000, JOB_AUTO_READY(order.id));
      const acceptedAt = new Date();
      const estimatedReadyAt = new Date(acceptedAt.getTime() + order.prepTimeMin * 60_000).toISOString();
      await this.bus.publish(EVENTS.ORDER_ACCEPTED, { orderId: order.id, checkoutId: order.checkoutId, status: OrderStatus.PREPARING, vendorId: order.vendorId, customerId: order.customerId, paymentMethod: order.paymentMethod, amountPesewas: order.totalPesewas, prepTimeMin: order.prepTimeMin, originalPrepTimeMin: order.originalPrepTimeMin ?? order.prepTimeMin, dispatchLeadMin: zone.config.dispatchLeadMin, acceptLatencySec, acceptedAt: acceptedAt.toISOString(), estimatedReadyAt });
      return this.getOrder(order.id);
    } catch (error) {
      await this.releaseCatalogStock(order.id).catch(() => undefined);
      throw error;
    }
  }

  async reject(user: JwtPayload, orderId: string, reason?: string): Promise<OrderStatusDto> {
    const order = await this.forVendor(user, orderId);
    if (order.status !== OrderStatus.CONFIRMED) throw new ConflictException(`Cannot reject order in state ${order.status}`);
    await this.scheduler.cancel(JOB_ACCEPT_TIMEOUT(order.id));
    await this.transition(order.id, OrderStatus.REJECTED, `vendor:${user.sub}`, { reason: reason ?? 'vendor-declined' });
    await this.bus.publish(EVENTS.ORDER_REJECTED, { orderId: order.id, checkoutId: order.checkoutId, status: OrderStatus.REJECTED, vendorId: order.vendorId, customerId: order.customerId, paymentMethod: order.paymentMethod, amountPesewas: order.totalPesewas, reason: reason ?? 'vendor-declined', fromStatus: order.status });
    return this.getOrder(order.id);
  }

  async markReady(user: JwtPayload, orderId: string): Promise<OrderStatusDto> {
    const order = await this.forVendor(user, orderId);
    if (![OrderStatus.PREPARING, OrderStatus.ACCEPTED].includes(order.status)) {
      throw new ConflictException(`Cannot mark ready in state ${order.status}`);
    }
    await this.scheduler.cancel(JOB_AUTO_READY(order.id));
    const readyAt = new Date();
    await this.transition(order.id, OrderStatus.READY_FOR_PICKUP, `vendor:${user.sub}`, {
      readyMarkedBy: user.sub,
      readyAt: readyAt.toISOString(),
      prepTimeMin: order.prepTimeMin,
      fullyPreparedPackedLabelled: true,
    });
    await this.bus.publish(EVENTS.ORDER_READY_FOR_PICKUP, { orderId: order.id, checkoutId: order.checkoutId, status: OrderStatus.READY_FOR_PICKUP, vendorId: order.vendorId, customerId: order.customerId, paymentMethod: order.paymentMethod, amountPesewas: order.totalPesewas, readyAt: readyAt.toISOString(), prepTimeMin: order.prepTimeMin });
    return this.getOrder(order.id);
  }

  async delay(user: JwtPayload, orderId: string, change: { extraMinutes?: number; newPrepTimeMin?: number; reason: string }): Promise<OrderStatusDto> {
    const order = await this.forVendor(user, orderId);
    if (![OrderStatus.PREPARING, OrderStatus.ACCEPTED].includes(order.status)) {
      throw new ConflictException(`Cannot extend the preparation countdown in state ${order.status}`);
    }
    const reason = change.reason.trim();
    if (!reason) throw new BadRequestException('A genuine delay reason is required');

    const oldPrepTimeMin = order.prepTimeMin;
    const requestedNewPrep = change.newPrepTimeMin ?? oldPrepTimeMin + (change.extraMinutes ?? 0);
    const newPrepTimeMin = Math.ceil(requestedNewPrep);
    if (newPrepTimeMin <= oldPrepTimeMin) {
      throw new BadRequestException('New estimated preparation time must be greater than the current EPT');
    }

    const extraMinutes = newPrepTimeMin - oldPrepTimeMin;
    const delayedAt = new Date();
    order.originalPrepTimeMin = order.originalPrepTimeMin ?? oldPrepTimeMin;
    order.prepTimeMin = newPrepTimeMin;
    order.prepTimeExtendedByMin = (order.prepTimeExtendedByMin ?? 0) + extraMinutes;
    order.prepExtensionCount = (order.prepExtensionCount ?? 0) + 1;
    order.lastPrepExtendedAt = delayedAt;
    order.lastPrepExtendedBy = user.sub;
    order.lastPrepExtensionReason = reason;
    await this.orders.save(order);

    const acceptedAt = order.acceptedAt ?? delayedAt;
    const newReadyAt = new Date(acceptedAt.getTime() + newPrepTimeMin * 60_000);
    const remainingCountdownSec = Math.max(0, Math.ceil((newReadyAt.getTime() - delayedAt.getTime()) / 1000));
    await this.scheduler.cancel(JOB_AUTO_READY(order.id));
    await this.scheduler.schedule('auto-ready', { orderId: order.id }, Math.max(0, remainingCountdownSec * 1000), JOB_AUTO_READY(order.id));

    const payload = {
      orderId: order.id,
      checkoutId: order.checkoutId,
      status: order.status,
      vendorId: order.vendorId,
      customerId: order.customerId,
      paymentMethod: order.paymentMethod,
      amountPesewas: order.totalPesewas,
      oldPrepTimeMin,
      newPrepTimeMin,
      extraMinutes,
      reason,
      vendorUserId: user.sub,
      delayedAt: delayedAt.toISOString(),
      estimatedReadyAt: newReadyAt.toISOString(),
      remainingCountdownSec,
    };
    await this.bus.publish(EVENTS.ORDER_DELAYED, payload);
    await this.recordEvent(order.id, order.status, order.status, `vendor:${user.sub}`, payload);
    return this.getOrder(order.id);
  }

  async recordLaundryCondition(user: JwtPayload, orderId: string, condition: Record<string, unknown>): Promise<OrderStatusDto> {
    const order = await this.forVendor(user, orderId);
    this.assertLaundryConditionWindow(order);
    if (Object.keys(condition).length === 0) throw new BadRequestException('Condition details are required');
    const existingPhotos = Array.isArray(order.conditionJson?.photos) ? order.conditionJson.photos : [];
    order.conditionJson = { ...condition, photos: existingPhotos };
    await this.orders.save(order);
    await this.recordEvent(order.id, order.status, order.status, `vendor:${user.sub}`, { conditionRecorded: true });
    return this.getOrder(order.id);
  }

  async uploadLaundryConditionPhoto(
    user: JwtPayload,
    orderId: string,
    dataBase64: string,
    contentType: string,
  ): Promise<{ orderId: string; photoKey: string }> {
    const order = await this.forVendor(user, orderId);
    this.assertLaundryConditionWindow(order);
    const normalizedContentType = contentType.trim().toLowerCase();
    if (!['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(normalizedContentType)) {
      throw new BadRequestException('Laundry condition photos must be JPEG, PNG, or WebP');
    }
    const encoded = dataBase64.replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/i, '').replace(/\s/g, '');
    if (!/^[A-Za-z0-9+/]*={0,2}$/.test(encoded) || encoded.length % 4 !== 0) {
      throw new BadRequestException('Laundry condition photo must be valid Base64');
    }
    const bytes = Buffer.from(encoded, 'base64');
    if (bytes.length === 0 || bytes.length > 5 * 1024 * 1024) {
      throw new BadRequestException('Laundry condition photo must be between 1 byte and 5 MB');
    }
    const extension = normalizedContentType.includes('png') ? 'png' : normalizedContentType.includes('webp') ? 'webp' : 'jpg';
    const photoKey = storageKeyFor('laundry-conditions', order.id, `condition-${Date.now()}.${extension}`);
    await this.storage.putObject(photoKey, bytes, normalizedContentType);
    const existing = order.conditionJson ?? {};
    const photos = Array.isArray(existing.photos) ? existing.photos.filter((photo) => photo && typeof photo === 'object') : [];
    photos.push({ photoKey, contentType: normalizedContentType, uploadedAt: new Date().toISOString() });
    order.conditionJson = { ...existing, photos };
    await this.orders.save(order);
    await this.recordEvent(order.id, order.status, order.status, `vendor:${user.sub}`, { conditionPhotoUploaded: true, photoKey });
    return { orderId, photoKey };
  }

  async getLaundryConditionPhotos(orderId: string, viewer: JwtPayload): Promise<Array<{ photoKey: string; contentType: string; uploadedAt: string; dataBase64?: string; downloadUrl?: string }>> {
    const order = await this.orders.findOne({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');
    const vendorAllowed = viewer.role === Role.VENDOR && await this.vendorOwns(viewer.sub, order.vendorId);
    const customerAllowed = viewer.role === Role.CUSTOMER && viewer.sub === order.customerId;
    if (!vendorAllowed && !customerAllowed && viewer.role !== Role.ADMIN) throw new ForbiddenException('Not allowed to view laundry condition photos');
    const photos = Array.isArray(order.conditionJson?.photos) ? order.conditionJson.photos : [];
    return Promise.all(photos.filter((photo): photo is { photoKey: string; contentType: string; uploadedAt: string } =>
      !!photo && typeof photo === 'object' && typeof photo.photoKey === 'string' && typeof photo.contentType === 'string' && typeof photo.uploadedAt === 'string',
    ).map(async (photo) => this.storage instanceof LocalStorageDriver
      ? { ...photo, dataBase64: this.storage.readObject(photo.photoKey).toString('base64') }
      : { ...photo, downloadUrl: await this.storage.createPresignedDownload(photo.photoKey) }));
  }

  @Transaction()
  async recordMarketFulfillment(
    user: JwtPayload,
    orderId: string,
    lines: Array<{ orderItemId: string; actualQuantity: number; unit: string; actualPricePesewas?: number; note?: string }>,
  ): Promise<OrderStatusDto> {
    const order = await this.forVendor(user, orderId);
    if (order.vendorType !== 'MARKET' && order.serviceCode !== 'MK') {
      throw new BadRequestException('Measured fulfillment is only available for market orders');
    }
    if (![OrderStatus.CONFIRMED, OrderStatus.ACCEPTED, OrderStatus.PREPARING, OrderStatus.READY_FOR_PICKUP].includes(order.status)) {
      throw new ConflictException(`Measured fulfillment cannot be recorded in state ${order.status}`);
    }
    if (!Array.isArray(lines) || lines.length === 0) throw new BadRequestException('At least one measured market line is required');
    const orderItems = await this.orderItems.find({ where: { orderId } });
    const itemIds = new Set(orderItems.map((item) => item.id));
    const seen = new Set<string>();
    const normalized = lines.map((line) => {
      if (!line || typeof line.orderItemId !== 'string' || !itemIds.has(line.orderItemId) || seen.has(line.orderItemId)) {
        throw new BadRequestException('Each measured line must reference a unique item in this order');
      }
      seen.add(line.orderItemId);
      if (!Number.isFinite(line.actualQuantity) || line.actualQuantity <= 0) throw new BadRequestException('Measured quantity must be positive');
      if (typeof line.unit !== 'string' || line.unit.trim().length === 0) throw new BadRequestException('Measured market unit is required');
      if (line.actualPricePesewas !== undefined && (!Number.isInteger(line.actualPricePesewas) || line.actualPricePesewas < 0)) {
        throw new BadRequestException('Measured price must be a non-negative integer in pesewas');
      }
      return {
        orderItemId: line.orderItemId,
        actualQuantity: line.actualQuantity,
        unit: line.unit.trim(),
        actualPricePesewas: line.actualPricePesewas ?? null,
        note: line.note?.trim() || null,
      };
    });
    order.marketFulfillmentJson = { recordedAt: new Date().toISOString(), lines: normalized };
    await this.orders.save(order);
    await this.recordEvent(order.id, order.status, order.status, `vendor:${user.sub}`, { marketFulfillmentRecorded: true });
    return this.getOrder(order.id);
  }

  async updateLaundryStage(user: JwtPayload, orderId: string, stage: string): Promise<OrderStatusDto> {
    const order = await this.forVendor(user, orderId);
    if (order.vendorType !== 'LAUNDRY' && order.serviceCode !== 'LD') throw new BadRequestException('Laundry stages are only available for laundry orders');
    const normalized = stage.trim().toUpperCase();
    const transitions: Record<string, string[]> = {
      AWAITING_COLLECTION: ['COLLECTED'],
      COLLECTED: ['SORTING'],
      SORTING: ['WASHING'],
      WASHING: ['DRYING'],
      DRYING: ['QUALITY_CHECK'],
      QUALITY_CHECK: ['READY_FOR_RETURN'],
      READY_FOR_RETURN: ['RETURNED'],
      RETURNED: [],
    };
    if (!Object.prototype.hasOwnProperty.call(transitions, normalized)) throw new BadRequestException('Unknown laundry stage');
    const currentStage = order.laundryStage ?? 'AWAITING_COLLECTION';
    if (currentStage !== normalized && !transitions[currentStage]?.includes(normalized)) {
      throw new ConflictException(`Laundry stage cannot move from ${currentStage} to ${normalized}`);
    }
    if (normalized === 'COLLECTED' && currentStage === 'AWAITING_COLLECTION' && order.status !== OrderStatus.OUT_FOR_DELIVERY) {
      throw new ConflictException('Laundry becomes COLLECTED only after the Rider completes the Vendor handoff');
    }
    if ([OrderStatus.CANCELLED, OrderStatus.REJECTED, OrderStatus.FAILED_DELIVERY].includes(order.status)) throw new ConflictException(`Laundry stage cannot change in state ${order.status}`);
    order.laundryStage = normalized;
    await this.orders.save(order);
    await this.recordEvent(order.id, order.status, order.status, `vendor:${user.sub}`, { laundryStage: normalized });
    if (normalized === 'READY_FOR_RETURN' && order.status === OrderStatus.OUT_FOR_DELIVERY) {
      await this.transition(order.id, OrderStatus.READY_FOR_PICKUP, `vendor:${user.sub}`, { laundryReturnReady: true });
      await this.bus.publish(EVENTS.ORDER_READY_FOR_PICKUP, {
        orderId: order.id,
        checkoutId: order.checkoutId,
        status: OrderStatus.READY_FOR_PICKUP,
        vendorId: order.vendorId,
        customerId: order.customerId,
        paymentMethod: order.paymentMethod,
        amountPesewas: order.totalPesewas,
        laundryReturnReady: true,
      });
    }
    return this.getOrder(order.id);
  }

  private assertLaundryConditionWindow(order: Order): void {
    if (order.vendorType !== 'LAUNDRY' && order.serviceCode !== 'LD') {
      throw new BadRequestException('Condition logs are only available for laundry orders');
    }
    if (![OrderStatus.CONFIRMED, OrderStatus.ACCEPTED, OrderStatus.PREPARING].includes(order.status)) {
      throw new ConflictException(`Condition cannot be recorded in state ${order.status}`);
    }
  }

  // ── Rider delivery proof (photo is optional when customer OTP is used) ──
  async uploadDeliveryProof(
    riderId: string,
    orderId: string,
    photoBase64: string,
    contentType = 'image/jpeg',
  ): Promise<{ orderId: string; proofKey: string }> {
    const order = await this.orders.findOne({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');
    if (order.riderId !== riderId) throw new ForbiddenException('Not your assigned order');
    if (![OrderStatus.PICKED_UP, OrderStatus.OUT_FOR_DELIVERY].includes(order.status)) {
      throw new ConflictException(`Delivery proof is not allowed in state ${order.status}`);
    }
    if (!['image/jpeg', 'image/jpg', 'image/png'].includes(contentType.toLowerCase())) {
      throw new BadRequestException('Delivery proof must be a JPEG or PNG image');
    }

    const encoded = photoBase64
      .replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/i, '')
      .replace(/\s/g, '');
    if (!/^[A-Za-z0-9+/]*={0,2}$/.test(encoded) || encoded.length % 4 !== 0) {
      throw new BadRequestException('Delivery proof must be valid Base64');
    }
    const bytes = Buffer.from(encoded, 'base64');
    if (bytes.length === 0 || bytes.length > 2 * 1024 * 1024) {
      throw new BadRequestException('Delivery proof must be between 1 byte and 2 MB');
    }
    const isPng = contentType.toLowerCase().includes('png');
    const hasPngSignature = bytes.length >= 8 &&
      bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    const hasJpegSignature = bytes.length >= 3 &&
      bytes.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]));
    if ((isPng && !hasPngSignature) || (!isPng && !hasJpegSignature)) {
      throw new BadRequestException('Delivery proof bytes do not match the declared image type');
    }

    const extension = isPng ? 'png' : 'jpg';
    const proofKey = storageKeyFor('delivery-proof', orderId, `proof.${extension}`);
    await this.storage.putObject(proofKey, bytes, contentType);
    order.deliveryProofKey = proofKey;
    order.deliveryProofContentType = contentType;
    await this.orders.save(order);
    await this.recordEvent(order.id, order.status, order.status, `rider:${riderId}`, { deliveryProof: true });
    return { orderId, proofKey };
  }

  async uploadDeliverySignature(
    riderId: string,
    orderId: string,
    signatureBase64: string,
    contentType = 'image/png',
  ): Promise<{ orderId: string; signatureKey: string }> {
    const order = await this.orders.findOne({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');
    if (order.riderId !== riderId) throw new ForbiddenException('Not your assigned order');
    if (![OrderStatus.PICKED_UP, OrderStatus.OUT_FOR_DELIVERY].includes(order.status)) {
      throw new ConflictException(`Delivery signature is not allowed in state ${order.status}`);
    }
    const encoded = signatureBase64.replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/i, '').replace(/\s/g, '');
    if (!/^[A-Za-z0-9+/]*={0,2}$/.test(encoded) || encoded.length % 4 !== 0) {
      throw new BadRequestException('Delivery signature must be valid Base64');
    }
    const bytes = Buffer.from(encoded, 'base64');
    if (bytes.length === 0 || bytes.length > 2 * 1024 * 1024) {
      throw new BadRequestException('Delivery signature must be between 1 byte and 2 MB');
    }
    const key = storageKeyFor('delivery-signature', orderId, 'signature.png');
    await this.storage.putObject(key, bytes, contentType);
    order.deliverySignatureKey = key;
    order.deliverySignatureContentType = contentType;
    await this.orders.save(order);
    await this.recordEvent(order.id, order.status, order.status, `rider:${riderId}`, { deliverySignature: true });
    return { orderId, signatureKey: key };
  }

  async getDeliveryProof(
    orderId: string,
    viewer: JwtPayload,
    riderId?: string,
  ): Promise<{ contentType: string; dataBase64?: string; downloadUrl?: string }> {
    const order = await this.orders.findOne({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');
    const canView = viewer.role === Role.ADMIN ||
      (viewer.role === Role.RIDER && riderId != null && order.riderId === riderId) ||
      (viewer.role === Role.CUSTOMER && order.customerId === viewer.sub);
    if (!canView) throw new ForbiddenException('Not allowed to view delivery proof');
    if (!order.deliveryProofKey || !order.deliveryProofContentType) {
      throw new NotFoundException('Delivery proof has not been uploaded');
    }

    if (this.storage instanceof LocalStorageDriver) {
      return {
        contentType: order.deliveryProofContentType,
        dataBase64: this.storage.readObject(order.deliveryProofKey).toString('base64'),
      };
    }

    return {
      contentType: order.deliveryProofContentType,
      downloadUrl: await this.storage.createPresignedDownload(order.deliveryProofKey),
    };
  }

  async uploadPrescription(
    customerId: string,
    orderId: string,
    dataBase64: string,
    contentType: string,
  ): Promise<{ orderId: string; status: string }> {
    const order = await this.orders.findOne({ where: { id: orderId, customerId } });
    if (!order) throw new NotFoundException('Order not found');
    const items = await this.orderItems.find({ where: { orderId } });
    if (!items.some((item) => item.prescriptionOnly)) {
      throw new BadRequestException('This order does not require a prescription');
    }
    const normalizedContentType = contentType.trim().toLowerCase();
    if (!['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'].includes(normalizedContentType)) {
      throw new BadRequestException('Prescription must be a JPEG, PNG, or PDF');
    }
    const encoded = dataBase64.replace(/^data:[^;]+;base64,/i, '').replace(/\s/g, '');
    if (!/^[A-Za-z0-9+/]*={0,2}$/.test(encoded) || encoded.length % 4 !== 0) {
      throw new BadRequestException('Prescription must be valid Base64');
    }
    const bytes = Buffer.from(encoded, 'base64');
    if (bytes.length === 0 || bytes.length > 10 * 1024 * 1024) {
      throw new BadRequestException('Prescription must be between 1 byte and 10 MB');
    }
    const extension = normalizedContentType === 'application/pdf'
      ? 'pdf'
      : normalizedContentType.includes('png') ? 'png' : 'jpg';
    const key = storageKeyFor('prescriptions', orderId, `prescription.${extension}`);
    await this.storage.putObject(key, bytes, normalizedContentType);
    order.prescriptionKey = key;
    order.prescriptionContentType = normalizedContentType;
    order.prescriptionStatus = 'SUBMITTED';
    order.prescriptionReviewNote = null;
    await this.orders.save(order);
    return { orderId, status: order.prescriptionStatus };
  }

  async getPrescription(
    orderId: string,
    viewer: JwtPayload,
  ): Promise<{ contentType: string; dataBase64?: string; downloadUrl?: string }> {
    const order = await this.orders.findOne({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');
    const allowed = viewer.role === Role.ADMIN ||
      (viewer.role === Role.CUSTOMER && viewer.sub === order.customerId) ||
      (viewer.role === Role.VENDOR && await this.vendorOwns(viewer.sub, order.vendorId));
    if (!allowed) throw new ForbiddenException('Not allowed to view prescription');
    if (!order.prescriptionKey || !order.prescriptionContentType) throw new NotFoundException('Prescription has not been uploaded');
    if (this.storage instanceof LocalStorageDriver) {
      return { contentType: order.prescriptionContentType, dataBase64: this.storage.readObject(order.prescriptionKey).toString('base64') };
    }
    return { contentType: order.prescriptionContentType, downloadUrl: await this.storage.createPresignedDownload(order.prescriptionKey) };
  }

  async reviewPrescription(
    user: JwtPayload,
    orderId: string,
    approved: boolean,
    note?: string,
  ): Promise<OrderStatusDto> {
    const order = await this.forVendor(user, orderId);
    if (order.prescriptionStatus !== 'SUBMITTED') throw new ConflictException(`Prescription is ${order.prescriptionStatus}`);
    order.prescriptionStatus = approved ? 'APPROVED' : 'REJECTED';
    order.prescriptionReviewNote = note?.trim() || null;
    await this.orders.save(order);
    return this.getOrder(order.id);
  }

  // ── Rider OTP confirmation (G21/G20) ──────────────────────────────
  @Transaction()
  async confirmOtp(riderId: string, orderId: string, otp: string, riderLat: number, riderLng: number): Promise<OrderStatusDto> {
    const order = await this.orders.findOne({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');
    if (order.riderId !== riderId) throw new ForbiddenException('Not your assigned order');
    // step through the machine with FRESH reads each iteration — event ordering is not
    // guaranteed (G33) and dispatch events can lag, especially on grouped/batched tasks
    await this.stepToOutForDelivery(orderId);
    const current = await this.orders.findOneOrFail({ where: { id: orderId } });
    if (current.status !== OrderStatus.OUT_FOR_DELIVERY) {
      throw new ConflictException(`OTP only valid while delivering (state: ${current.status})`);
    }

    const zone = loadZone();
    const drop = current.addressJson;
    if (!withinM({ lat: riderLat, lng: riderLng }, { lat: drop.lat, lng: drop.lng }, zone.config.dropGeofenceM)) {
      throw new BadRequestException(`You must be within ${zone.config.dropGeofenceM}m of the delivery address`);
    }
    if (!current.otpHash || current.otpAttempts >= 5) throw new BadRequestException('OTP locked — contact support');

    if (current.otpHash !== hash(otp)) {
      current.otpAttempts += 1;
      await this.orders.save(current);
      await this.recordEvent(current.id, current.status, current.status, `rider:${riderId}`, { otpAttempt: current.otpAttempts });
      throw new BadRequestException('Incorrect OTP');
    }

    await this.transition(current.id, OrderStatus.OTP_VERIFIED, `rider:${riderId}`);
    await this.transition(current.id, OrderStatus.DELIVERED, `rider:${riderId}`);
    const delivered = await this.orders.findOneOrFail({ where: { id: orderId } });
    if ((delivered.vendorType === 'LAUNDRY' || delivered.serviceCode === 'LD') && delivered.laundryStage === 'READY_FOR_RETURN') {
      delivered.laundryStage = 'RETURNED';
      await this.orders.save(delivered);
    }
    if (delivered.parcelJson) {
      delivered.parcelJson.parcelStatus = 'DELIVERED';
      delivered.parcelJson.deliveredAt = new Date().toISOString();
      await this.orders.save(delivered);
    }
    await this.bus.publish(EVENTS.ORDER_DELIVERED, { orderId: delivered.id, checkoutId: delivered.checkoutId, status: OrderStatus.DELIVERED, vendorId: delivered.vendorId, customerId: delivered.customerId, paymentMethod: delivered.paymentMethod, amountPesewas: delivered.totalPesewas });
    return this.getOrder(delivered.id);
  }

  // ── Reads ─────────────────────────────────────────────────────────
  async getOrder(
    orderId: string,
    viewer?: JwtPayload,
    viewerRiderId?: string,
  ): Promise<OrderStatusDto> {
    const order = await this.orders.findOne({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');
    if (viewer?.role === Role.VENDOR && !(await this.vendorOwns(viewer.sub, order.vendorId))) {
      throw new ForbiddenException('Not your order');
    }
    if (viewer) this.assertViewer(order, viewer, viewerRiderId);
    return this.toDto(order);
  }

  async orderAddressHistory(orderId: string, viewer: JwtPayload, viewerRiderId?: string): Promise<OrderAddressAudit[]> {
    const order = await this.orders.findOne({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');
    if (viewer.role === Role.VENDOR && !(await this.vendorOwns(viewer.sub, order.vendorId))) {
      throw new ForbiddenException('Not your order');
    }
    this.assertViewer(order, viewer, viewerRiderId);
    return this.addressAudits.find({ where: { orderId }, order: { createdAt: 'ASC' } });
  }

  async correctOrderAddress(
    orderId: string,
    actor: JwtPayload,
    address: DeliveryAddressDto,
    reason: string,
    source = 'SUPPORT_CORRECTION',
  ): Promise<OrderStatusDto> {
    const order = await this.orders.findOne({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');
    if (!['CONFIRMED', 'ACCEPTED', 'PREPARING', 'READY_FOR_PICKUP', 'WAITING_FOR_RIDER', 'RIDER_ASSIGNED', 'RIDER_EN_ROUTE_TO_VENDOR', 'RIDER_AT_VENDOR'].includes(order.status)) {
      throw new ConflictException(`Delivery address cannot be corrected while order is ${order.status}`);
    }
    const before = order.addressJson;
    order.addressJson = { ...address, source, confirmedAt: address.confirmedAt ?? new Date().toISOString(), confirmationSource: address.confirmationSource ?? source };
    await this.orders.save(order);
    await this.recordAddressAudit(order.id, 'SUPPORT_CORRECTION', before, order.addressJson, source, actor.role, actor.sub, reason);
    await this.recordEvent(order.id, order.status, order.status, `admin:${actor.sub}`, { addressCorrected: true, reason, source });
    await this.bus.publish(EVENTS.ORDER_ADDRESS_CORRECTED, { orderId: order.id, checkoutId: order.checkoutId, status: order.status, vendorId: order.vendorId, customerId: order.customerId, addressCorrected: true });
    return this.getOrder(order.id);
  }

  async customerOrders(customerId: string, limit?: number): Promise<OrderStatusDto[]> {
    const take = Math.min(Number.isFinite(limit) ? limit! : 50, 50);
    const orders = await this.orders.find({ where: { customerId }, order: { createdAt: 'DESC' }, take });
    return Promise.all(orders.map((o) => this.toDto(o)));
  }

  async riderOrders(riderId: string): Promise<OrderStatusDto[]> {
    // This endpoint feeds the rider's history tab. Active work is restored
    // through Dispatch, and cancelled/incomplete rows do not have a
    // completedAt value required by the history contract.
    const orders = await this.orders.find({
      where: { riderId, status: OrderStatus.DELIVERED },
      order: { deliveredAt: 'DESC' },
      take: 100,
    });
    return Promise.all(orders.map((o) => this.toDto(o)));
  }

  async vendorOrders(user: JwtPayload, vendorId: string, status?: OrderStatus, query?: string, from?: string, to?: string): Promise<OrderStatusDto[]> {
    if (user.role !== Role.ADMIN && !(await this.vendorOwns(user.sub, vendorId))) {
      throw new ForbiddenException('Not your vendor');
    }
    return this.vendorOrdersForInternal(vendorId, status, query, from, to);
  }

  async vendorOrdersForInternal(vendorId: string, status?: OrderStatus, query?: string, from?: string, to?: string): Promise<OrderStatusDto[]> {
    const where = status ? { vendorId, status } : { vendorId };
    const orders = await this.orders.find({ where, order: { createdAt: 'DESC' }, take: 250 });
    const normalizedQuery = query?.trim().toLowerCase();
    const fromDate = from ? new Date(from) : null;
    const toDate = to ? new Date(to) : null;
    if (fromDate && Number.isNaN(fromDate.getTime())) throw new BadRequestException('Order from date is invalid');
    if (toDate && Number.isNaN(toDate.getTime())) throw new BadRequestException('Order to date is invalid');
    if (fromDate && toDate && fromDate > toDate) throw new BadRequestException('Order from date must be before the to date');
    const filtered = orders.filter((order) => {
      if (fromDate && order.createdAt < fromDate) return false;
      if (toDate && order.createdAt > toDate) return false;
      if (!normalizedQuery) return true;
      return [order.ref, order.id, order.customerPhone ?? '', order.note ?? ''].some((value) => value.toLowerCase().includes(normalizedQuery));
    });
    return Promise.all(filtered.map((o) => this.toDto(o)));
  }

  async reportIssue(user: JwtPayload, orderId: string, category: string, note?: string): Promise<OrderIssue> {
    const order = await this.orders.findOne({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');
    const vendorAllowed = user.role === Role.VENDOR && await this.vendorOwns(user.sub, order.vendorId);
    const customerAllowed = user.role === Role.CUSTOMER && user.sub === order.customerId;
    if (!vendorAllowed && !customerAllowed && user.role !== Role.ADMIN) throw new ForbiddenException('Not allowed to report an issue for this order');
    if (!category.trim()) throw new BadRequestException('Issue category is required');
    return this.issues.save(this.issues.create({
      orderId,
      vendorId: order.vendorId,
      reporterUserId: user.sub,
      category: category.trim(),
      note: note?.trim() || null,
      status: 'OPEN',
    }));
  }

  async listIssues(user: JwtPayload, orderId: string): Promise<OrderIssue[]> {
    const order = await this.orders.findOne({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');
    const vendorAllowed = user.role === Role.VENDOR && await this.vendorOwns(user.sub, order.vendorId);
    const customerAllowed = user.role === Role.CUSTOMER && user.sub === order.customerId;
    if (!vendorAllowed && !customerAllowed && user.role !== Role.ADMIN) throw new ForbiddenException('Not allowed to view order issues');
    return this.issues.find({ where: { orderId }, order: { createdAt: 'DESC' } });
  }

  async resolveIssue(user: JwtPayload, orderId: string, issueId: string, status: string, note?: string): Promise<OrderIssue> {
    const order = await this.orders.findOne({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');
    const issue = await this.issues.findOne({ where: { id: issueId, orderId, vendorId: order.vendorId } });
    if (!issue) throw new NotFoundException('Order issue not found');
    const normalized = status.trim().toUpperCase();
    if (!['ACKNOWLEDGED', 'RESOLVED', 'REJECTED'].includes(normalized)) throw new BadRequestException('Issue status must be ACKNOWLEDGED, RESOLVED or REJECTED');
    const vendorAllowed = user.role === Role.VENDOR && await this.vendorOwns(user.sub, order.vendorId);
    if (!vendorAllowed && user.role !== Role.ADMIN) throw new ForbiddenException('Only the owning Vendor or Operations can resolve this issue');
    if (user.role === Role.VENDOR && normalized !== 'ACKNOWLEDGED') throw new ForbiddenException('Vendor can acknowledge an issue; Operations must resolve or reject it');
    issue.status = normalized;
    issue.resolutionNote = note?.trim() || null;
    issue.resolvedBy = user.sub;
    issue.resolvedAt = new Date();
    return this.issues.save(issue);
  }

  async ordersByCheckout(checkoutId: string): Promise<Order[]> {
    return this.orders.find({ where: { checkoutId } });
  }

  async findOrderByRef(ref: string): Promise<Order> {
    const order = await this.orders.findOne({ where: { ref } });
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  /** Remove a snapshot discount when Catalog cannot redeem the campaign. Pre-accept only. */
  async clearPromotion(orderId: string): Promise<{ orderId: string; totalPesewas: number; vendorSharePesewas: number }> {
    const order = await this.orders.findOne({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');
    if (![OrderStatus.PENDING_PAYMENT, OrderStatus.CONFIRMED, OrderStatus.AWAITING_RECIPIENT].includes(order.status)) {
      throw new ConflictException(`Cannot clear a promotion in state ${order.status}`);
    }
    const discount = order.promotionDiscountPesewas ?? 0;
    if (discount <= 0) {
      return { orderId: order.id, totalPesewas: order.totalPesewas, vendorSharePesewas: order.vendorSharePesewas };
    }
    order.totalPesewas += discount;
    order.vendorSharePesewas += discount;
    order.promotionId = null;
    order.promotionTitle = null;
    order.promotionDiscountPesewas = 0;
    await this.orders.save(order);
    await this.recordEvent(order.id, order.status, order.status, 'system', { promotionCleared: true, discountPesewas: discount });
    return { orderId: order.id, totalPesewas: order.totalPesewas, vendorSharePesewas: order.vendorSharePesewas };
  }

  /** Dispatch persists the distance-based rider payout (doc §2.4.2) and optional funded peak pay. */
  /**
   * Record what a dispatch leg costs.
   *
   * `accumulate` adds to the running total instead of replacing it. Multi-leg orders — laundry
   * (collection + return) and any reassignment after pickup — dispatch more than once, and each
   * leg is separately owed to a different rider. Overwriting made the order look cheaper than it
   * was and, because the ledger credited from this field, left the earlier rider unpaid.
   *
   * The per-rider split lives on `dispatch.assignment`; this is the order-level total the tax
   * engine withholds against.
   */
  async setRiderFee(orderId: string, riderFeePesewas: number, peakPayPesewas = 0, accumulate = false): Promise<void> {
    const order = await this.orders.findOne({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');
    const fee = Math.max(0, Math.trunc(riderFeePesewas));
    const peak = Math.max(0, Math.trunc(peakPayPesewas));
    order.riderFeePesewas = accumulate ? (order.riderFeePesewas ?? 0) + fee : fee;
    order.peakPayPesewas = accumulate ? (order.peakPayPesewas ?? 0) + peak : peak;
    await this.orders.save(order);
  }

  /** Raw entity for internal consumers (dispatch, ledger). */
  async getRaw(orderId: string): Promise<Order & { items: OrderItem[] }> {
    const order = await this.orders.findOne({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');
    const items = await this.orderItems.find({ where: { orderId }, order: { createdAt: 'ASC' } });
    // Internal consumers such as Dispatch need the immutable item snapshots to
    // render a real Rider task. This remains an internal route and does not
    // broaden the authenticated Customer/Vendor DTOs.
    const { otpCipher: _otpCipher, otpHash: _otpHash, ...safe } = order;
    return Object.assign(safe, { items }) as Order & { items: OrderItem[] };
  }

  /** doc §2 grouping: orders ready for pickup (or waiting for rider) that can join a shared dispatch. */
  async readyForDispatch(): Promise<Order[]> {
    const rows = await this.orders.find({
      where: [
        { status: OrderStatus.READY_FOR_PICKUP },
        { status: OrderStatus.WAITING_FOR_RIDER },
      ],
      take: 50,
    });
    return this.dispatchWindow(rows);
  }

  /** Dispatch Matching Engine candidate feed.
   * Includes ready orders plus accepted/preparing orders whose countdown can be evaluated
   * against the 10-minute grouping rule by Dispatch. */
  async dispatchCandidates(): Promise<Order[]> {
    const rows = await this.orders.find({
      where: [
        { status: OrderStatus.READY_FOR_PICKUP },
        { status: OrderStatus.WAITING_FOR_RIDER },
        { status: OrderStatus.PREPARING },
        { status: OrderStatus.ACCEPTED },
      ],
      take: 100,
    });
    return this.dispatchWindow(rows);
  }

  private dispatchWindow(rows: Order[]): Order[] {
    const leadMs = loadZone().config.dispatchLeadMin * 60_000;
    const now = Date.now();
    return rows.filter((order) => !order.scheduledFor || order.scheduledFor.getTime() - leadMs <= now);
  }

  /**
   * Per-dialect SQL that pulls the address `label` out of the simple-json `addressJson`
   * text column. The old single expression used SQLite-only json_valid/json_extract,
   * which do not exist in Postgres, so this endpoint 500'd in production (audit F-BUG-14).
   */
  private cityExtractExpr(): string {
    if (this.env.dbType === 'postgres') {
      // text → jsonb, then extract the label path; NULL-safe for empty values.
      return "MAX(NULLIF(o.addressJson::jsonb #>> '{label}', ''))";
    }
    return "MAX(CASE WHEN json_valid(o.addressJson) THEN json_extract(o.addressJson, '$.label') END)";
  }

  /**
   * Internal, privacy-safe marketing aggregates — one row per customer.
   *
   * Marketing segments live in the notification service, but *who ordered what and when* is
   * order data, so it is computed here and read across the internal boundary. This endpoint
   * deliberately returns no name, phone, or address: a segment needs a user id and some
   * numbers, and `marketing.pii.export` is `-` for every role. Handing the notification
   * service a raw order dump would be a PII export wearing a segment's clothes.
   *
   * Only DELIVERED orders count. A cancelled or failed order is not evidence of a customer,
   * and counting it would put people who had a bad experience into a "reward your loyal
   * customers" campaign.
   */
  async marketingAggregates(): Promise<Array<{
    customerId: string;
    orderCount: number;
    lastOrderAt: string | null;
    totalSpentPesewas: number;
    city: string | null;
    topVendorId: string | null;
  }>> {
    // Aggregated in SQL. This is the marketing audience feed: it used to load every
    // delivered order in the platform into memory, which grows forever.
    const grouped = await this.orders
      .createQueryBuilder('o')
      .select('o.customerId', 'customerId')
      .addSelect('COUNT(1)', 'orderCount')
      .addSelect('MAX(o.createdAt)', 'lastOrderAt')
      .addSelect(
        'SUM(COALESCE(o.subtotalPesewas, 0) + COALESCE(o.deliveryFeePesewas, 0) + COALESCE(o.serviceFeePesewas, 0))',
        'totalSpentPesewas',
      )
      // addressJson is a simple-json text column; label is the only part we expose.
      // JSON functions are dialect-specific: json_valid/json_extract are SQLite-only and
      // do not exist in Postgres, so this 500'd in production (audit F-BUG-14). Branch on
      // dbType — same shape, per-dialect JSON extraction.
      .addSelect(this.cityExtractExpr(), 'city')
      .where('o.status = :status', { status: OrderStatus.DELIVERED })
      .groupBy('o.customerId')
      .getRawMany<{
        customerId: string;
        orderCount: string | number;
        lastOrderAt: string | Date | null;
        totalSpentPesewas: string | number | null;
        city: string | null;
      }>();

    // Most-used vendor per customer, resolved in the DB rather than in memory.
    const vendorCounts = await this.orders
      .createQueryBuilder('o')
      .select('o.customerId', 'customerId')
      .addSelect('o.vendorId', 'vendorId')
      .addSelect('COUNT(1)', 'uses')
      .where('o.status = :status AND o.vendorId IS NOT NULL', { status: OrderStatus.DELIVERED })
      .groupBy('o.customerId')
      .addGroupBy('o.vendorId')
      .getRawMany<{ customerId: string; vendorId: string; uses: string | number }>();
    const topVendor = new Map<string, { vendorId: string; uses: number }>();
    for (const v of vendorCounts) {
      const uses = Number(v.uses);
      const cur = topVendor.get(v.customerId);
      if (!cur || uses > cur.uses) topVendor.set(v.customerId, { vendorId: v.vendorId, uses });
    }

    return grouped.map((g) => {
      const last = g.lastOrderAt ? new Date(g.lastOrderAt as string | Date) : null;
      return {
        customerId: g.customerId,
        orderCount: Number(g.orderCount),
        lastOrderAt: last ? last.toISOString() : null,
        totalSpentPesewas: Number(g.totalSpentPesewas ?? 0),
        city: g.city ?? null,
        topVendorId: topVendor.get(g.customerId)?.vendorId ?? null,
      };
    });
  }

  /** Internal, privacy-safe demand feed for Dispatch positioning recommendations. */
  async demandOrders(fromIso?: string, toIso?: string): Promise<Array<{
    orderId: string;
    vendorId: string;
    vendorName: string;
    vendorType: string;
    serviceCode: string;
    status: string;
    createdAt: string;
    pickup: { locationId: string | null; name: string; address: string | null; lat: number; lng: number } | null;
  }>> {
    const now = new Date();
    const defaultFrom = new Date(now.getTime() - 60 * 60_000);
    const from = fromIso ? new Date(fromIso) : defaultFrom;
    const to = toIso ? new Date(toIso) : now;
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from > to) {
      throw new BadRequestException('Demand time window is invalid');
    }
    const rows = await this.orders.find({
      where: { createdAt: Between(from, to) },
      order: { createdAt: 'DESC' },
      take: 1000,
    });
    return rows.map((order) => ({
      orderId: order.id,
      vendorId: order.vendorId,
      vendorName: order.vendorName,
      vendorType: order.vendorType,
      serviceCode: order.serviceCode,
      status: order.status,
      createdAt: order.createdAt.toISOString(),
      pickup: order.pickupJson,
    }));
  }

  // ── Gift / order-for-someone (doc §3 Case 2) ─────────────────────
  /** Recipient confirms the drop location via the guest link → the order begins.
   *  Prepaid: escrow/charge is initialized now (the sender pays after the recipient
   *  confirms — receiver never guesses the location). COD: straight to CONFIRMED. */
  @Transaction()
  async confirmGiftLocation(token: string, address: DeliveryAddressDto): Promise<OrderStatusDto> {
    if (!/^[a-f0-9]{16,64}$/i.test(token)) throw new NotFoundException('Gift link invalid or already used');
    const match = await this.orders.findOne({ where: { giftToken: token.toLowerCase(), status: OrderStatus.AWAITING_RECIPIENT } });
    if (!match || match.recipientJson?.token !== token.toLowerCase()) throw new NotFoundException('Gift link invalid or already used');
    const gift = match.recipientJson!;
    gift.status = 'CONFIRMED';
    gift.confirmedAt = new Date().toISOString();
    gift.address = { ...address, confirmedAt: address.confirmedAt ?? gift.confirmedAt, confirmationSource: address.confirmationSource ?? 'RECIPIENT_LINK' };
    match.recipientJson = gift;
    const beforeAddress = match.addressJson;
    match.addressJson = { ...address, source: address.source ?? 'RECIPIENT', confirmedAt: address.confirmedAt ?? gift.confirmedAt, confirmationSource: address.confirmationSource ?? 'RECIPIENT_LINK' };
    // A gift order has no payment-webhook path that issues an OTP (confirmOnPayment is
    // only reached via PENDING_PAYMENT), so issue the delivery OTP here — otherwise the
    // picked-up SMS reveal fails with "No OTP issued for this order yet".
    if (!match.otpHash) {
      const otp = this.makeOtp();
      match.otpHash = otp.hash;
      match.otpCipher = encryptOtp(otp.plain);
    }
    await this.orders.save(match);
    await this.recordAddressAudit(match.id, 'RECIPIENT_CONFIRMED', beforeAddress, match.addressJson, match.addressJson.source, 'recipient', null, 'Gift recipient confirmed drop location');

    if (match.paymentMethod === PaymentMethod.COD) {
      await this.transition(match.id, OrderStatus.CONFIRMED, 'recipient');
      await this.bus.publish(EVENTS.ORDER_CONFIRMED, { orderId: match.id, checkoutId: match.checkoutId, status: OrderStatus.CONFIRMED, vendorId: match.vendorId, customerId: match.customerId, paymentMethod: match.paymentMethod, amountPesewas: match.totalPesewas, orderType: match.orderType });
      const ownerUserId = await this.vendorOwnerUserId(match.vendorId);
      if (ownerUserId) {
        await this.notify.sendPush({ userId: ownerUserId, title: 'New order', body: `New order ${match.ref} — accept it now.` });
      }
      return this.getOrder(match.id);
    }

    // prepaid: recipient confirmed → charge the sender (Paystack), order waits for the webhook
    await this.transition(match.id, OrderStatus.PENDING_PAYMENT, 'recipient');
    const res = await internalFetch(`${serviceUrl('payment')}/internal/payments/initialize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        checkoutId: match.checkoutId,
        amountPesewas: match.totalPesewas,
        phone: match.customerPhone ?? '',
        allocations: [{ orderId: match.id, allocatedPesewas: match.totalPesewas }],
      }),
    });
    let paymentRef: string | null = null;
    if (res.ok) {
      const payment = (await res.json()) as { reference: string };
      paymentRef = payment.reference;
      await this.notify.sendPush({ userId: match.customerId, title: 'Recipient confirmed — pay to begin', body: `Your gift to ${gift.name} is confirmed. Complete payment to start the order.`, data: { orderId: match.id } });
    }
    const dto = await this.getOrder(match.id);
    return { ...dto, paymentReference: paymentRef } as OrderStatusDto & { paymentReference: string | null };
  }

  // ── Errands (doc §Errands) ────────────────────────────────────────
  /** Create a task-based errand order: budget + fees held in escrow before any rider shops. */
  async createErrand(customerId: string, phone: string, dto: CreateErrandDto) {
    const zone = loadZone();
    if (!isPointInZone({ lat: dto.shopLat, lng: dto.shopLng }, zone)) {
      throw new BadRequestException('Errand shop is outside the Cape Coast zone');
    }
    if (!isPointInZone({ lat: dto.address.lat, lng: dto.address.lng }, zone)) {
      throw new BadRequestException('Delivery address is outside the Cape Coast zone');
    }
    const checkoutId = crypto.randomUUID();
    const ref = await this.nextOrderRef('ER');
    const feePolicy = feePolicyFromEnv(this.env.rawEnv);
    const dKm = distanceKm({ lat: dto.shopLat, lng: dto.shopLng }, { lat: dto.address.lat, lng: dto.address.lng });
    const deliveryFee = customerDeliveryFee(feePolicy, dKm, 'ERRAND', { serviceLevel: dto.serviceLevel ?? 'STANDARD' });
    const errandFee = this.env.errandFeePesewas;
    const total = dto.budgetPesewas + errandFee + deliveryFee;

    const order = await this.orders.save(
      this.orders.create({
        ref,
        checkoutId,
        orderType: OrderType.ERRAND,
        vendorId: 'ERRAND',
        vendorName: 'Errand',
        vendorType: 'ERRAND',
        serviceCode: 'ER',
        serviceLevel: dto.serviceLevel ?? 'STANDARD',
        feePolicyVersion: feePolicy.version,
        commissionBps: 0,
        customerId,
        paymentMethod: PaymentMethod.PREPAID,
        status: OrderStatus.PENDING_PAYMENT,
        addressJson: dto.address,
        prepTimeMin: 0,
        subtotalPesewas: 0,
        deliveryFeePesewas: deliveryFee,
        serviceFeePesewas: errandFee,
        platformFeePesewas: 0,
        vendorSharePesewas: 0,
        // Fulfilment fee is separate from the customer delivery fee and is set by Dispatch from pickup+delivery distances.
        riderFeePesewas: 0,
        totalPesewas: total,
        note: dto.note ?? null,
        errandJson: {
          task: dto.task,
          shopName: dto.shopName ?? null,
          shopLat: dto.shopLat,
          shopLng: dto.shopLng,
          budgetPesewas: dto.budgetPesewas,
          escrowPesewas: total,
          errandStatus: ErrandStatus.AWAITING_PAYMENT,
          spentPesewas: 0,
          receipts: [],
          substitution: null,
          trustTier: null,
          compensationPesewas: 0,
          shoppedAt: null,
          purchasedAt: null,
        },
      }),
    );
    await this.scheduler.schedule('payment-timeout', { orderId: order.id }, zone.config.paymentTimeoutMin * 60_000, JOB_PAYMENT_TIMEOUT(checkoutId, order.id));

    // escrow charge — one Paystack payment for the full errand value (webhook = truth)
    const res = await internalFetch(`${serviceUrl('payment')}/internal/payments/initialize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        checkoutId,
        amountPesewas: total,
        phone,
        allocations: [{ orderId: order.id, allocatedPesewas: total }],
      }),
    });
    if (!res.ok) throw new BadRequestException('Could not initialize errand payment');
    const payment = (await res.json()) as { reference: string; paystackUrl: string | null; mode: string };

    await this.recordEvent(order.id, null, order.status, 'system', { ref, errand: true });
    await this.recordAddressAudit(order.id, 'SNAPSHOT', null, order.addressJson, 'errand_checkout', 'system', null, 'Errand delivery-location snapshot');
    await this.bus.publish(EVENTS.ORDER_CREATED, { orderId: order.id, checkoutId, status: order.status, vendorId: order.vendorId, customerId, paymentMethod: order.paymentMethod, amountPesewas: total });
    return { orderId: order.id, ref, escrowPesewas: total, budgetPesewas: dto.budgetPesewas, errandFeePesewas: errandFee, deliveryFeePesewas: deliveryFee, payment };
  }

  /** Create a prepaid request-only Parcel order with sender/recipient custody data. */
  async createParcel(customerId: string, dto: CreateParcelDto) {
    const zone = loadZone();
    if (!isPointInZone({ lat: dto.sender.address.lat, lng: dto.sender.address.lng }, zone)) {
      throw new BadRequestException('Parcel pickup address is outside the Cape Coast zone');
    }
    if (!isPointInZone({ lat: dto.recipient.address.lat, lng: dto.recipient.address.lng }, zone)) {
      throw new BadRequestException('Parcel recipient address is outside the Cape Coast zone');
    }
    const checkoutId = crypto.randomUUID();
    const ref = await this.nextOrderRef('PR');
    const feePolicy = feePolicyFromEnv(this.env.rawEnv);
    const distance = distanceKm(
      { lat: dto.sender.address.lat, lng: dto.sender.address.lng },
      { lat: dto.recipient.address.lat, lng: dto.recipient.address.lng },
    );
    const deliveryFee = customerDeliveryFee(feePolicy, distance, 'PARCEL', { serviceLevel: dto.serviceLevel ?? 'STANDARD' });
    const serviceFee = this.env.parcelServiceFeePesewas;
    const total = deliveryFee + serviceFee;
    const otp = this.makeOtp();
    const order = await this.orders.save(this.orders.create({
      ref,
      checkoutId,
      orderType: OrderType.PARCEL,
      vendorId: 'PARCEL',
      vendorName: 'Ore Courier',
      vendorType: 'PARCEL',
      serviceCode: 'PR',
      serviceLevel: dto.serviceLevel ?? 'STANDARD',
      feePolicyVersion: feePolicy.version,
      commissionBps: 0,
      customerId,
      customerPhone: dto.sender.phone,
      paymentMethod: PaymentMethod.PREPAID,
      status: OrderStatus.PENDING_PAYMENT,
      addressJson: dto.recipient.address,
      pickupJson: null,
      prepTimeMin: 0,
      subtotalPesewas: 0,
      deliveryFeePesewas: deliveryFee,
      serviceFeePesewas: serviceFee,
      platformFeePesewas: 0,
      vendorSharePesewas: 0,
      // Fulfilment fee is separate from the customer delivery fee and is set by Dispatch from pickup+delivery distances.
      riderFeePesewas: 0,
      totalPesewas: total,
      note: dto.note ?? null,
      otpHash: otp.hash,
      otpCipher: encryptOtp(otp.plain),
      parcelJson: {
        sender: dto.sender,
        recipient: dto.recipient,
        category: dto.category,
        weightKg: dto.weightKg,
        dimensionsCm: dto.dimensionsCm ?? null,
        declaredValuePesewas: dto.declaredValuePesewas,
        description: dto.description,
        fragile: dto.fragile,
        sealed: dto.sealed,
        pickupMode: dto.pickupMode,
        proofMode: dto.proofMode,
        prohibitedItemsAcknowledged: dto.prohibitedItemsAcknowledged,
        parcelStatus: 'AWAITING_PAYMENT',
        returnReason: null,
        pickedUpAt: null,
        deliveredAt: null,
      },
      errandJson: null,
      recipientJson: null,
      conditionJson: null,
      marketFulfillmentJson: null,
      laundryStage: null,
      promotionId: null,
      promotionTitle: null,
      promotionDiscountPesewas: 0,
    }));
    await this.scheduler.schedule('payment-timeout', { orderId: order.id }, zone.config.paymentTimeoutMin * 60_000, JOB_PAYMENT_TIMEOUT(checkoutId, order.id));
    const res = await internalFetch(`${serviceUrl('payment')}/internal/payments/initialize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ checkoutId, amountPesewas: total, phone: dto.sender.phone, allocations: [{ orderId: order.id, allocatedPesewas: total }] }),
    });
    if (!res.ok) throw new BadRequestException('Could not initialize Parcel payment');
    const payment = (await res.json()) as { reference: string; paystackUrl: string | null; mode: string };
    await this.recordEvent(order.id, null, order.status, 'system', { ref, parcel: true });
    await this.recordAddressAudit(order.id, 'SNAPSHOT', null, order.addressJson, 'parcel_checkout', 'system', null, 'Parcel recipient delivery-location snapshot');
    await this.bus.publish(EVENTS.ORDER_CREATED, { orderId: order.id, checkoutId, status: order.status, vendorId: order.vendorId, customerId, paymentMethod: order.paymentMethod, amountPesewas: total, orderType: OrderType.PARCEL });
    return { orderId: order.id, ref, totalPesewas: total, deliveryFeePesewas: deliveryFee, serviceFeePesewas: serviceFee, payment };
  }

  /** Rider confirms they are at the shop and shopping within the budget. */
  async markErrandShopping(riderId: string, orderId: string): Promise<OrderStatusDto> {
    const order = await this.requireAssignedErrand(riderId, orderId);
    if (![OrderStatus.RIDER_ASSIGNED, OrderStatus.RIDER_EN_ROUTE_TO_VENDOR, OrderStatus.RIDER_AT_VENDOR].includes(order.status)) {
      throw new ConflictException(`Errand not in a shoppable state (${order.status})`);
    }
    await this.stepToShop(orderId);
    const current = await this.orders.findOneOrFail({ where: { id: orderId } });
    const errand = current.errandJson!;
    errand.errandStatus = ErrandStatus.SHOPPING;
    errand.shoppedAt = new Date().toISOString();
    await this.orders.save(current);
    await this.bus.publish(EVENTS.ORDER_PREP_STARTED, { orderId, checkoutId: current.checkoutId, status: current.status, vendorId: current.vendorId, customerId: current.customerId, paymentMethod: current.paymentMethod, amountPesewas: current.totalPesewas, errandStatus: errand.errandStatus });
    return this.getOrder(orderId);
  }

  /** Submit an itemized receipt ≤ remaining budget + private photo proof. */
  async submitErrandReceipt(riderId: string, orderId: string, dto: ErrandReceiptDto): Promise<OrderStatusDto> {
    const order = await this.requireAssignedErrand(riderId, orderId);
    const errand = order.errandJson!;
    if (errand.errandStatus !== ErrandStatus.SHOPPING && errand.errandStatus !== ErrandStatus.PURCHASED) {
      throw new ConflictException(`Receipts only while shopping (status: ${errand.errandStatus})`);
    }
    const remaining = errand.budgetPesewas - errand.spentPesewas;
    if (dto.amountPesewas > remaining) {
      throw new BadRequestException(`Receipt exceeds remaining budget (GHS ${(remaining / 100).toFixed(2)} left)`);
    }

    let photoKey = dto.photoKey;
    if (dto.dataBase64) {
      const contentType = (dto.contentType ?? 'image/jpeg').trim().toLowerCase();
      if (!['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(contentType)) {
        throw new BadRequestException('Errand receipt photos must be JPEG, PNG, or WebP');
      }
      const encoded = dto.dataBase64.replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/i, '').replace(/\s/g, '');
      if (!/^[A-Za-z0-9+/]*={0,2}$/.test(encoded) || encoded.length % 4 !== 0) {
        throw new BadRequestException('Errand receipt photo must be valid Base64');
      }
      const bytes = Buffer.from(encoded, 'base64');
      if (bytes.length === 0 || bytes.length > 5 * 1024 * 1024) {
        throw new BadRequestException('Errand receipt photo must be between 1 byte and 5 MB');
      }
      const extension = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg';
      photoKey = storageKeyFor('errand-receipts', order.id, `receipt-${Date.now()}.${extension}`);
      await this.storage.putObject(photoKey, bytes, contentType);
    }
    if (!photoKey) throw new BadRequestException('Receipt photo is required');

    errand.spentPesewas += dto.amountPesewas;
    errand.receipts.push({ amountPesewas: dto.amountPesewas, photoKey, note: dto.note ?? null, at: new Date().toISOString() });
    errand.errandStatus = ErrandStatus.PURCHASED;
    errand.purchasedAt = new Date().toISOString();
    await this.orders.save(order);
    return this.getOrder(orderId);
  }

  /** Rider explicitly ends shopping after receipts and approved substitutions are complete. */
  async readyErrandForDelivery(riderId: string, orderId: string): Promise<OrderStatusDto> {
    const order = await this.requireAssignedErrand(riderId, orderId);
    const errand = order.errandJson!;
    if (errand.errandStatus !== ErrandStatus.PURCHASED) {
      throw new ConflictException(`Errand is not ready for delivery (status: ${errand.errandStatus})`);
    }
    if (errand.substitution?.status === SubstitutionStatus.PENDING) {
      throw new ConflictException('Resolve the pending substitution before delivery');
    }
    await this.stepToOutForDelivery(orderId);
    return this.getOrder(orderId);
  }

  /** Out-of-stock → rider proposes a substitute; customer approves/rejects (doc §Errands). */
  async requestErrandSubstitution(riderId: string, orderId: string, dto: ErrandSubstitutionDto): Promise<OrderStatusDto> {
    const order = await this.requireAssignedErrand(riderId, orderId);
    const errand = order.errandJson!;
    if (errand.errandStatus !== ErrandStatus.SHOPPING && errand.errandStatus !== ErrandStatus.PURCHASED) {
      throw new ConflictException(`Substitutions only while shopping (status: ${errand.errandStatus})`);
    }
    if (dto.pricePesewas > errand.budgetPesewas - errand.spentPesewas) {
      throw new BadRequestException('Substitute price exceeds the remaining budget');
    }
    errand.substitution = { item: dto.item, pricePesewas: dto.pricePesewas, status: SubstitutionStatus.PENDING };
    await this.orders.save(order);
    
    // Schedule substitution response timeout for 15 minutes
    await this.scheduler.schedule(
      'substitution-timeout',
      { orderId: order.id },
      15 * 60_000,
      `errand-sub-timeout:${order.id}`
    );
    
    await this.notify.sendPush({ userId: order.customerId, title: 'Substitute requested', body: `Rider suggests "${dto.item}" (GHS ${(dto.pricePesewas / 100).toFixed(2)}) — approve or reject.`, data: { orderId } });
    return this.getOrder(orderId);
  }

  async decideErrandSubstitution(customerId: string, orderId: string, dto: ErrandSubDecisionDto): Promise<OrderStatusDto> {
    const order = await this.orders.findOne({ where: { id: orderId } });
    if (!order || order.customerId !== customerId) throw new NotFoundException('Order not found');
    const errand = order.errandJson;
    if (!errand || !errand.substitution || errand.substitution.status !== SubstitutionStatus.PENDING) {
      throw new ConflictException('No pending substitution to decide');
    }
    errand.substitution.status = dto.approve ? SubstitutionStatus.APPROVED : SubstitutionStatus.REJECTED;
    await this.orders.save(order);
    
    // Cancel the pending substitution timeout
    await this.scheduler.cancel(`errand-sub-timeout:${order.id}`);
    
    if (order.riderId) {
      await this.notify.sendPush({ userId: (await this.riderUserId(order.riderId).catch(() => null)) ?? '', title: dto.approve ? 'Substitute approved' : 'Substitute rejected', body: dto.approve ? `"${errand.substitution.item}" approved.` : `"${errand.substitution.item}" rejected — keep to the original list.`, data: { orderId } });
    }
    return this.getOrder(orderId);
  }

  private async requireAssignedErrand(riderId: string, orderId: string): Promise<Order> {
    const order = await this.orders.findOne({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');
    if (order.orderType !== OrderType.ERRAND || !order.errandJson) throw new BadRequestException('Not an errand order');
    if (order.riderId !== riderId) throw new ForbiddenException('Not your assigned errand');
    return order;
  }

  private async riderUserId(riderId: string): Promise<string | null> {
    const res = await internalFetch(`${serviceUrl('dispatch')}/internal/riders/${riderId}`);
    if (!res.ok) return null;
    const body = (await res.json()) as { userId?: string };
    return body.userId ?? null;
  }

  /** Step the errand's ORDER status to the shop (RIDER_AT_VENDOR) with fresh reads. */
  private async stepToShop(orderId: string): Promise<void> {
    let guard = 0;
    while (guard++ < 10) {
      const cur = await this.orders.findOne({ where: { id: orderId } });
      if (!cur) return;
      const s = cur.status;
      if (s === OrderStatus.RIDER_ASSIGNED) await this.transition(orderId, OrderStatus.RIDER_EN_ROUTE_TO_VENDOR, 'dispatch');
      else if (s === OrderStatus.RIDER_EN_ROUTE_TO_VENDOR) await this.transition(orderId, OrderStatus.RIDER_AT_VENDOR, 'dispatch');
      else break;
    }
  }

  // ── Internal transitions from events ──────────────────────────────
  async confirmOnPayment(checkoutId: string): Promise<void> {
    const orders = await this.orders.find({ where: { checkoutId, status: OrderStatus.PENDING_PAYMENT } });
    for (const o of orders) {
      const isErrand = o.orderType === OrderType.ERRAND;
      const isParcel = o.orderType === OrderType.PARCEL;
      // do all non-status writes BEFORE any transition — the transition reloads the entity,
      // so saving this snapshot afterwards would clobber the new status (stale-entity bug)
      if (!o.otpHash) {
        const otp = this.makeOtp();
        o.otpHash = otp.hash;
        o.otpCipher = encryptOtp(otp.plain);
      }
      if (isErrand && o.errandJson) {
        o.errandJson.errandStatus = ErrandStatus.CONFIRMED;
      }
      if (isParcel && o.parcelJson) {
        o.parcelJson.parcelStatus = 'CONFIRMED';
      }
      if (o.otpHash || isErrand || isParcel) await this.orders.save(o); // status still PENDING_PAYMENT here — safe

      await this.transition(o.id, OrderStatus.CONFIRMED, 'payment');
      await this.scheduleAcceptTimeout(o.id);
      await this.bus.publish(EVENTS.ORDER_CONFIRMED, { orderId: o.id, checkoutId, status: OrderStatus.CONFIRMED, vendorId: o.vendorId, customerId: o.customerId, paymentMethod: o.paymentMethod, amountPesewas: o.totalPesewas, orderType: o.orderType });
      await this.notify.sendPush({ userId: o.customerId, title: 'Order confirmed', body: `We've received your payment — ${o.vendorName} is getting started.` });
      if (isErrand || isParcel) {
        // Request-only services bypass Vendor acceptance and enter Dispatch after payment.
        await this.scheduler.cancel(JOB_ACCEPT_TIMEOUT(o.id));
        await this.transition(o.id, OrderStatus.READY_FOR_PICKUP, 'payment');
        await this.bus.publish(EVENTS.ORDER_READY_FOR_PICKUP, { orderId: o.id, checkoutId, status: OrderStatus.READY_FOR_PICKUP, vendorId: o.vendorId, customerId: o.customerId, paymentMethod: o.paymentMethod, amountPesewas: o.totalPesewas, orderType: o.orderType, errandStatus: o.errandJson?.errandStatus, parcelStatus: o.parcelJson?.parcelStatus });
        await this.notify.sendPush({ userId: o.customerId, title: isErrand ? 'Errand confirmed' : 'Parcel confirmed', body: isErrand ? `Escrow GHS ${((o.errandJson?.escrowPesewas ?? 0) / 100).toFixed(2)} secured — a Rider will shop for you.` : `Your Parcel is paid and a Rider will be assigned for pickup.` });
      } else {
        const ownerUserId = await this.vendorOwnerUserId(o.vendorId);
        if (ownerUserId) {
          await this.notify.sendPush({ userId: ownerUserId, title: 'New order', body: `New order ${o.ref} — accept it now.` });
        }
      }
    }
  }

  async onRiderAssigned(orderId: string, riderId: string): Promise<void> {
    const order = await this.orders.findOne({ where: { id: orderId } });
    if (!order) return;
    order.riderId = riderId;
    if (order.errandJson) {
      // snapshot the rider's trust tier for the escrow record (doc §Errands)
      const tier = await this.fetchRiderTier(riderId).catch(() => null);
      order.errandJson.trustTier = tier ?? order.errandJson.trustTier;
      order.errandJson.errandStatus = ErrandStatus.ASSIGNED;
    }
    await this.orders.save(order);
    if (order.status === OrderStatus.READY_FOR_PICKUP || order.status === OrderStatus.WAITING_FOR_RIDER) {
      await this.transition(order.id, OrderStatus.RIDER_ASSIGNED, `dispatch`);
    }
  }

  private async fetchRiderTier(riderId: string): Promise<string | null> {
    const res = await internalFetch(`${serviceUrl('dispatch')}/internal/riders/${riderId}`);
    if (!res.ok) return null;
    const body = (await res.json()) as { errandTrustTier?: string };
    return body.errandTrustTier ?? null;
  }

  async onRiderEnRoute(orderId: string): Promise<void> {
    const order = await this.orders.findOne({ where: { id: orderId } });
    if (!order || order.status !== OrderStatus.RIDER_ASSIGNED) return;
    await this.transition(order.id, OrderStatus.RIDER_EN_ROUTE_TO_VENDOR, 'dispatch');
  }

  async onRiderAtVendor(orderId: string, riderId?: string): Promise<void> {
    const order = await this.orders.findOne({ where: { id: orderId } });
    if (!order) return;
    // Laundry's first leg is customer collection → Vendor handoff. The
    // physical Vendor geofence closes that leg instead of reopening the
    // ordinary customer delivery state machine.
    if ((order.vendorType === 'LAUNDRY' || order.serviceCode === 'LD') &&
        order.status === OrderStatus.OUT_FOR_DELIVERY &&
        (order.laundryStage ?? 'AWAITING_COLLECTION') === 'AWAITING_COLLECTION') {
      // Reaching the Vendor is only a UI/geofence hint on the collection
      // leg. The Rider must explicitly confirm the handoff so the assignment
      // is closed exactly once.
      return;
    }
    // Geofence can fire before the en-route event lands — step through the machine.
    if (order.status === OrderStatus.RIDER_ASSIGNED) {
      await this.transition(order.id, OrderStatus.RIDER_EN_ROUTE_TO_VENDOR, 'dispatch');
    }
    if (order.status === OrderStatus.RIDER_EN_ROUTE_TO_VENDOR) {
      await this.transition(order.id, OrderStatus.RIDER_AT_VENDOR, 'dispatch');
    }
  }

  async onRiderPickedUp(orderId: string): Promise<void> {
    // pickup confirmation is authoritative even if the geofence/en-route events arrived late
    await this.stepToOutForDelivery(orderId);
    const order = await this.orders.findOne({ where: { id: orderId } });
    if (order?.parcelJson) {
      order.parcelJson.parcelStatus = 'IN_TRANSIT';
      order.parcelJson.pickedUpAt = new Date().toISOString();
      await this.orders.save(order);
    }
  }

  /** Completes the first Laundry leg without completing the customer order. */
  async onLaundryHandoff(orderId: string, riderId: string): Promise<void> {
    const order = await this.orders.findOne({ where: { id: orderId } });
    if (!order || (order.vendorType !== 'LAUNDRY' && order.serviceCode !== 'LD')) return;
    if (order.status !== OrderStatus.OUT_FOR_DELIVERY) return;
    if (order.riderId && riderId && order.riderId !== riderId) return;
    const stage = order.laundryStage ?? 'AWAITING_COLLECTION';
    if (stage !== 'AWAITING_COLLECTION' && stage !== 'COLLECTED') return;
    order.laundryStage = 'COLLECTED';
    order.riderId = null;
    await this.orders.save(order);
    await this.recordEvent(order.id, order.status, order.status, `rider:${riderId || 'dispatch'}`, { laundryHandoff: true, laundryStage: 'COLLECTED' });
  }

  /** Step the order through to OUT_FOR_DELIVERY with FRESH reads per transition
   *  (the machine forbids skipping, so we advance one hop at a time until stable). */
  private async stepToOutForDelivery(orderId: string): Promise<void> {
    let guard = 0;
    while (guard++ < 10) {
      const cur = await this.orders.findOne({ where: { id: orderId } });
      if (!cur) return;
      const s = cur.status;
      if (s === OrderStatus.RIDER_ASSIGNED) {
        await this.transition(orderId, OrderStatus.RIDER_EN_ROUTE_TO_VENDOR, 'dispatch');
      } else if (s === OrderStatus.RIDER_EN_ROUTE_TO_VENDOR) {
        await this.transition(orderId, OrderStatus.RIDER_AT_VENDOR, 'dispatch');
      } else if (s === OrderStatus.RIDER_AT_VENDOR) {
        await this.transition(orderId, OrderStatus.PICKED_UP, 'dispatch');
        await this.transition(orderId, OrderStatus.OUT_FOR_DELIVERY, 'dispatch');
      } else if (s === OrderStatus.PICKED_UP) {
        await this.transition(orderId, OrderStatus.OUT_FOR_DELIVERY, 'dispatch');
      } else {
        break; // already past (or terminal/not-dispatchable) — stable
      }
    }
  }

  async onRiderUnassigned(orderId: string): Promise<void> {
    const order = await this.orders.findOne({ where: { id: orderId } });
    if (!order) return;
    order.riderId = null;
    await this.orders.save(order);
    if (order.status === OrderStatus.RIDER_ASSIGNED || order.status === OrderStatus.RIDER_EN_ROUTE_TO_VENDOR) {
      await this.transition(order.id, OrderStatus.READY_FOR_PICKUP, 'dispatch', { reason: 'rider-unassigned' });
    }
  }

  async onWaitingForRider(orderId: string): Promise<void> {
    const order = await this.orders.findOne({ where: { id: orderId } });
    if (!order) return;
    if (order.status === OrderStatus.READY_FOR_PICKUP) {
      await this.transition(order.id, OrderStatus.WAITING_FOR_RIDER, 'dispatch');
    }
  }

  async cancelSystem(orderId: string, reason: string): Promise<void> {
    const order = await this.orders.findOne({ where: { id: orderId } });
    if (!order) return;
    if (ORDER_ACTIVE_STATUSES.includes(order.status)) {
      await this.transition(order.id, OrderStatus.CANCELLED, 'system', { reason });
      await this.bus.publish(EVENTS.ORDER_CANCELLED, { orderId: order.id, checkoutId: order.checkoutId, status: OrderStatus.CANCELLED, vendorId: order.vendorId, customerId: order.customerId, paymentMethod: order.paymentMethod, amountPesewas: order.totalPesewas, reason, fromStatus: order.status });
    }
  }

  /** Customer abort before pickup. After PICKED_UP the machine forbids CANCELLED. */
  async cancelByCustomer(user: JwtPayload, orderId: string, reason?: string): Promise<OrderStatusDto> {
    // The route is @Roles(CUSTOMER); refuse anything else outright (the old ADMIN
    // branch had no permission check and let any admin cancel any order — audit
    // F-SEC-6). Admins go through cancelByAdmin, which is dual-controlled.
    if (user.role !== Role.CUSTOMER) {
      throw new ForbiddenException('Customer role required');
    }
    const order = await this.orders.findOne({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');
    if (order.customerId !== user.sub) {
      throw new ForbiddenException('Not your order');
    }
    if (!canTransition(order.status, OrderStatus.CANCELLED)) {
      throw new ConflictException(`Order is ${order.status} — cannot cancel after pickup`);
    }
    const note = reason?.trim() || 'customer-cancel';
    await this.transition(order.id, OrderStatus.CANCELLED, `customer:${user.sub}`, { reason: note });
    await this.bus.publish(EVENTS.ORDER_CANCELLED, {
      orderId: order.id,
      checkoutId: order.checkoutId,
      status: OrderStatus.CANCELLED,
      vendorId: order.vendorId,
      customerId: order.customerId,
      paymentMethod: order.paymentMethod,
      amountPesewas: order.totalPesewas,
      reason: note,
      fromStatus: order.status,
    });
    return this.getOrder(orderId);
  }

  /** Ops/finance cancel with a reason (audited) — also drives failed-errand compensation. */
  async cancelByAdmin(adminUserId: string, orderId: string, reason: string): Promise<OrderStatusDto> {
    const order = await this.orders.findOne({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');
    if (!ORDER_ACTIVE_STATUSES.includes(order.status)) {
      throw new ConflictException(`Order is ${order.status} — cannot cancel`);
    }
    await this.transition(order.id, OrderStatus.CANCELLED, `admin:${adminUserId}`, { reason });
    await this.bus.publish(EVENTS.ORDER_CANCELLED, { orderId: order.id, checkoutId: order.checkoutId, status: OrderStatus.CANCELLED, vendorId: order.vendorId, customerId: order.customerId, paymentMethod: order.paymentMethod, amountPesewas: order.totalPesewas, reason, fromStatus: order.status });
    return this.getOrder(orderId);
  }

  async adminOrdersList(limit: number = 50, statusFilter?: string): Promise<{
    orders: Array<{
      id: string;
      ref: string;
      status: OrderStatus;
      vendorName: string;
      customerId: string;
      paymentMethod: PaymentMethod;
      totalPesewas: number;
      createdAt: Date;
      riderId: string | null;
    }>;
    total: number;
    hasMore: boolean;
  }> {
    const take = Math.min(Math.max(1, limit), 100);
    const where = statusFilter ? { status: statusFilter as OrderStatus } : {};
    const orders = await this.orders.find({
      where,
      order: { createdAt: 'DESC' },
      take,
    });
    return {
      orders: orders.map((order) => ({
        id: order.id,
        ref: order.ref,
        status: order.status,
        vendorName: order.vendorName,
        customerId: order.customerId,
        paymentMethod: order.paymentMethod,
        totalPesewas: order.totalPesewas,
        createdAt: order.createdAt,
        riderId: order.riderId || null,
      })),
      total: orders.length,
      hasMore: orders.length === take,
    };
  }

  // ── Jobs ──────────────────────────────────────────────────────────
  private registerJobs(): void {
    this.scheduler.onProcess('payment-timeout', async (p: Record<string, unknown>) => {
      const order = await this.orders.findOne({ where: { id: p.orderId as string } });
      if (order && order.status === OrderStatus.PENDING_PAYMENT) {
        await this.cancelSystem(order.id, 'payment-timeout');
      }
    });
    this.scheduler.onProcess('substitution-timeout', async (p: Record<string, unknown>) => {
      const order = await this.orders.findOne({ where: { id: p.orderId as string } });
      if (order && order.errandJson && order.errandJson.substitution?.status === 'PENDING') {
        order.errandJson.substitution.status = 'REJECTED';
        await this.orders.save(order);
        await this.bus.publish(EVENTS.ORDER_DELAYED, {
          orderId: order.id,
          reason: 'Substitution proposal timed out (customer did not approve within 15 mins)',
        });
        Logger.warn(`[Errand] Substitution proposal for order ${order.id} automatically rejected due to customer response timeout`, 'OrderService');
      }
    });
    this.scheduler.onProcess('accept-timeout', async (p: Record<string, unknown>) => {
      const order = await this.orders.findOne({ where: { id: p.orderId as string } });
      if (order && order.status === OrderStatus.CONFIRMED) {
        await this.cancelSystem(order.id, 'vendor-accept-timeout');
      }
    });
    this.scheduler.onProcess('auto-ready', async (p: Record<string, unknown>) => {
      const order = await this.orders.findOne({ where: { id: p.orderId as string } });
      if (order && order.status === OrderStatus.PREPARING) {
        const readyAt = new Date();
        await this.transition(order.id, OrderStatus.READY_FOR_PICKUP, 'system', { auto: true, readyAt: readyAt.toISOString(), prepTimeMin: order.prepTimeMin });
        await this.bus.publish(EVENTS.ORDER_READY_FOR_PICKUP, { orderId: order.id, checkoutId: order.checkoutId, status: OrderStatus.READY_FOR_PICKUP, vendorId: order.vendorId, customerId: order.customerId, paymentMethod: order.paymentMethod, amountPesewas: order.totalPesewas, auto: true, readyAt: readyAt.toISOString(), prepTimeMin: order.prepTimeMin });
      }
    });
  }

  // ── internals ─────────────────────────────────────────────────────
  private async transition(orderId: string, to: OrderStatus, actor: string, payload?: Record<string, unknown>): Promise<Order> {
    const order = await this.orders.findOne({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');
    if (order.status === to) return order;
    if (!canTransition(order.status, to)) {
      throw new ConflictException(`Illegal transition ${order.status} → ${to}`);
    }
    if (to === OrderStatus.PICKED_UP) await this.consumeCatalogStock(order.id);
    if (to === OrderStatus.CANCELLED || to === OrderStatus.REJECTED) {
      await this.releaseCatalogStock(order.id);
      await this.releaseCatalogPromotion(order.id);
    }
    const from = order.status;
    order.status = to;
    if (to === OrderStatus.ACCEPTED) order.acceptedAt = new Date();
    if (to === OrderStatus.READY_FOR_PICKUP) order.readyAt = new Date();
    if (to === OrderStatus.PICKED_UP) order.pickedUpAt = new Date();
    if (to === OrderStatus.DELIVERED) order.deliveredAt = new Date();
    if (to === OrderStatus.CANCELLED || to === OrderStatus.REJECTED) {
      order.cancelledAt = new Date();
      order.cancelReason = (payload?.reason as string) ?? null;
      if (order.errandJson && order.errandJson.errandStatus !== ErrandStatus.DELIVERED) {
        order.errandJson.errandStatus = to === OrderStatus.CANCELLED ? ErrandStatus.CANCELLED : ErrandStatus.FAILED;
      }
      if (order.parcelJson) {
        order.parcelJson.parcelStatus = 'CANCELLED';
      }
    }
    if (to === OrderStatus.DELIVERED && order.errandJson) {
      order.errandJson.errandStatus = ErrandStatus.DELIVERED;
    }
    if (to === OrderStatus.DELIVERED && order.parcelJson) {
      order.parcelJson.parcelStatus = 'DELIVERED';
      order.parcelJson.deliveredAt = new Date().toISOString();
    }
    await this.orders.save(order);
    await this.recordEvent(order.id, from, to, actor, payload);

    // Lifecycle events that have no caller-side publisher are emitted here, so every path
    // through the machine (rider events, system jobs, admin force) fires them exactly once.
    if (to === OrderStatus.PICKED_UP) {
      await this.bus.publish(EVENTS.ORDER_PICKED_UP, {
        orderId: order.id, checkoutId: order.checkoutId, status: to, vendorId: order.vendorId,
        customerId: order.customerId, paymentMethod: order.paymentMethod, amountPesewas: order.totalPesewas,
      });
    } else if (to === OrderStatus.OUT_FOR_DELIVERY) {
      await this.bus.publish(EVENTS.ORDER_OUT_FOR_DELIVERY, {
        orderId: order.id, checkoutId: order.checkoutId, status: to, vendorId: order.vendorId,
        customerId: order.customerId, paymentMethod: order.paymentMethod, amountPesewas: order.totalPesewas,
      });
    } else if (to === OrderStatus.OTP_VERIFIED) {
      await this.bus.publish(EVENTS.ORDER_OTP_VERIFIED, {
        orderId: order.id, checkoutId: order.checkoutId, status: to, vendorId: order.vendorId,
        customerId: order.customerId, paymentMethod: order.paymentMethod, amountPesewas: order.totalPesewas,
      });
    } else if (to === OrderStatus.FAILED_DELIVERY) {
      await this.bus.publish(EVENTS.ORDER_FAILED_DELIVERY, {
        orderId: order.id, checkoutId: order.checkoutId, status: to, vendorId: order.vendorId,
        customerId: order.customerId, paymentMethod: order.paymentMethod, amountPesewas: order.totalPesewas,
      });
    }
    return order;
  }

  private async recordEvent(orderId: string, from: string | null, to: string, actor: string, payload?: Record<string, unknown>): Promise<void> {
    await this.events.save(this.events.create({ orderId, from, to, actor, payloadJson: payload ?? null }));
  }

  private async recordAddressAudit(
    orderId: string,
    action: OrderAddressAudit['action'],
    beforeJson: DeliveryAddressDto | null,
    afterJson: DeliveryAddressDto,
    source: string | null,
    actorRole: string | null,
    actorId: string | null,
    reason: string | null,
  ): Promise<void> {
    await this.addressAudits.save(this.addressAudits.create({ orderId, action, beforeJson, afterJson, source, actorRole, actorId, reason }));
  }

  /** Internal: the audit timeline for an order (support AI reads it to answer "what happened"). */
  async orderEvents(orderId: string): Promise<unknown[]> {
    return this.events.find({ where: { orderId }, order: { createdAt: 'ASC' } });
  }

  private async forVendor(user: JwtPayload, orderId: string): Promise<Order> {
    const order = await this.orders.findOne({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');
    if (user.role !== Role.VENDOR && user.role !== Role.ADMIN) throw new ForbiddenException('Vendor role required');
    if (user.role === Role.VENDOR && !(await this.vendorOwns(user.sub, order.vendorId))) {
      throw new ForbiddenException('Not your order');
    }
    return order;
  }

  private async releaseCatalogPromotion(orderId: string): Promise<void> {
    const res = await internalFetch(`${serviceUrl('catalog')}/internal/promotions/release`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId }),
    }).catch(() => null);
    if (res && !res.ok) throw new ConflictException('Catalog promotion release failed');
  }

  private async reserveCatalogStock(orderId: string): Promise<void> {
    const items = await this.orderItems.find({ where: { orderId } });
    await this.catalogInventoryRequest('reserve', {
      orderId,
      lines: items.map((item) => ({ itemId: item.itemId, qty: item.qty })),
    });
  }

  private consumeCatalogStock(orderId: string): Promise<void> {
    return this.catalogInventoryRequest('consume', { orderId });
  }

  private releaseCatalogStock(orderId: string): Promise<void> {
    return this.catalogInventoryRequest('release', { orderId });
  }

  private async catalogInventoryRequest(action: 'reserve' | 'release' | 'consume', body: Record<string, unknown>): Promise<void> {
    const res = await internalFetch(`${serviceUrl('catalog')}/internal/inventory/${action}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).catch(() => null);
    if (!res) throw new ConflictException('Catalog inventory service is unavailable');
    if (res.ok) return;
    let message = 'Inventory operation failed';
    try {
      const responseBody = await res.json() as { message?: string; error?: { message?: string } };
      message = responseBody.error?.message ?? responseBody.message ?? message;
    } catch {
      // retain the safe generic message
    }
    throw new ConflictException(message);
  }

  private async vendorOwnerUserId(vendorId: string): Promise<string | null> {
    try {
      const res = await internalFetch(`${serviceUrl('catalog')}/internal/vendors/${vendorId}/owner`);
      if (!res.ok) return null;
      const body = (await res.json()) as { ownerUserId?: string } | null;
      return body?.ownerUserId ?? null;
    } catch {
      return null;
    }
  }

  private async vendorOwns(userId: string, vendorId: string): Promise<boolean> {
    try {
      const res = await internalFetch(`${serviceUrl('catalog')}/internal/vendors?ownerId=${userId}`);
      if (!res.ok) return false;
      const vendors = (await res.json()) as { id: string }[];
      return vendors.some((v) => v.id === vendorId);
    } catch {
      return false;
    }
  }

  private assertViewer(order: Order, viewer: JwtPayload, viewerRiderId?: string): void {
    const isCustomer = viewer.role === Role.CUSTOMER && viewer.sub === order.customerId;
    const isRider = viewer.role === Role.RIDER && order.riderId === (viewerRiderId ?? viewer.sub);
    const isAdmin = viewer.role === Role.ADMIN;
    if (!isCustomer && !isRider && !isAdmin && viewer.role !== Role.VENDOR) {
      throw new ForbiddenException('Not your order');
    }
  }

  /** doc §Order ID: ORO-<CITY>-<SERVICE>-<YYYYMMDD>-<SEQ> — sequence per city/service/date. */
  private async nextOrderRef(serviceCode: string): Promise<string> {
    const key = `CC-${serviceCode}-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`;
    const seq = await nextSequenceValue(this.sequences, key);
    return `ORO-${key}-${String(seq).padStart(4, '0')}`;
  }

  /** doc §Order Acceptance: 3 min to accept/reject; auto-cancel at 5 min. */
  private acceptSlaSec(): number {
    return this.env.vendorAcceptSlaSec;
  }

  private autoCancelSec(): number {
    return this.env.vendorAutoCancelSec;
  }

  private async scheduleAcceptTimeout(orderId: string): Promise<void> {
    await this.scheduler.schedule('accept-timeout', { orderId }, this.autoCancelSec() * 1000, JOB_ACCEPT_TIMEOUT(orderId));
  }

  private makeRef(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let s = '';
    for (let i = 0; i < 6; i++) s += chars[randomInt(chars.length)];
    return `ore-cc-${s}`;
  }

  private makeOtp(): { hash: string; plain: string } {
    const plain = randomInt(1000, 9999).toString();
    return { hash: hash(plain), plain };
  }

  /** Order owner reads their OTP to hand to the rider (G21). */
  async getOtp(viewer: JwtPayload, orderId: string): Promise<{ otp: string }> {
    const order = await this.orders.findOne({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');
    const isOwner = viewer.role === Role.CUSTOMER && viewer.sub === order.customerId;
    const isAdmin = viewer.role === Role.ADMIN;
    if (!isOwner && !isAdmin) throw new ForbiddenException('Not your order');
    if (!order.otpCipher) throw new BadRequestException('No OTP issued for this order yet');
    return { otp: decryptOtp(order.otpCipher) };
  }

  /** Internal: reveal the delivery OTP to another service (notification → gift recipient SMS).
   *  Guarded by @Internal — never reachable through the gateway. */
  async revealOtpForService(orderId: string): Promise<{ otp: string }> {
    const order = await this.orders.findOne({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');
    if (!order.otpCipher) throw new BadRequestException('No OTP issued for this order yet');
    return { otp: decryptOtp(order.otpCipher) };
  }

  private async toDto(order: Order): Promise<OrderStatusDto> {
    const [events, items] = await Promise.all([
      this.events.find({ where: { orderId: order.id }, order: { createdAt: 'ASC' } }),
      this.orderItems.find({ where: { orderId: order.id }, order: { createdAt: 'ASC' } }),
    ]);
    const otpRequired = order.status !== OrderStatus.DELIVERED && order.otpHash !== null;
    const customerContactPhone = order.recipientJson?.phone ?? order.customerPhone ?? '';
    const zone = loadZone();
    const riderProjection = order.riderId ? await this.fetchRiderProjection(order).catch(() => null) : null;
    const etaMinutes = await this.estimateEta(order, zone.config, riderProjection);
    return {
      orderId: order.id,
      ref: order.ref,
      serviceCode: order.serviceCode,
      vendorType: order.vendorType,
      orderType: order.orderType,
      status: order.status,
      checkoutId: order.checkoutId,
      vendorId: order.vendorId,
      vendorName: order.vendorName,
      customer: { id: order.customerId, name: 'Customer', phone: customerContactPhone },
      items: items.map((item) => ({
        id: item.id,
        itemId: item.itemId,
        name: item.name,
        qty: item.qty,
        unit: item.unit,
        unitPricePesewas: item.unitPricePesewas,
        prepTimeMin: item.prepTimeMin,
        modifiers: item.modifiers ?? [],
        selectedOptions: (item.selectedOptions ?? []) as unknown as SelectedOptionDto[],
        optionsTotalPesewas: item.optionsTotalPesewas ?? 0,
      })),
      prescriptionRequired: items.some((item) => item.prescriptionOnly),
      prescriptionStatus: order.prescriptionStatus,
      prescriptionReviewNote: order.prescriptionReviewNote,
      conditionJson: order.conditionJson,
      marketFulfillment: order.marketFulfillmentJson,
      laundryStage: order.laundryStage,
      paymentMethod: order.paymentMethod,
      subtotalPesewas: order.subtotalPesewas,
      deliveryFeePesewas: order.deliveryFeePesewas,
      serviceFeePesewas: order.serviceFeePesewas,
      totalPesewas: order.totalPesewas,
      prepTimeMin: order.prepTimeMin,
      originalPrepTimeMin: order.originalPrepTimeMin,
      prepTimeExtendedByMin: order.prepTimeExtendedByMin ?? 0,
      prepExtensionCount: order.prepExtensionCount ?? 0,
      estimatedReadyAt: order.acceptedAt ? new Date(order.acceptedAt.getTime() + order.prepTimeMin * 60_000).toISOString() : null,
      prepCountdownRemainingSec: order.acceptedAt && [OrderStatus.ACCEPTED, OrderStatus.PREPARING].includes(order.status as OrderStatus)
        ? Math.max(0, Math.ceil((order.acceptedAt.getTime() + order.prepTimeMin * 60_000 - Date.now()) / 1000))
        : null,
      note: order.note,
      promotionId: order.promotionId,
      promotionTitle: order.promotionTitle,
      promotionDiscountPesewas: order.promotionDiscountPesewas,
      tipPesewas: order.tipPesewas ?? 0,
      peakPayPesewas: order.peakPayPesewas ?? 0,
      leaveAtDoor: !!order.leaveAtDoor,
      dropNote: order.dropNote ?? null,
      scheduledFor: order.scheduledFor?.toISOString() ?? null,
      serviceLevel: order.serviceLevel ?? (order.scheduledFor ? 'SCHEDULED' : 'STANDARD'),
      signatureRequired: !!order.leaveAtDoor || order.parcelJson?.proofMode === 'SIGNATURE' || order.parcelJson?.proofMode === 'PIN_AND_PHOTO',
      etaMinutes,
      pickup: order.pickupJson,
      rider: riderProjection,
      riderFeePesewas: order.riderFeePesewas,
      dropoff: order.addressJson,
      completedAt: order.deliveredAt?.toISOString() ?? null,
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
      otpRequired,
      timeline: events.map((e) => ({ from: e.from ?? '', to: e.to, at: e.createdAt.toISOString() })),
      recipient: order.recipientJson
        ? {
            name: order.recipientJson.name,
            phone: order.recipientJson.phone,
            status: order.recipientJson.status,
            confirmedAt: order.recipientJson.confirmedAt,
            address: order.recipientJson.address,
          }
        : null,
      errand: order.errandJson
        ? {
            task: order.errandJson.task,
            shopName: order.errandJson.shopName,
            shopLat: order.errandJson.shopLat,
            shopLng: order.errandJson.shopLng,
            budgetPesewas: order.errandJson.budgetPesewas,
            escrowPesewas: order.errandJson.escrowPesewas,
            errandStatus: order.errandJson.errandStatus,
            spentPesewas: order.errandJson.spentPesewas,
            receipts: order.errandJson.receipts,
            substitution: order.errandJson.substitution,
            trustTier: order.errandJson.trustTier,
            compensationPesewas: order.errandJson.compensationPesewas,
          }
        : null,
      parcel: order.parcelJson
        ? {
            sender: order.parcelJson.sender,
            recipient: order.parcelJson.recipient,
            category: order.parcelJson.category,
            weightKg: order.parcelJson.weightKg,
            dimensionsCm: order.parcelJson.dimensionsCm,
            declaredValuePesewas: order.parcelJson.declaredValuePesewas,
            description: order.parcelJson.description,
            fragile: order.parcelJson.fragile,
            sealed: order.parcelJson.sealed,
            pickupMode: order.parcelJson.pickupMode,
            proofMode: order.parcelJson.proofMode,
            parcelStatus: order.parcelJson.parcelStatus,
            returnReason: order.parcelJson.returnReason,
          }
        : null,
    };
  }

  private async estimateEta(
    order: Order,
    cfg: { pickupGeofenceM: number; dropGeofenceM: number; dispatchLeadMin: number; vendorAcceptWindowSec: number; paymentTimeoutMin: number; riderOfferWindowSec: number; riderRetryEverySec: number; riderRetryMaxMin: number },
    rider: RiderProjection | null,
  ): Promise<number | null> {
    if (order.status === OrderStatus.DELIVERED) return 0;
    if ([OrderStatus.CANCELLED, OrderStatus.REJECTED, OrderStatus.FAILED_DELIVERY].includes(order.status)) return null;

    const now = Date.now();
    const prepRemainingMs = order.acceptedAt && [OrderStatus.ACCEPTED, OrderStatus.PREPARING].includes(order.status)
      ? Math.max(0, order.acceptedAt.getTime() + order.prepTimeMin * 60_000 - now)
      : 0;

    if (!rider || (rider.lat === 0 && rider.lng === 0)) {
      const queueMs = order.riderId ? 0 : (cfg.dispatchLeadMin * 60_000 + cfg.riderOfferWindowSec * 1000);
      return Math.max(0, Math.ceil((prepRemainingMs + queueMs) / 60_000));
    }

    const drop = this.orderDropPoint(order);
    const pickup = this.orderPickupPoint(order);
    const riderPoint = { lat: rider.lat, lng: rider.lng };
    let travelKm = 0;
    if ([OrderStatus.PICKED_UP, OrderStatus.OUT_FOR_DELIVERY, OrderStatus.OTP_VERIFIED].includes(order.status)) {
      travelKm = distanceKm(riderPoint, drop);
    } else if (pickup) {
      travelKm = distanceKm(riderPoint, pickup) + distanceKm(pickup, drop);
    } else {
      travelKm = distanceKm(riderPoint, drop);
    }

    const travelMs = (travelKm / 24) * 60 * 60_000; // conservative in-city motorbike average
    return Math.max(0, Math.ceil((prepRemainingMs + travelMs) / 60_000));
  }

  private orderPickupPoint(order: Order): { lat: number; lng: number } | null {
    if (order.parcelJson) return { lat: order.parcelJson.sender.address.lat, lng: order.parcelJson.sender.address.lng };
    if (order.errandJson) return { lat: order.errandJson.shopLat, lng: order.errandJson.shopLng };
    if (order.pickupJson) return { lat: order.pickupJson.lat, lng: order.pickupJson.lng };
    return null;
  }

  private orderDropPoint(order: Order): { lat: number; lng: number } {
    if (order.parcelJson) return { lat: order.parcelJson.recipient.address.lat, lng: order.parcelJson.recipient.address.lng };
    return { lat: order.addressJson.lat, lng: order.addressJson.lng };
  }

  private async fetchRiderProjection(order: Order): Promise<RiderProjection | null> {
    if (!order.riderId) return null;
    const [riderMeta, liveLocation] = await Promise.all([
      internalFetch(`${serviceUrl('dispatch')}/internal/riders/${order.riderId}`)
        .then((res) => (res.ok ? res.json() : null))
        .catch(() => null),
      internalFetch(`${serviceUrl('tracking')}/tracking/internal/orders/${order.id}/rider`)
        .then((res) => (res.ok ? res.json() : null))
        .catch(() => null),
    ]);
    const rider = riderMeta as { id?: string; name?: string; phone?: string; lat?: number | null; lng?: number | null } | null;
    const loc = liveLocation as { lat?: number; lng?: number; ts?: string } | null;
    const lat = loc?.lat ?? rider?.lat ?? 0;
    const lng = loc?.lng ?? rider?.lng ?? 0;
    return {
      id: order.riderId,
      name: rider?.name ?? order.riderId,
      phone: rider?.phone ?? '',
      lat,
      lng,
      locationUpdatedAt: loc?.ts ?? null,
    };
  }

  private toCreated(order: Order, p: OrderCreatePayload): CreatedOrder {
    return {
      orderId: order.id,
      vendorId: order.vendorId,
      vendorName: order.vendorName,
      vendorType: order.vendorType as never,
      serviceCode: order.serviceCode,
      feePolicyVersion: order.feePolicyVersion,
      serviceLevel: order.serviceLevel,
      status: order.status,
      paymentMethod: order.paymentMethod,
      subtotalPesewas: order.subtotalPesewas,
      deliveryFeePesewas: order.deliveryFeePesewas,
      serviceFeePesewas: order.serviceFeePesewas,
      commissionBps: order.commissionBps ?? 0,
      totalPesewas: order.totalPesewas,
      promotionId: order.promotionId,
      promotionTitle: order.promotionTitle,
      promotionDiscountPesewas: order.promotionDiscountPesewas,
      tipPesewas: order.tipPesewas ?? 0,
      prepTimeMin: order.prepTimeMin,
    };
  }

  /**
   * Admin override of the order state machine (force_state, dual-controlled).
   *
   * Hardened against the money-integrity failure modes of the original:
   *  - No-op and terminal-state targets are refused, so an order can never be forced
   *    twice — which used to double-post the ledger (rider fee, COD receivable, vendor
   *    earning, bonus) through a second ORDER_DELIVERED event.
   *  - Legal targets go through `transition()`, so stock consume/release, promotion
   *    release, errand/parcel sync, timestamps and the audit event all run exactly as
   *    they do on the normal path.
   *  - Illegal targets (e.g. CONFIRMED → DELIVERED) fall back to a direct write but still
   *    run the same side-effect hooks the machine would have run, and still publish the
   *    state event so ledger/dispatch/catalog/notification react.
   */
  async adminForceStateTransition(
    orderId: string,
    targetStatus: OrderStatus,
    reason: string,
    adminUserId: string,
  ): Promise<OrderStatusDto> {
    const order = await this.orders.findOne({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');

    if (order.status === targetStatus) {
      throw new ConflictException(`Order is already ${targetStatus}`);
    }

    // Terminal orders must never be force-moved: forcing DELIVERED → CANCELLED or
    // DELIVERED → DELIVERED would re-fire the money events (ledger double-post).
    // FAILED_DELIVERY keeps its one legal machine exit (→ CANCELLED) below.
    const hardTerminal = [OrderStatus.DELIVERED, OrderStatus.CANCELLED, OrderStatus.REJECTED] as const;
    if ((hardTerminal as readonly OrderStatus[]).includes(order.status)) {
      throw new ConflictException(`Order is already terminal (${order.status}) — no further state changes are allowed`);
    }
    if (order.status === OrderStatus.FAILED_DELIVERY && targetStatus !== OrderStatus.CANCELLED) {
      throw new ConflictException(`A failed delivery may only move to CANCELLED (got ${targetStatus})`);
    }

    if (canTransition(order.status, targetStatus)) {
      // Legal transition: full side effects, timestamps, audit, and lifecycle events.
      await this.transition(orderId, targetStatus, `admin:${adminUserId}`, { forced: true, reason });
    } else {
      // Illegal override: run the side-effect hooks the machine would have run.
      if (targetStatus === OrderStatus.PICKED_UP || targetStatus === OrderStatus.DELIVERED) {
        await this.consumeCatalogStock(orderId).catch(() => undefined);
      }
      if (targetStatus === OrderStatus.CANCELLED || targetStatus === OrderStatus.REJECTED) {
        await this.releaseCatalogStock(orderId).catch(() => undefined);
        await this.releaseCatalogPromotion(orderId).catch(() => undefined);
      }
      const prevStatus = order.status;
      order.status = targetStatus;
      if (targetStatus === OrderStatus.ACCEPTED) order.acceptedAt = new Date();
      if (targetStatus === OrderStatus.READY_FOR_PICKUP) order.readyAt = new Date();
      if (targetStatus === OrderStatus.PICKED_UP) order.pickedUpAt = new Date();
      if (targetStatus === OrderStatus.DELIVERED) order.deliveredAt = new Date();
      if (targetStatus === OrderStatus.CANCELLED || targetStatus === OrderStatus.REJECTED) {
        order.cancelledAt = new Date();
        order.cancelReason = reason;
        if (order.errandJson && order.errandJson.errandStatus !== ErrandStatus.DELIVERED) {
          order.errandJson.errandStatus = targetStatus === OrderStatus.CANCELLED ? ErrandStatus.CANCELLED : ErrandStatus.FAILED;
        }
        if (order.parcelJson) {
          order.parcelJson.parcelStatus = 'CANCELLED';
        }
      }
      if (targetStatus === OrderStatus.DELIVERED) {
        if (order.errandJson) order.errandJson.errandStatus = ErrandStatus.DELIVERED;
        if (order.parcelJson) {
          order.parcelJson.parcelStatus = 'DELIVERED';
          order.parcelJson.deliveredAt = new Date().toISOString();
        }
      }
      await this.orders.save(order);
      await this.recordEvent(orderId, prevStatus, targetStatus, `admin:${adminUserId}`, { forced: true, reason });
      // The machine publishes these four itself; publish them for the override path too.
      if (targetStatus === OrderStatus.PICKED_UP) {
        await this.bus.publish(EVENTS.ORDER_PICKED_UP, {
          orderId: order.id, checkoutId: order.checkoutId, status: targetStatus, vendorId: order.vendorId,
          customerId: order.customerId, paymentMethod: order.paymentMethod, amountPesewas: order.totalPesewas,
          forced: true,
        });
      } else if (targetStatus === OrderStatus.OUT_FOR_DELIVERY) {
        await this.bus.publish(EVENTS.ORDER_OUT_FOR_DELIVERY, {
          orderId: order.id, checkoutId: order.checkoutId, status: targetStatus, vendorId: order.vendorId,
          customerId: order.customerId, paymentMethod: order.paymentMethod, amountPesewas: order.totalPesewas,
          forced: true,
        });
      } else if (targetStatus === OrderStatus.OTP_VERIFIED) {
        await this.bus.publish(EVENTS.ORDER_OTP_VERIFIED, {
          orderId: order.id, checkoutId: order.checkoutId, status: targetStatus, vendorId: order.vendorId,
          customerId: order.customerId, paymentMethod: order.paymentMethod, amountPesewas: order.totalPesewas,
          forced: true,
        });
      } else if (targetStatus === OrderStatus.FAILED_DELIVERY) {
        await this.bus.publish(EVENTS.ORDER_FAILED_DELIVERY, {
          orderId: order.id, checkoutId: order.checkoutId, status: targetStatus, vendorId: order.vendorId,
          customerId: order.customerId, paymentMethod: order.paymentMethod, amountPesewas: order.totalPesewas,
          forced: true,
        });
      }
    }

    // Caller-side events for the targets the machine does not publish itself.
    const saved = await this.orders.findOneOrFail({ where: { id: orderId } });
    const base = {
      orderId: saved.id, checkoutId: saved.checkoutId, status: saved.status, vendorId: saved.vendorId,
      customerId: saved.customerId, paymentMethod: saved.paymentMethod, amountPesewas: saved.totalPesewas,
      forced: true,
    };
    switch (targetStatus) {
      case OrderStatus.CONFIRMED:
        await this.bus.publish(EVENTS.ORDER_CONFIRMED, { ...base });
        break;
      case OrderStatus.ACCEPTED:
        await this.bus.publish(EVENTS.ORDER_ACCEPTED, { ...base });
        break;
      case OrderStatus.PREPARING:
        await this.bus.publish(EVENTS.ORDER_PREP_STARTED, { ...base });
        break;
      case OrderStatus.READY_FOR_PICKUP:
        await this.bus.publish(EVENTS.ORDER_READY_FOR_PICKUP, { ...base });
        break;
      case OrderStatus.DELIVERED:
        await this.bus.publish(EVENTS.ORDER_DELIVERED, { ...base, reason });
        break;
      case OrderStatus.CANCELLED:
        await this.bus.publish(EVENTS.ORDER_CANCELLED, { ...base, reason });
        break;
      case OrderStatus.REJECTED:
        await this.bus.publish(EVENTS.ORDER_REJECTED, { ...base, reason });
        break;
      default:
        break; // PICKED_UP / OUT_FOR_DELIVERY / OTP_VERIFIED / FAILED_DELIVERY already published
    }

    return this.getOrder(orderId);
  }
}

export function hash(s: string): string {
  return createHash('sha256').update(s).digest('hex');
}
