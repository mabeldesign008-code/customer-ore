/** Live geocoders — Google Maps, what3words, Ghana GPS. Keys come from env; no code changes needed. */

import { GeocoderSource } from '@ore/contracts';
import { loadEnv } from '@ore/config';
import { Geocoder, LocationInput, ResolvedLocation } from './geocoder';

export class LiveGeocoder implements Geocoder {
  constructor(private readonly env: Record<string, string | undefined> = process.env) {}

  private get ore() {
    return loadEnv(this.env);
  }

  async resolve(input: LocationInput): Promise<ResolvedLocation> {
    switch (input.mode) {
      case 'auto':
        return {
          lat: input.lat,
          lng: input.lng,
          source: GeocoderSource.AUTO_DETECT,
          label: `Auto (${input.lat.toFixed(4)}, ${input.lng.toFixed(4)})`,
        };
      case 'google':
        return this.google(input.query);
      case 'w3w':
        return this.w3w(input.words);
      case 'ghanagps':
        return this.ghanagps(input.digitalAddress);
    }
  }

  private async google(query: string): Promise<ResolvedLocation> {
    let lat: number | undefined;
    let lng: number | undefined;
    let label = query;
    let googleFailure = 'Google returned no result';

    if (!this.ore.googleMapsApiKey) {
      googleFailure = 'GOOGLE_MAPS_API_KEY is not set';
    } else {
      try {
        const url =
          `${this.ore.googleMapsBaseUrl}/geocode/json?address=${encodeURIComponent(query)}` +
          `&key=${this.ore.googleMapsApiKey}&region=gh`;
        const res = await fetch(url);
        const body = (await res.json()) as any;
        if (body.status === 'OK' && body.results?.length) {
          const r = body.results[0];
          lat = r.geometry.location.lat;
          lng = r.geometry.location.lng;
          label = r.formatted_address;
        } else {
          googleFailure = `Google geocode status=${body.status ?? res.status}`;
        }
      } catch (err) {
        googleFailure = err instanceof Error ? err.message : String(err);
      }
    }

    if (lat !== undefined && lng !== undefined) {
      return { lat, lng, source: GeocoderSource.GOOGLE_MAPS, label };
    }

    // Audit S-10: the OSM fallback used to be silent AND mislabelled — whatever Nominatim
    // returned was reported as `source: GOOGLE_MAPS`, so a dead or quota-exhausted Google
    // key was indistinguishable from a working one. Now: the fallback is opt-out via
    // GEOCODER_OSM_FALLBACK=false, results honestly report OPENSTREETMAP, and production
    // logs an error every time it is used (Nominatim ToS: 1 req/s, no heavy production use).
    if (this.ore.geocoderOsmFallback) {
      try {
        const nomUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query + ', Ghana')}&format=json&limit=1`;
        const nomRes = await fetch(nomUrl, { headers: { 'User-Agent': 'OreDelivery-Ghana/1.0' } });
        const nomBody = (await nomRes.json()) as any[];
        if (nomBody && nomBody.length > 0) {
          lat = parseFloat(nomBody[0].lat);
          lng = parseFloat(nomBody[0].lon);
          label = nomBody[0].display_name;
        }
      } catch (err) {
        googleFailure += `; OSM fallback error: ${err instanceof Error ? err.message : String(err)}`;
      }
      if (lat !== undefined && lng !== undefined && Number.isFinite(lat) && Number.isFinite(lng)) {
        const msg =
          `[maps] geocoding "${query}" served by OpenStreetMap Nominatim because ${googleFailure}. ` +
          'Nominatim ToS allow ~1 req/s and no heavy production use — fix the Google key or set GEOCODER_OSM_FALLBACK=false.';
        if (this.ore.nodeEnv === 'production') console.error(msg);
        else console.warn(msg);
        return { lat, lng, source: GeocoderSource.OPENSTREETMAP, label };
      }
    }

    // Fail loudly: substituting a default city (the old behavior put every failed
    // lookup in Accra — 230 km from Cape Coast) shipped orders to the wrong city
    // with no error to anyone (audit F-BUG-2). A bad address is a bad address;
    // the client can see it and retry.
    throw new Error(
      `Geocoding failed for "${query}" — ${googleFailure}` +
        (this.ore.geocoderOsmFallback ? ' (OSM fallback also returned nothing)' : ' (OSM fallback disabled)'),
    );
  }

  private async w3w(words: string): Promise<ResolvedLocation> {
    if (!this.ore.what3wordsApiKey) throw new Error('WHAT3WORDS_API_KEY is not set');
    const clean = words.replace(/^\/+/, '');
    const url =
      `${this.ore.what3wordsBaseUrl}/convert-to-coordinates?words=${encodeURIComponent(clean)}` +
      `&key=${this.ore.what3wordsApiKey}`;
    const res = await fetch(url);
    const body = (await res.json()) as { coordinates?: { lat: number; lng: number }; error?: { code: string; message: string } };
    if (!body.coordinates) throw new Error(`what3words failed: ${body.error?.message ?? 'unknown'}`);
    return {
      lat: body.coordinates.lat,
      lng: body.coordinates.lng,
      source: GeocoderSource.WHAT3WORDS,
      label: words,
      what3words: words,
      accuracyM: 3,
    };
  }

  private async ghanagps(digitalAddress: string): Promise<ResolvedLocation> {
    if (!this.ore.ghanaGpsApiKey) throw new Error('GHANA_GPS_API_KEY is not set');
    const cleanAddress = digitalAddress.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    const formattedLabel = cleanAddress.length >= 3 
      ? `${cleanAddress.slice(0, 2)}-${cleanAddress.slice(2, 5)}-${cleanAddress.slice(5)}`.replace(/-+$/, '')
      : digitalAddress;

    let lat: number | undefined;
    let lng: number | undefined;
    let streetName: string | undefined;

    try {
      const isPublicApi = this.ore.ghanaGpsBaseUrl.includes('PublicGPGPSAPI.aspx');
      let res: Response;

      if (isPublicApi) {
        const [deviceId, asaaseUser] = this.ore.ghanaGpsApiKey.includes(':')
          ? this.ore.ghanaGpsApiKey.split(':')
          : ['WebApp', this.ore.ghanaGpsApiKey];
        const basicAuth = `Basic ${Buffer.from(`${deviceId}:${asaaseUser}`).toString('base64')}`;

        res = await fetch(this.ore.ghanaGpsBaseUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: basicAuth,
            DeviceID: deviceId,
          },
          body: `Action=GetLocation&GPSName=${cleanAddress}&format=json`,
        });
      } else {
        res = await fetch(`${this.ore.ghanaGpsBaseUrl}/get-location`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.ore.ghanaGpsApiKey}`,
          },
          body: JSON.stringify({ address: cleanAddress }),
        });
      }

      const body = (await res.json()) as any;
      const row = body.data?.Table?.[0] ?? body.Table?.[0] ?? body.data?.[0];
      lat = Number(row?.CenterLatitude ?? row?.Latitude ?? body.CenterLatitude);
      lng = Number(row?.CenterLongitude ?? row?.Longitude ?? body.CenterLongitude);
      streetName = row?.Street ?? row?.Area ?? row?.District;
    } catch (err) {
      // In production this must fail loudly: the old behavior silently substituted
      // Accra (230 km away), shipping orders to the wrong city (audit F-BUG-2).
      if (this.ore.nodeEnv === 'production') {
        throw new Error(`GhanaGPS lookup failed for "${digitalAddress}": ${err instanceof Error ? err.message : String(err)}`);
      }
      // Dev-only fallback when the external endpoint is unreachable or unconfigured.
      lat = 5.6037;
      lng = -0.1870;
    }

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      throw new Error(`GhanaGPS returned invalid coordinates for "${digitalAddress}"`);
    }

    return {
      lat,
      lng,
      source: GeocoderSource.GHANA_GPS,
      label: streetName ? `${formattedLabel} (${streetName})` : formattedLabel,
      digitalAddress: formattedLabel,
      accuracyM: 5,
    };
  }

  async route(
    a: { lat: number; lng: number },
    b: { lat: number; lng: number },
  ): Promise<{ distanceM: number; durationS: number }> {
    if (!this.ore.googleMapsApiKey) throw new Error('GOOGLE_MAPS_API_KEY is not set');
    const url =
      `${this.ore.googleMapsBaseUrl}/directions/json?origin=${a.lat},${a.lng}` +
      `&destination=${b.lat},${b.lng}&mode=driving&key=${this.ore.googleMapsApiKey}`;
    const res = await fetch(url);
    const body = (await res.json()) as {
      status: string;
      routes?: { legs?: { distance?: { value: number }; duration?: { value: number } }[] }[];
    };
    const leg = body.routes?.[0]?.legs?.[0];
    if (body.status !== 'OK' || !leg) {
      throw new Error(`Google directions failed: ${body.status}`);
    }
    return { distanceM: leg.distance?.value ?? 0, durationS: leg.duration?.value ?? 0 };
  }
}
