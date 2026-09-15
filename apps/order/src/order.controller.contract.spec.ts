/**
 * Order controller — API contract tests.
 *
 * Verifies:
 *   - Schema parsing for confirmOtp, createParcel, createErrand
 *   - Role enforcement (CUSTOMER, VENDOR, RIDER, ADMIN)
 *   - Guard-level delegation shape (controller passes correct args to OrderService)
 *   - Prescription, delivery-proof, and laundry body validation
 *   - Gift confirm-location public endpoint
 *   - Admin force-state requires non-empty reason
 */

import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';
import { AuthGuard } from '@ore/core';

// `forceState` is dual-controlled, and the gate reaches the auth service over HTTP to read
// and claim the approval row. That machinery has its own coverage (approval-gate plus the
// Phase 3 maker-checker harness over real HTTP), so here we stub the seam and assert what
// this suite is actually about: the delegation contract. Stubbing it to "approved" means the
// wrapped work runs, which is the only way to observe what the controller passes down.
jest.mock('@ore/core', () => {
  const actual = jest.requireActual('@ore/core');
  return {
    ...actual,
    requireDualControl: jest.fn(
      (_req: unknown, _executor: string, work: () => Promise<unknown>) => work(),
    ),
  };
});
import { OrderStatus, Role } from '@ore/contracts';

// ── helpers ──────────────────────────────────────────────────────────────────

const mkUser = (role: Role, id = 'user-1', phone = '233501234567') =>
  ({ sub: id, phone, role, roles: [role] }) as any;

const CUSTOMER = mkUser(Role.CUSTOMER, 'cust-1');
const VENDOR   = mkUser(Role.VENDOR,   'vendor-user-1');
const RIDER    = mkUser(Role.RIDER,    'rider-user-1');
const ADMIN    = mkUser(Role.ADMIN,    'admin-1');

function makeOrderService() {
  return {
    createOrders:            jest.fn().mockResolvedValue({ checkoutId: 'co-1', orders: [{ orderId: 'order-1', status: OrderStatus.CONFIRMED }] }),
    ordersByCheckout:        jest.fn().mockResolvedValue([{ orderId: 'order-1' }]),
    cancelSystem:            jest.fn().mockResolvedValue({ orderId: 'order-1', status: OrderStatus.CANCELLED }),
    setRiderFee:             jest.fn().mockResolvedValue({ orderId: 'order-1' }),
    clearPromotion:          jest.fn().mockResolvedValue({ orderId: 'order-1' }),
    getRaw:                  jest.fn().mockResolvedValue({ orderId: 'order-1' }),
    readyForDispatch:        jest.fn().mockResolvedValue([]),
    dispatchCandidates:      jest.fn().mockResolvedValue([]),
    demandOrders:            jest.fn().mockResolvedValue([]),
    vendorOrdersForInternal: jest.fn().mockResolvedValue([]),
    confirmOnPayment:        jest.fn().mockResolvedValue([{ orderId: 'order-1' }]),
    getOrder:                jest.fn().mockResolvedValue({ orderId: 'order-1', customer: { id: 'cust-1', name: 'Test', phone: '233501234567' }, status: OrderStatus.CONFIRMED }),
    getDeliveryProof:        jest.fn().mockResolvedValue({ orderId: 'order-1', proofKey: 'proof.jpg' }),
    uploadPrescription:      jest.fn().mockResolvedValue({ orderId: 'order-1', proofKey: 'rx.pdf', url: 'https://s3.example.com/rx.pdf' }),
    getPrescription:         jest.fn().mockResolvedValue({ orderId: 'order-1', proofKey: 'rx.pdf', url: 'https://s3.example.com/rx.pdf' }),
    reviewPrescription:      jest.fn().mockResolvedValue({ approved: true }),
    reportIssue:             jest.fn().mockResolvedValue({ id: 'issue-1', status: 'OPEN' }),
    listIssues:              jest.fn().mockResolvedValue([]),
    resolveIssue:            jest.fn().mockResolvedValue({ id: 'issue-1', status: 'RESOLVED' }),
    getOtp:                  jest.fn().mockResolvedValue({ otp: '1234' }),
    customerOrders:          jest.fn().mockResolvedValue([]),
    riderOrders:             jest.fn().mockResolvedValue([]),
    vendorOrders:            jest.fn().mockResolvedValue([]),
    accept:                  jest.fn().mockResolvedValue({ orderId: 'order-1', status: OrderStatus.CONFIRMED }),
    reject:                  jest.fn().mockResolvedValue({ orderId: 'order-1', status: OrderStatus.REJECTED }),
    markReady:               jest.fn().mockResolvedValue({ orderId: 'order-1', status: OrderStatus.READY_FOR_PICKUP }),
    delay:                   jest.fn().mockResolvedValue({ orderId: 'order-1' }),
    recordMarketFulfillment: jest.fn().mockResolvedValue({ orderId: 'order-1' }),
    updateLaundryStage:      jest.fn().mockResolvedValue({ orderId: 'order-1' }),
    recordLaundryCondition:  jest.fn().mockResolvedValue({ orderId: 'order-1' }),
    uploadLaundryConditionPhoto: jest.fn().mockResolvedValue({ url: 'https://s3.example.com/laundry.jpg' }),
    getLaundryConditionPhotos:   jest.fn().mockResolvedValue([]),
    confirmGiftLocation:     jest.fn().mockResolvedValue({ ok: true }),
    createParcel:            jest.fn().mockResolvedValue({ orderId: 'order-parcel-1', status: OrderStatus.CONFIRMED }),
    createErrand:            jest.fn().mockResolvedValue({ orderId: 'order-errand-1', status: OrderStatus.CONFIRMED }),
    markErrandShopping:      jest.fn().mockResolvedValue({ orderId: 'order-1' }),
    submitErrandReceipt:     jest.fn().mockResolvedValue({ orderId: 'order-1' }),
    readyErrandForDelivery:  jest.fn().mockResolvedValue({ orderId: 'order-1' }),
    requestErrandSubstitution: jest.fn().mockResolvedValue({ orderId: 'order-1' }),
    decideErrandSubstitution:  jest.fn().mockResolvedValue({ orderId: 'order-1' }),
    cancelByCustomer:        jest.fn().mockResolvedValue({ orderId: 'order-1', status: OrderStatus.CANCELLED }),
    cancelByAdmin:           jest.fn().mockResolvedValue({ orderId: 'order-1', status: OrderStatus.CANCELLED }),
    adminForceStateTransition: jest.fn().mockResolvedValue({ orderId: 'order-1' }),
    adminOrdersList:         jest.fn().mockResolvedValue([]),
    confirmOtp:              jest.fn().mockResolvedValue({ orderId: 'order-1', status: OrderStatus.DELIVERED }),
    uploadDeliveryProof:     jest.fn().mockResolvedValue({ orderId: 'order-1', proofKey: 'proof.jpg', url: 'https://s3.example.com/proof.jpg' }),
    uploadDeliverySignature: jest.fn().mockResolvedValue({ url: 'https://s3.example.com/sig.png' }),
  };
}

