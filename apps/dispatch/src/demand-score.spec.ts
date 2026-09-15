import { scoreDemandZones } from './demand-score';

describe('demand-zone scorer', () => {
  const zones = [
    { zoneId: 'busy', zoneName: 'Busy area', centerLat: 5.1, centerLng: -1.25, radiusMeters: 1000 },
    { zoneId: 'quiet', zoneName: 'Quiet area', centerLat: 5.12, centerLng: -1.28, radiusMeters: 1000 },
  ];
  const now = new Date('2026-08-16T12:00:00.000Z');

  it('prefers fresh demand with backlog over a historically popular but oversupplied area', () => {
    const result = scoreDemandZones({
      zones,
      now,
      riderLat: 5.105,
      riderLng: -1.25,
      orders: [
        { createdAt: new Date('2026-08-16T11:55:00.000Z'), pickupLat: 5.1, pickupLng: -1.25, serviceType: 'FOOD', status: 'READY_FOR_PICKUP' },
        { createdAt: new Date('2026-08-16T11:50:00.000Z'), pickupLat: 5.101, pickupLng: -1.249, serviceType: 'MARKET', status: 'WAITING_FOR_RIDER' },
        { createdAt: new Date('2026-08-16T11:40:00.000Z'), pickupLat: 5.102, pickupLng: -1.251, serviceType: 'FOOD', status: 'DELIVERED' },
      ],
      riders: [
        { lat: 5.1, lng: -1.25, status: 'AVAILABLE' },
        { lat: 5.101, lng: -1.251, status: 'AVAILABLE' },
        { lat: 5.102, lng: -1.252, status: 'AVAILABLE' },
        { lat: 5.103, lng: -1.253, status: 'AVAILABLE' },
      ],
    });

    expect(result[0].zoneId).toBe('busy');
    expect(result[0].unassignedOrdersNearby).toBeGreaterThan(0);
    expect(result[0].serviceTypes).toEqual(expect.arrayContaining(['FOOD', 'MARKET']));
    expect(result[0].confidence).toBe('MEDIUM');
  });

  it('uses same-weekday historical activity as a weaker forecast signal', () => {
    const result = scoreDemandZones({
      zones: [zones[1]],
      now: new Date('2026-08-16T11:00:00.000Z'),
      riderLat: 5.12,
      riderLng: -1.28,
      orders: [
        { createdAt: new Date('2026-08-09T11:05:00.000Z'), pickupLat: 5.12, pickupLng: -1.28, serviceType: 'GROCERY', status: 'DELIVERED' },
        { createdAt: new Date('2026-08-09T11:20:00.000Z'), pickupLat: 5.121, pickupLng: -1.279, serviceType: 'GROCERY', status: 'DELIVERED' },
        { createdAt: new Date('2026-08-09T11:35:00.000Z'), pickupLat: 5.12, pickupLng: -1.28, serviceType: 'GROCERY', status: 'DELIVERED' },
        { createdAt: new Date('2026-08-09T12:00:00.000Z'), pickupLat: 5.12, pickupLng: -1.28, serviceType: 'GROCERY', status: 'DELIVERED' },
        { createdAt: new Date('2026-08-09T12:20:00.000Z'), pickupLat: 5.12, pickupLng: -1.28, serviceType: 'GROCERY', status: 'DELIVERED' },
      ],
      riders: [],
    });

    expect(result[0].expectedOrdersNext30Min).toBeGreaterThan(0);
    expect(result[0].confidence).toBe('MEDIUM');
  });

  it('marks a zone low-confidence when it has no fresh activity and retains the no-guarantee signal', () => {
    const result = scoreDemandZones({
      zones: [zones[1]],
      now,
      riderLat: 5.12,
      riderLng: -1.28,
      orders: [],
      riders: [],
    });

    expect(result[0].demandLevel).toBe('LOW');
    expect(result[0].confidence).toBe('LOW');
    expect(result[0].expectedOrdersNext30Min).toBe(0);
  });
});
