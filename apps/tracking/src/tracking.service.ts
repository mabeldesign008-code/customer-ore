/** Tracking — ingest GPS, fan out via bus (dispatch geofence) + websocket, recompute ETA (G24/G23). */

import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EVENTS, RiderLocationPayload } from '@ore/contracts';
import { distanceKm } from '@ore/geo';
import { ORE_BUS, ORE_ENV, ORE_GEOCODER, JwtPayload, internalFetch, serviceUrl } from '@ore/core';
import { Bus } from '@ore/bus';
import { OreEnv } from '@ore/config';
import { Geocoder } from '@ore/maps';
import { RiderLocation } from './entities/rider-location.entity';
import { TrackingAccessService } from './tracking.access';
import { TrackingGateway } from './tracking.gateway';

@Injectable()
export class TrackingService {
  // GPS smoothing: per-rider moving-average window + publish debounce so high-rate
  // location pings don't flood the bus/websocket with near-identical points (C4.3).
  private readonly smoothing = new Map<string, { lat: number; lng: number }[]>();
  private readonly lastPublish = new Map<string, number>();

  constructor(
    @InjectRepository(RiderLocation) private readonly locations: Repository<RiderLocation>,
    @Inject(ORE_BUS) private readonly bus: Bus,
    @Inject(ORE_ENV) private readonly env: OreEnv,
    @Inject(ORE_GEOCODER) private readonly geocoder: Geocoder,
    private readonly gateway: TrackingGateway,
    private readonly access: TrackingAccessService,
  ) {}

  private minPublishMs(): number {
    const v = Number(process.env.TRACKING_MIN_PUBLISH_MS);
    return Number.isFinite(v) && v > 0 ? v : 5_000;
  }

  private smooth(riderId: string, lat: number, lng: number): { lat: number; lng: number } {
    const arr = this.smoothing.get(riderId) ?? [];
    arr.push({ lat, lng });
    if (arr.length > 3) arr.shift();
    this.smoothing.set(riderId, arr);
    return {
      lat: arr.reduce((s, p) => s + p.lat, 0) / arr.length,
      lng: arr.reduce((s, p) => s + p.lng, 0) / arr.length,
    };
  }

  async ingest(userId: string, lat: number, lng: number, speedKmh?: number, orderId?: string): Promise<{ ok: true }> {
    const riderId = await this.access.riderIdForUser(userId);
    if (!riderId) throw new NotFoundException('Rider profile not found — register first');
    // Every ping is persisted raw (audit truth); publishing is smoothed + debounced.
    const row = await this.locations.save(
      this.locations.create({ riderId, orderId: orderId ?? null, lat, lng, speedKmh: speedKmh ?? null }),
    );
    const now = Date.now();
    const last = this.lastPublish.get(riderId) ?? 0;
    if (now - last < this.minPublishMs()) {
      return { ok: true };
    }
    this.lastPublish.set(riderId, now);

    const { lat: sLat, lng: sLng } = this.smooth(riderId, lat, lng);
    const payload: RiderLocationPayload = {
      riderId,
      orderId,
      lat: sLat,
      lng: sLng,
      speedKmh,
      ts: row.createdAt.toISOString(),
    };
    await this.bus.publish(EVENTS.TRACKING_RIDER_LOCATION, payload);

    if (orderId) {
      void this.broadcastRiderLocation(orderId, riderId, sLat, sLng);
      void this.recomputeEta(orderId, sLat, sLng).catch(() => undefined);
    }
    return { ok: true };
  }

  /** Websocket broadcast to the order room (G24/G39). */
  private async broadcastRiderLocation(orderId: string, riderId: string, lat: number, lng: number): Promise<void> {
    this.gateway.emitToOrder(orderId, 'rider.location', { riderId, lat, lng, ts: new Date().toISOString() });
  }

  private async recomputeEta(orderId: string, riderLat: number, riderLng: number): Promise<void> {
    const order = await this.fetchOrderDrop(orderId).catch(() => null);
    if (!order || !order.addressJson) return;
    const drop = order.addressJson as { lat: number; lng: number };
    try {
      const route = await this.geocoder.route({ lat: riderLat, lng: riderLng }, { lat: drop.lat, lng: drop.lng });
      const etaMinutes = Math.max(1, Math.round(route.durationS / 60));
      await this.bus.publish(EVENTS.TRACKING_ETA_CHANGED, { orderId, etaMinutes, ts: new Date().toISOString() });
    } catch {
      const km = distanceKm({ lat: riderLat, lng: riderLng }, { lat: drop.lat, lng: drop.lng });
      await this.bus.publish(EVENTS.TRACKING_ETA_CHANGED, { orderId, etaMinutes: Math.max(1, Math.round(km / 25 * 60)), ts: new Date().toISOString() });
    }
  }

