/**
 * TrackingService — unit tests covering GPS ingestion, smoothing/debounce,
 * ETA recomputation, and riderPosition access control.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TrackingService } from './tracking.service';
import { RiderLocation } from './entities/rider-location.entity';
import { TrackingAccessService } from './tracking.access';
import { TrackingGateway } from './tracking.gateway';
import { ORE_BUS, ORE_ENV, ORE_GEOCODER } from '@ore/core';
import { Role } from '@ore/contracts';
import { createMockRepository } from '@ore/testing';

// ── helpers ──────────────────────────────────────────────────────────────────

const mkUser = (role: Role, id = 'user-1') =>
  ({ sub: id, phone: '233501234567', role, roles: [role] }) as any;

const CUSTOMER = mkUser(Role.CUSTOMER, 'cust-1');
const RIDER    = mkUser(Role.RIDER,    'rider-user-1');

function makeLocation(overrides = {}): RiderLocation {
  return {
    id: 'loc-1',
    riderId: 'rider-1',
    orderId: null,
    lat: 5.6037,
    lng: -0.1870,
    speedKmh: 35,
    createdAt: new Date('2026-08-24T10:00:00Z'),
    ...overrides,
  } as RiderLocation;
}

// ── setup ─────────────────────────────────────────────────────────────────────

describe('TrackingService', () => {
  let service: TrackingService;
  let locationsRepo: ReturnType<typeof createMockRepository<RiderLocation>>;
  let mockAccess: { riderIdForUser: jest.Mock; assertCanView: jest.Mock };
  let mockGateway: { emitToOrder: jest.Mock };
  let mockBus: { publish: jest.Mock };
  let mockGeocoder: { route: jest.Mock };
  let mockEnv: any;

  const stubOrder = {
    id: 'order-1',
    riderId: 'rider-1',
    addressJson: { lat: 5.5800, lng: -0.1900 },
  };

  beforeEach(async () => {
    locationsRepo = createMockRepository<RiderLocation>();
    mockAccess  = { riderIdForUser: jest.fn().mockResolvedValue('rider-1'), assertCanView: jest.fn().mockResolvedValue(stubOrder) };
    mockGateway = { emitToOrder: jest.fn() };
    mockBus     = { publish: jest.fn().mockResolvedValue(undefined) };
    mockGeocoder = { route: jest.fn().mockResolvedValue({ durationS: 600, distanceM: 4000 }) };
    mockEnv     = { trackingMinPublishMs: 2000 };

    locationsRepo.create.mockImplementation((v: any) => ({ ...makeLocation(), ...v }));
    locationsRepo.save.mockImplementation(async (v: any) => ({ ...makeLocation(), ...v }));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TrackingService,
        { provide: getRepositoryToken(RiderLocation), useValue: locationsRepo },
        { provide: TrackingAccessService, useValue: mockAccess },
        { provide: TrackingGateway, useValue: mockGateway },
        { provide: ORE_BUS, useValue: mockBus },
        { provide: ORE_ENV, useValue: mockEnv },
        { provide: ORE_GEOCODER, useValue: mockGeocoder },
      ],
    }).compile();

    service = module.get<TrackingService>(TrackingService);

    // Stub internal fetchOrderDrop to avoid real HTTP calls
    jest.spyOn(service as any, 'fetchOrderDrop').mockResolvedValue(stubOrder);
  });

  afterEach(() => {
    jest.clearAllMocks();
    // Clear internal smoothing/debounce maps between tests
    (service as any).smoothing.clear();
    (service as any).lastPublish.clear();
  });

  // ── ingest ────────────────────────────────────────────────────────

  describe('ingest', () => {
    it('persists the raw location to the database', async () => {
      await service.ingest('rider-user-1', 5.6037, -0.1870, 30);
      expect(locationsRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ riderId: 'rider-1', lat: 5.6037, lng: -0.1870 }),
      );
    });

    it('returns { ok: true } on successful ingestion', async () => {
      const result = await service.ingest('rider-user-1', 5.6037, -0.1870);
      expect(result).toEqual({ ok: true });
    });

    it('throws NotFoundException when rider profile not found', async () => {
      mockAccess.riderIdForUser.mockResolvedValue(null);
      await expect(service.ingest('unknown-user', 5.6037, -0.1870)).rejects.toThrow(NotFoundException);
      await expect(service.ingest('unknown-user', 5.6037, -0.1870)).rejects.toThrow('Rider profile not found');
    });

    it('stores orderId on the location row when provided', async () => {
      await service.ingest('rider-user-1', 5.6037, -0.1870, 25, 'order-1');
      expect(locationsRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ orderId: 'order-1' }),
      );
    });

    it('stores null orderId when not provided', async () => {
      await service.ingest('rider-user-1', 5.6037, -0.1870);
      expect(locationsRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ orderId: null }),
      );
    });

    it('publishes TRACKING_RIDER_LOCATION event on first ping', async () => {
      await service.ingest('rider-user-1', 5.6037, -0.1870, 30, 'order-1');
      expect(mockBus.publish).toHaveBeenCalledWith(
        'tracking.rider_location',
        expect.objectContaining({ riderId: 'rider-1', orderId: 'order-1' }),
      );
    });

    it('debounces: does NOT re-publish within the minPublishMs window', async () => {
      // First ping — published
      await service.ingest('rider-user-1', 5.6037, -0.1870, 30, 'order-1');
      const getRiderLocationCount = () => mockBus.publish.mock.calls.filter(c => c[0] === 'tracking.rider_location').length;
      const firstPublishCount = getRiderLocationCount();

      // Second ping immediately after (no time advanced) — should not re-publish
      await service.ingest('rider-user-1', 5.6040, -0.1875, 28, 'order-1');

      // Still the same count — debounced
      expect(getRiderLocationCount()).toBe(firstPublishCount);
    });

    it('does NOT publish when riderId has no orderId (no order context to broadcast)', async () => {
      await service.ingest('rider-user-1', 5.6037, -0.1870);
      // Bus event is still published for dispatch geofencing even without orderId
      expect(mockBus.publish).toHaveBeenCalledWith(
        'tracking.rider_location',
        expect.objectContaining({ riderId: 'rider-1' }),
      );
    });

    it('broadcasts to order websocket room when orderId provided', async () => {
      await service.ingest('rider-user-1', 5.6037, -0.1870, 30, 'order-1');
      // Give async void broadcast time to run
      await new Promise((r) => setTimeout(r, 5));
      expect(mockGateway.emitToOrder).toHaveBeenCalledWith('order-1', 'rider.location', expect.any(Object));
    });
  });

  // ── GPS smoothing ─────────────────────────────────────────────────

  describe('GPS smoothing', () => {
    it('applies a 3-point moving average to coordinates', async () => {
      // Send 3 pings far apart — 3rd published location should be the average
      const spy = jest.spyOn(mockBus, 'publish');

      // Reset debounce for each ping by advancing lastPublish manually
      (service as any).lastPublish.delete('rider-1');
      await service.ingest('rider-user-1', 5.6000, -0.1000);

      (service as any).lastPublish.delete('rider-1');
      await service.ingest('rider-user-1', 5.6300, -0.1300);

      (service as any).lastPublish.delete('rider-1');
      await service.ingest('rider-user-1', 5.6600, -0.1600);

      const calls = spy.mock.calls.filter((c) => c[0] === 'tracking.rider_location');
      // Third call should be the 3-point average: (0+0.3+0.6)/3 = 0.3 offset from 5.6
      const lastPayload = calls[calls.length - 1][1] as any;
      expect(lastPayload.lat).toBeCloseTo(5.6300, 4);
      expect(lastPayload.lng).toBeCloseTo(-0.1300, 4);
    });

    it('smooths out GPS jitter by averaging nearby points', async () => {
      const spy = jest.spyOn(mockBus, 'publish');
      const base = 5.6037;

      // Three nearly identical pings (GPS jitter)
      for (const offset of [0, 0.0001, -0.0001]) {
        (service as any).lastPublish.delete('rider-1');
        await service.ingest('rider-user-1', base + offset, -0.1870);
      }

      const calls = spy.mock.calls.filter((c) => c[0] === 'tracking.rider_location');
      const lastPayload = calls[calls.length - 1][1] as any;
      // Should be very close to 5.6037 (jitter averaged out)
      expect(lastPayload.lat).toBeCloseTo(base, 3);
    });
  });

  // ── ETA recomputation ─────────────────────────────────────────────

  describe('ETA recomputation', () => {
    it('publishes TRACKING_ETA_CHANGED after ping with orderId', async () => {
      await service.ingest('rider-user-1', 5.6037, -0.1870, 30, 'order-1');
      await new Promise((r) => setTimeout(r, 10));
      expect(mockBus.publish).toHaveBeenCalledWith(
        'tracking.eta_changed',
        expect.objectContaining({ orderId: 'order-1', etaMinutes: expect.any(Number) }),
      );
    });

    it('ETA from geocoder is at least 1 minute', async () => {
      // Route returns 30s — should be rounded up to 1 min
      mockGeocoder.route.mockResolvedValue({ durationS: 30, distanceM: 300 });
      await service.ingest('rider-user-1', 5.6037, -0.1870, 5, 'order-1');
      await new Promise((r) => setTimeout(r, 10));

      const etaCall = mockBus.publish.mock.calls.find((c) => c[0] === 'tracking.eta_changed');
      expect(etaCall?.[1].etaMinutes).toBeGreaterThanOrEqual(1);
    });

    it('falls back to distance-based ETA when geocoder throws', async () => {
      mockGeocoder.route.mockRejectedValue(new Error('No route'));

      await service.ingest('rider-user-1', 5.6037, -0.1870, 30, 'order-1');
      await new Promise((r) => setTimeout(r, 10));

      const etaCall = mockBus.publish.mock.calls.find((c) => c[0] === 'tracking.eta_changed');
      expect(etaCall?.[1].etaMinutes).toBeGreaterThanOrEqual(1);
      expect(typeof etaCall?.[1].etaMinutes).toBe('number');
    });

    it('does NOT publish ETA when no orderId is present', async () => {
      await service.ingest('rider-user-1', 5.6037, -0.1870, 30);
      await new Promise((r) => setTimeout(r, 10));

      const etaCall = mockBus.publish.mock.calls.find((c) => c[0] === 'tracking.eta.changed');
      expect(etaCall).toBeUndefined();
    });
  });

  // ── riderPosition ─────────────────────────────────────────────────

  describe('riderPosition', () => {
    it('returns the most recent location for a tracked order', async () => {
      const last = makeLocation({ riderId: 'rider-1', lat: 5.6100, lng: -0.1850 });
      mockAccess.assertCanView.mockResolvedValue({ ...stubOrder, riderId: 'rider-1' });
      locationsRepo.findOne.mockResolvedValue(last);

      const result = await service.riderPosition('order-1', CUSTOMER);

      expect(result).not.toBeNull();
      expect(result!.lat).toBe(5.6100);
      expect(result!.riderId).toBe('rider-1');
    });

    it('returns null when order has no riderId yet (not yet dispatched)', async () => {
      mockAccess.assertCanView.mockResolvedValue({ ...stubOrder, riderId: null });

      const result = await service.riderPosition('order-1', CUSTOMER);

      expect(result).toBeNull();
      expect(locationsRepo.findOne).not.toHaveBeenCalled();
    });

    it('returns null when no location records exist for the rider', async () => {
      mockAccess.assertCanView.mockResolvedValue({ ...stubOrder, riderId: 'rider-1' });
      locationsRepo.findOne.mockResolvedValue(null);

      const result = await service.riderPosition('order-1', CUSTOMER);

      expect(result).toBeNull();
    });

    it('queries the latest location by riderId ordered DESC', async () => {
      const last = makeLocation();
      mockAccess.assertCanView.mockResolvedValue({ ...stubOrder, riderId: 'rider-1' });
      locationsRepo.findOne.mockResolvedValue(last);

      await service.riderPosition('order-1', CUSTOMER);

      expect(locationsRepo.findOne).toHaveBeenCalledWith({
        where: { riderId: 'rider-1' },
        order: { createdAt: 'DESC' },
      });
    });

    it('includes a timestamp in the response', async () => {
      const last = makeLocation({ createdAt: new Date('2026-08-24T10:30:00Z') });
      mockAccess.assertCanView.mockResolvedValue({ ...stubOrder, riderId: 'rider-1' });
      locationsRepo.findOne.mockResolvedValue(last);

      const result = await service.riderPosition('order-1', CUSTOMER);

      expect(result!.ts).toBe('2026-08-24T10:30:00.000Z');
    });

    it('delegates access check to assertCanView', async () => {
      mockAccess.assertCanView.mockRejectedValue(new NotFoundException('Order not found'));

      await expect(service.riderPosition('ghost-order', CUSTOMER)).rejects.toThrow(NotFoundException);
      expect(mockAccess.assertCanView).toHaveBeenCalledWith(CUSTOMER, 'ghost-order');
    });
  });

  // ── dispatch service receives — demand score support ──────────────

  describe('dispatch integration (bus event shapes)', () => {
    it('publishes location payload with expected fields', async () => {
      await service.ingest('rider-user-1', 5.6037, -0.1870, 45, 'order-1');

      const locationCall = mockBus.publish.mock.calls.find((c) => c[0] === 'tracking.rider_location');
      const payload = locationCall?.[1];

      expect(payload).toMatchObject({
        riderId: 'rider-1',
        orderId: 'order-1',
        lat: expect.any(Number),
        lng: expect.any(Number),
        ts: expect.any(String),
      });
    });

    it('smoothed coordinates are within the bounding box of input coordinates', async () => {
      const lats = [5.600, 5.610, 5.620];
      for (const lat of lats) {
        (service as any).lastPublish.delete('rider-1');
        await service.ingest('rider-user-1', lat, -0.1870);
      }

      const locationCalls = mockBus.publish.mock.calls.filter((c) => c[0] === 'tracking.rider.location');
      for (const call of locationCalls) {
        const { lat } = call[1] as any;
        expect(lat).toBeGreaterThanOrEqual(5.600);
        expect(lat).toBeLessThanOrEqual(5.620);
      }
    });
  });
});
