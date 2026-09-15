import { distanceKm } from '@ore/geo';

export interface DemandZoneDefinition {
  zoneId: string;
  zoneName: string;
  centerLat: number;
  centerLng: number;
  radiusMeters: number;
}

export interface DemandOrderSignal {
  createdAt: Date;
  pickupLat: number;
  pickupLng: number;
  serviceType: string;
  status: string;
}

export interface DemandRiderSignal {
  lat: number;
  lng: number;
  status: string;
}

export interface DemandZoneScore {
  zoneId: string;
  zoneName: string;
  centerLat: number;
  centerLng: number;
  radiusMeters: number;
  distanceFromRiderKm: number;
  demandLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  expectedOrdersNext30Min: number;
  expectedWaitMin: { min: number; max: number };
  confidence: 'LOW' | 'MEDIUM' | 'HIGH';
  reason: string;
  onlineRidersNearby: number;
  unassignedOrdersNearby: number;
  serviceTypes: string[];
  score: number;
}

/**
 * Scores positioning areas using both demand and nearby supply. This is kept
 * as a pure function so the weighting and anti-clustering behavior can be
 * tested without a database or a running service.
 */
export function scoreDemandZones(input: {
  zones: DemandZoneDefinition[];
  orders: DemandOrderSignal[];
  riders: DemandRiderSignal[];
  riderLat: number;
  riderLng: number;
  now?: Date;
}): DemandZoneScore[] {
  const now = input.now ?? new Date();
  const scored = input.zones.map((zone) => {
    const radiusKm = zone.radiusMeters / 1000;
    const nearbyOrders = input.orders.filter((order) =>
      !['CANCELLED', 'REJECTED', 'FAILED_DELIVERY'].includes(order.status) &&
      distanceKm(
        { lat: order.pickupLat, lng: order.pickupLng },
        { lat: zone.centerLat, lng: zone.centerLng },
      ) <= radiusKm,
    );
    const recent30 = nearbyOrders.filter((order) => now.getTime() - order.createdAt.getTime() <= 30 * 60_000);
    const recent60 = nearbyOrders.filter((order) => now.getTime() - order.createdAt.getTime() <= 60 * 60_000);
    const historical = nearbyOrders.filter((order) => {
      const age = now.getTime() - order.createdAt.getTime();
      if (age < 24 * 60 * 60_000 || age > 7 * 24 * 60 * 60_000) return false;
      const orderDay = order.createdAt.getUTCDay();
      const nowDay = now.getUTCDay();
      const hourDifference = Math.abs(order.createdAt.getUTCHours() - now.getUTCHours());
      return orderDay === nowDay && hourDifference <= 1;
    });
    const historicalPer30 = historical.length / 7;
    const unassigned = nearbyOrders.filter((order) => ['WAITING_FOR_RIDER', 'READY_FOR_PICKUP'].includes(order.status));
    const ready = nearbyOrders.filter((order) => order.status === 'READY_FOR_PICKUP');
    const onlineRiders = input.riders.filter((rider) =>
      ['AVAILABLE', 'OFFERED'].includes(rider.status) &&
      distanceKm({ lat: rider.lat, lng: rider.lng }, { lat: zone.centerLat, lng: zone.centerLng }) <= radiusKm,
    );
    const serviceTypes = [...new Set(recent60.map((order) => order.serviceType).filter(Boolean))].slice(0, 5);

    // Recent demand is the strongest signal. Ready/unassigned work is given
    // additional weight, while nearby idle supply reduces the recommendation.
    const predicted = Math.max(0, Math.round(Math.max(
      recent30.length * 1.6 + Math.max(0, recent60.length - recent30.length) * 0.4,
      historicalPer30 * 0.7 + recent30.length * 0.8,
    )));
    const score = predicted + ready.length * 1.5 + unassigned.length * 1.25 - onlineRiders.length * 1.4 - distanceKm(
      { lat: input.riderLat, lng: input.riderLng },
      { lat: zone.centerLat, lng: zone.centerLng },
    ) * 0.8;
    const expectedWait = Math.max(5, Math.round(8 + onlineRiders.length * 4 - predicted * 1.5 + unassigned.length * 2));
    const confidence: DemandZoneScore['confidence'] = recent60.length >= 5 || historical.length >= 14
      ? 'HIGH'
      : recent60.length >= 2 || historical.length >= 5
        ? 'MEDIUM'
        : 'LOW';
    const demandLevel: DemandZoneScore['demandLevel'] = score >= 7
      ? 'HIGH'
      : score >= 2.5
        ? 'MEDIUM'
        : 'LOW';
    const distanceFromRiderKm = distanceKm(
      { lat: input.riderLat, lng: input.riderLng },
      { lat: zone.centerLat, lng: zone.centerLng },
    );
    const reason = demandLevel === 'HIGH'
      ? `${serviceTypes.join(' and ') || 'Recent'} demand is high while nearby idle supply is ${onlineRiders.length > 3 ? 'heavy' : 'moderate'}`
      : onlineRiders.length > Math.max(2, recent60.length)
        ? 'Nearby Rider supply is currently higher than fresh demand'
        : recent60.length === 0 && historical.length === 0
          ? 'Not enough recent or historical order activity yet'
          : recent60.length === 0
            ? `${serviceTypes.join(' and ') || 'Historical'} demand is present, but fresh activity is limited`
            : `${serviceTypes.join(' and ') || 'Recent'} demand is moderate`;

    return {
      zoneId: zone.zoneId,
      zoneName: zone.zoneName,
      centerLat: zone.centerLat,
      centerLng: zone.centerLng,
      radiusMeters: zone.radiusMeters,
      distanceFromRiderKm: round1(distanceFromRiderKm),
      demandLevel,
      expectedOrdersNext30Min: predicted,
      expectedWaitMin: { min: expectedWait, max: expectedWait + (confidence === 'HIGH' ? 7 : 12) },
      confidence,
      reason,
      onlineRidersNearby: onlineRiders.length,
      unassignedOrdersNearby: unassigned.length,
      serviceTypes,
      score: round2(score),
    };
  });

  // Always rank by the model score, not by historical order count alone.
  return scored.sort((a, b) => b.score - a.score);
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