  async riderPosition(
    orderId: string,
    user: JwtPayload,
  ): Promise<{ riderId: string; lat: number; lng: number; ts: string } | null> {
    const order = await this.access.assertCanView(user, orderId);
    return this.lastRiderPosition(order.riderId);
  }

  /** Internal: same lookup without a user context (support AI, after order ownership is proven). */
  async riderPositionInternal(orderId: string): Promise<{ riderId: string; lat: number; lng: number; ts: string } | null> {
    const order = await this.access.fetchOrder(orderId);
    if (!order) return null;
    return this.lastRiderPosition(order.riderId);
  }

  private async lastRiderPosition(riderId: string | null): Promise<{ riderId: string; lat: number; lng: number; ts: string } | null> {
    if (!riderId) return null;
    const last = await this.locations.findOne({ where: { riderId }, order: { createdAt: 'DESC' } });
    if (!last) return null;
    return { riderId, lat: last.lat, lng: last.lng, ts: last.createdAt.toISOString() };
  }

  private async fetchOrderDrop(orderId: string): Promise<{ riderId: string | null; addressJson: { lat: number; lng: number } | null }> {
    const res = await internalFetch(`${serviceUrl('order')}/internal/orders/${orderId}`);
    if (!res.ok) throw new NotFoundException('Order not found');
    return (await res.json()) as { riderId: string | null; addressJson: { lat: number; lng: number } | null };
  }

  /** Resolve a manual address entry (google / w3w / ghanagps) and return lat, lng, label. */
  async geocode(input: { mode: string; query?: string; words?: string; digitalAddress?: string }) {
    return this.geocoder.resolve(input as any);
  }

  /**
   * Google Places Autocomplete — biased to Ghana.
   * Returns up to 5 suggestions: { placeId, description, mainText, secondaryText }.
   */
  async placesAutocomplete(
    input: string,
    sessionToken?: string,
  ): Promise<{ suggestions: Array<{ placeId: string; description: string; mainText: string; secondaryText: string }> }> {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY ?? '';
    
    // New Places API (Text Search) - POST request with JSON body
    const url = 'https://places.googleapis.com/v1/places:autocomplete';
    
    const requestBody = {
      input,
      languageCode: 'en',
      regionCode: 'GH', // Ghana region code
      locationBias: {
        circle: {
          center: {
            latitude: 7.9465,
            longitude: -1.0232
          },
          radius: 50000.0 // 50km radius (max allowed is 50,000 meters)
        }
      },
      includedPrimaryTypes: ['geocode', 'establishment'],
      // maxSuggestions defaults to 5, so we don't need to specify it
      ...(sessionToken && { sessionToken })
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'suggestions.placePrediction.placeId,suggestions.placePrediction.text,suggestions.placePrediction.structuredFormat'
      },
      body: JSON.stringify(requestBody)
    });

    if (!res.ok) return { suggestions: [] };

    const json = (await res.json()) as {
      suggestions?: Array<{
        placePrediction?: {
          placeId: string;
          text?: { text: string };
          structuredFormat?: { 
            mainText?: { text: string }; 
            secondaryText?: { text: string } 
          };
        };
      }>;
    };

    const suggestions = (json.suggestions ?? [])
      .filter(s => s.placePrediction)
      .map((s) => {
        const prediction = s.placePrediction!;
        return {
          placeId: prediction.placeId,
          description: prediction.text?.text ?? '',
          mainText: prediction.structuredFormat?.mainText?.text ?? prediction.text?.text ?? '',
          secondaryText: prediction.structuredFormat?.secondaryText?.text ?? '',
        };
      });

    return { suggestions };
  }

  /** Resolve a Place ID to coordinates using Google Place Details. */
  async placeDetails(
    placeId: string,
    sessionToken?: string,
  ): Promise<{ lat: number; lng: number; label: string }> {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY ?? '';
    
    // New Places API (Place Details) - GET request with headers
    const url = `https://places.googleapis.com/v1/places/${placeId}`;
    
    const params = new URLSearchParams({
      languageCode: 'en',
      ...(sessionToken && { sessionToken })
    });

    const res = await fetch(`${url}?${params}`, {
      method: 'GET',
      headers: {
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'location,displayName,formattedAddress'
      }
    });

    if (!res.ok) throw new Error('Place details fetch failed');

    const json = (await res.json()) as {
      location?: { 
        latitude: number; 
        longitude: number 
      };
      displayName?: { 
        text: string 
      };
      formattedAddress?: string;
      error?: {
        code: number;
        message: string;
      };
    };

    if (json.error || !json.location) {
      throw new Error(`Place details error: ${json.error?.message ?? 'No location data'}`);
    }

    const { latitude: lat, longitude: lng } = json.location;
    const label = json.displayName?.text ?? json.formattedAddress ?? placeId;

    return { lat, lng, label };
  }
}