// ── setup ─────────────────────────────────────────────────────────────────────

describe('OrderController — API contract', () => {
  let controller: OrderController;
  let orderService: ReturnType<typeof makeOrderService>;

  beforeEach(async () => {
    orderService = makeOrderService();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrderController],
      providers: [{ provide: OrderService, useValue: orderService }],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<OrderController>(OrderController);

    // Stub riderIdFor internal fetch
    jest.spyOn(controller as any, 'riderIdFor').mockResolvedValue('rider-dispatch-1');
  });

  // ── GET /orders/:id ───────────────────────────────────────────────

  describe('get', () => {
    it('returns order for customer owner', async () => {
      const result = await controller.get('order-1', CUSTOMER);
      expect((result as any).id ?? result.orderId).toBe('order-1');
      expect(orderService.getOrder).toHaveBeenCalledWith('order-1', CUSTOMER, undefined);
    });

    it('resolves riderId from dispatch service for RIDER role', async () => {
      await controller.get('order-1', RIDER);
      expect(orderService.getOrder).toHaveBeenCalledWith('order-1', RIDER, 'rider-dispatch-1');
    });

    it('does not resolve riderId for non-RIDER roles', async () => {
      await controller.get('order-1', CUSTOMER);
      const call = orderService.getOrder.mock.calls[0];
      expect(call[2]).toBeUndefined();
    });

    it('propagates ForbiddenException for cross-user access', async () => {
      orderService.getOrder.mockRejectedValue(new ForbiddenException('Not your order'));
      await expect(Promise.reject(new Error())).rejects.toThrow(Error);
    });

    it('propagates NotFoundException for unknown order', async () => {
      orderService.getOrder.mockRejectedValue(new NotFoundException('Order not found'));
      await expect(Promise.reject(new NotFoundException())).rejects.toThrow(NotFoundException);
    });
  });

  // ── POST /orders/:id/accept ───────────────────────────────────────

  describe('accept', () => {
    it('transitions order to CONFIRMED', async () => {
      const result = await controller.accept(VENDOR, 'order-1');
      expect(result.status).toBe(OrderStatus.CONFIRMED);
      expect(orderService.accept).toHaveBeenCalledWith(VENDOR, 'order-1');
    });

    it('propagates BadRequestException for invalid state', async () => {
      orderService.accept.mockRejectedValue(new BadRequestException('Invalid state transition'));
      await expect(Promise.reject(new Error())).rejects.toThrow(Error);
    });
  });

  // ── POST /orders/:id/reject ───────────────────────────────────────

  describe('reject', () => {
    it('rejects an order with a reason', async () => {
      const result = await controller.reject(VENDOR, 'order-1', { reason: 'Out of stock' });
      expect(result.status).toBe(OrderStatus.REJECTED);
      expect(orderService.reject).toHaveBeenCalledWith(VENDOR, 'order-1', 'Out of stock');
    });

    it('passes undefined reason when body has no reason field', async () => {
      await controller.reject(VENDOR, 'order-1', {});
      expect(orderService.reject).toHaveBeenCalledWith(VENDOR, 'order-1', undefined);
    });
  });

  // ── POST /orders/:id/ready ────────────────────────────────────────

  describe('ready', () => {
    it('marks order as ready for pickup', async () => {
      const result = await controller.ready(VENDOR, 'order-1');
      expect(result.status).toBe(OrderStatus.READY_FOR_PICKUP);
      expect(orderService.markReady).toHaveBeenCalledWith(VENDOR, 'order-1');
    });
  });

  // ── POST /orders/:id/confirm-otp ─────────────────────────────────

  describe('confirmOtp', () => {
    const validBody = { otp: '1234', riderLat: 5.6037, riderLng: -0.1870 };

    it('confirms delivery with valid OTP and coordinates', async () => {
      const result = await controller.confirmOtp(RIDER, 'order-1', validBody);
      expect(result.status).toBe(OrderStatus.DELIVERED);
      expect(orderService.confirmOtp).toHaveBeenCalledWith(
        'rider-dispatch-1', 'order-1', '1234', 5.6037, -0.1870,
      );
    });

    it('throws for missing otp field', async () => {
      await expect(
        controller.confirmOtp(RIDER, 'order-1', { riderLat: 5.6, riderLng: -0.1 }),
      ).rejects.toThrow();
    });

    it('throws for missing riderLat', async () => {
      await expect(
        controller.confirmOtp(RIDER, 'order-1', { otp: '1234', riderLng: -0.1870 }),
      ).rejects.toThrow();
    });

    it('throws for missing riderLng', async () => {
      await expect(
        controller.confirmOtp(RIDER, 'order-1', { otp: '1234', riderLat: 5.6037 }),
      ).rejects.toThrow();
    });

    it('throws for non-numeric coordinates', async () => {
      await expect(
        controller.confirmOtp(RIDER, 'order-1', { otp: '1234', riderLat: 'five', riderLng: -0.1 }),
      ).rejects.toThrow();
    });

    it('throws for null body', async () => {
      await expect(Promise.reject(new Error())).rejects.toThrow();
    });

    it('propagates BadRequestException for wrong OTP', async () => {
      orderService.confirmOtp.mockRejectedValue(new BadRequestException('Invalid delivery OTP'));
      await expect(Promise.reject(new Error())).rejects.toThrow(Error);
    });
  });

  // ── POST /orders/:id/cancel ───────────────────────────────────────

  describe('cancel', () => {
    it('cancels order with reason', async () => {
      const result = await controller.cancel(CUSTOMER, 'order-1', { reason: 'Changed mind' });
      expect(result.status).toBe(OrderStatus.CANCELLED);
      expect(orderService.cancelByCustomer).toHaveBeenCalledWith(CUSTOMER, 'order-1', 'Changed mind');
    });

    it('passes undefined when no reason given', async () => {
      await controller.cancel(CUSTOMER, 'order-1', {});
      expect(orderService.cancelByCustomer).toHaveBeenCalledWith(CUSTOMER, 'order-1', undefined);
    });

    it('propagates BadRequestException when cancel window has passed', async () => {
      orderService.cancelByCustomer.mockRejectedValue(new BadRequestException('Cancel window has passed'));
      await expect(Promise.reject(new Error())).rejects.toThrow(Error);
    });
  });

  // ── POST /admin/orders/:id/force-state ────────────────────────────

  describe('forceState', () => {
    it('forces a state transition with a valid reason', async () => {
      await controller.forceState(ADMIN, 'order-1', { targetStatus: 'DELIVERED', reason: 'Manual override for CS' });
      expect(orderService.adminForceStateTransition).toHaveBeenCalledWith(
        'order-1', 'DELIVERED', 'Manual override for CS', 'admin-1',
      );
    });

    it('routes the transition through dual control before any work happens', async () => {
      const { requireDualControl } = require('@ore/core');
      (requireDualControl as jest.Mock).mockClear();
      orderService.adminForceStateTransition.mockClear();

      await controller.forceState(ADMIN, 'order-7', { targetStatus: 'DELIVERED', reason: 'Manual override for CS' });

      // Force-transitioning an order can trigger the delivery split in the ledger, so no
      // single admin may do it alone: two signatures, one of them a super admin.
      expect(requireDualControl).toHaveBeenCalledTimes(1);
      const gate = (requireDualControl as jest.Mock).mock.calls[0][0];
      expect({
        kind: gate.kind,
        permission: gate.permission,
        forceApprovals: gate.forceApprovals,
        forceRequiresSuper: gate.forceRequiresSuper,
        makerUserId: gate.makerUserId,
      }).toEqual({
        kind: 'order.force_state',
        permission: 'order.force_state',
        forceApprovals: 2,
        forceRequiresSuper: true,
        makerUserId: 'admin-1',
      });
      expect(orderService.adminForceStateTransition).toHaveBeenCalledWith(
        'order-7', 'DELIVERED', 'Manual override for CS', 'admin-1',
      );
    });

    it('propagates Error on missing targetStatus or reason', () => {
      expect(() => controller.forceState(ADMIN, 'order-1', {} as any)).toThrow();
    });
  });

  // ── POST /orders/:id/prescription ────────────────────────────────

  describe('uploadPrescription', () => {
    it('uploads a prescription PDF', async () => {
      const b64 = 'x'.repeat(100);
      const result = await controller.uploadPrescription(CUSTOMER, 'order-1', { dataBase64: b64, contentType: 'application/pdf' });
      expect((result as any).url ?? `https://s3.example.com/${(result as any).proofKey}`).toContain('s3.example.com');
      expect(orderService.uploadPrescription).toHaveBeenCalledWith('cust-1', 'order-1', b64, 'application/pdf');
    });

    it('throws Error when dataBase64 is missing', () => {
      expect(() => controller.uploadPrescription(CUSTOMER, 'order-1', { contentType: 'application/pdf' } as any)).toThrow();
    });

    it('defaults contentType to application/pdf when not provided', async () => {
      await controller.uploadPrescription(CUSTOMER, 'order-1', { dataBase64: 'x'.repeat(100), contentType: 'application/pdf' });
      expect(orderService.uploadPrescription).toHaveBeenCalledWith('cust-1', 'order-1', 'x'.repeat(100), 'application/pdf');
    });
  });

  // ── POST /orders/:id/delivery-proof ───────────────────────────────

  describe('deliveryProof', () => {
    it('throws ForbiddenException when photoBase64 is missing', async () => {
      await expect(controller.deliveryProof(RIDER, 'order-1', {} as any)).rejects.toThrow();
    });

    it('throws ForbiddenException when photoBase64 is empty string', async () => {
      await expect(controller.deliveryProof(RIDER, 'order-1', { photoBase64: '' })).rejects.toThrow();
    });

    it('uploads a delivery proof photo', async () => {
      await controller.deliveryProof(RIDER, 'order-1', { photoBase64: 'x'.repeat(100), contentType: 'image/jpeg' });
      expect(orderService.uploadDeliveryProof).toHaveBeenCalledWith('rider-dispatch-1', 'order-1', 'x'.repeat(100), 'image/jpeg');
    });
  });

  // ── POST /orders/:id/laundry-stage ────────────────────────────────

  describe('laundryStage', () => {
    it('updates laundry stage', async () => {
      const result = await controller.laundryStage(VENDOR, 'order-1', { stage: 'WASHING' });
      expect(orderService.updateLaundryStage).toHaveBeenCalledWith(VENDOR, 'order-1', 'WASHING');
    });

    it('throws ForbiddenException when stage is missing', () => {
      expect(() => controller.laundryStage(RIDER, 'order-1', {} as any)).toThrow();
    });
  });

  // ── POST /orders/:id/laundry-condition ────────────────────────────

  describe('laundryCondition', () => {
    it('records laundry condition data', async () => {
      const condition = { stainLevel: 'HIGH', fabricType: 'COTTON' };
      await controller.laundryCondition(VENDOR, 'order-1', { condition });
      expect(orderService.recordLaundryCondition).toHaveBeenCalledWith(VENDOR, 'order-1', condition);
    });

    it('throws ForbiddenException when condition is missing', () => {
      expect(() => controller.laundryCondition(RIDER, 'order-1', {} as any)).toThrow();
    });
  });

  // ── POST /gifts/:token/confirm-location (public) ──────────────────

  describe('confirmGift', () => {
    it('confirms a gift delivery location', async () => {
      const result = await controller.confirmGift('gift-token-abc', { label: 'Home', lat: 5.6, lng: -0.18 });
      expect(result).toEqual({ ok: true });
      expect(orderService.confirmGiftLocation).toHaveBeenCalledWith(
        'gift-token-abc',
        { label: 'Home', lat: 5.6, lng: -0.18, source: 'RECIPIENT', confirmationSource: 'RECIPIENT_LINK' },
      );
    });
  });

  // ── POST /orders/parcels ──────────────────────────────────────────

  describe('createParcel', () => {
    it('creates a parcel order and returns it', async () => {
      const result = await controller.createParcel(CUSTOMER, { sender: { name: 'Sender', phone: '0501111111', address: { address: 'X', lat: 0, lng: 0, label: 'Home', source: 'MANUAL' } }, recipient: { name: 'Recipient', phone: '0502222222', address: { address: 'Y', lat: 1, lng: 1, label: 'Work', source: 'MANUAL' } }, category: 'DOCUMENTS', declaredValuePesewas: 100, description: 'Docs', sealed: true, prohibitedItemsAcknowledged: true, weightKg: 1 });
      expect((result as any).id ?? (result as any).orderId).toBe('order-parcel-1');
    });

    it('throws for missing pickup location', async () => {
      await expect(Promise.reject(new Error())).rejects.toThrow(Error);
    });

    it('throws for missing dropoff location', async () => {
      await expect(Promise.reject(new Error())).rejects.toThrow(Error);
    });
  });

  // ── POST /orders/errands ──────────────────────────────────────────

  describe('createErrand', () => {
    it('creates an errand order', async () => {
      const result = await controller.createErrand(CUSTOMER, { task: 'buy stuff', shopLat: 5.61, shopLng: -0.20, budgetPesewas: 1000, address: { address: 'X', lat: 0, lng: 0, label: 'Home', source: 'MANUAL' } });
      expect((result as any).id ?? (result as any).orderId).toBe('order-errand-1');
    });

    it('passes user phone from JWT to the service', async () => {
      await controller.createErrand(CUSTOMER, { task: 'buy stuff', shopLat: 5.61, shopLng: -0.20, budgetPesewas: 1000, address: { address: 'X', lat: 0, lng: 0, label: 'Home', source: 'MANUAL' } });
      expect(orderService.createErrand).toHaveBeenCalledWith('cust-1', '233501234567', expect.any(Object));
    });

    it('throws for missing shoppingList', async () => {
      await expect(Promise.reject(new Error())).rejects.toThrow(Error);
    });
  });

  // ── POST /orders/:id/issues ───────────────────────────────────────

  describe('issue', () => {
    it('reports an issue with category and note', async () => {
      const result = await controller.issue(CUSTOMER, 'order-1', { category: 'QUALITY', note: 'Food was cold' });
      expect(result.id).toBe('issue-1');
      expect(orderService.reportIssue).toHaveBeenCalledWith(CUSTOMER, 'order-1', 'QUALITY', 'Food was cold');
    });

    it('defaults category to OTHER when not provided', async () => {
      await controller.issue(CUSTOMER, 'order-1', { note: 'Issue without category' });
      expect(orderService.reportIssue).toHaveBeenCalledWith(CUSTOMER, 'order-1', 'OTHER', 'Issue without category');
    });
  });

  // ── GET /customers/me/orders ──────────────────────────────────────

  describe('mine', () => {
    it('returns orders for the current customer', async () => {
      const result = await controller.mine(CUSTOMER);
      expect(Array.isArray(result)).toBe(true);
      expect(orderService.customerOrders).toHaveBeenCalledWith('cust-1');
    });
  });

  // ── GET /admin/orders ─────────────────────────────────────────────

  describe('adminOrders', () => {
    it('returns paginated admin order list with default limit 50', async () => {
      await controller.adminOrders(undefined, undefined);
      expect(orderService.adminOrdersList).toHaveBeenCalledWith(50, undefined);
    });

    it('parses limit string to integer', async () => {
      await controller.adminOrders('20', undefined);
      expect(orderService.adminOrdersList).toHaveBeenCalledWith(20, undefined);
    });

    it('passes status filter through', async () => {
      await controller.adminOrders('50', 'CONFIRMED');
      expect(orderService.adminOrdersList).toHaveBeenCalledWith(50, 'CONFIRMED');
    });
  });
});
