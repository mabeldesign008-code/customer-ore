/** Platform-funded rider peak pay. Not a customer charge and not a vendor cut. */

function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(h)));
}

export const PEAK_PAY_MAX_PESEWAS = 50_000;

export interface PeakPayWindow {
  title?: string;
  amountPesewas: number;
  startsAt: string;
  endsAt: string;
  centerLat?: number;
  centerLng?: number;
  radiusMeters?: number;
}

export interface PeakPayDecision {
  amountPesewas: number;
  title: string | null;
  endsAt: string | null;
}

export const NO_PEAK_PAY: PeakPayDecision = { amountPesewas: 0, title: null, endsAt: null };

export function parsePeakPayWindows(raw: string | undefined): PeakPayWindow[] {
  if (!raw || !raw.trim()) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((row) => {
      if (!row || typeof row !== 'object') return [];
      const amountPesewas = Number((row as PeakPayWindow).amountPesewas);
      const startsAt = String((row as PeakPayWindow).startsAt ?? '');
      const endsAt = String((row as PeakPayWindow).endsAt ?? '');
      if (!Number.isInteger(amountPesewas) || amountPesewas <= 0) return [];
      if (!startsAt || !endsAt || Number.isNaN(new Date(startsAt).getTime()) || Number.isNaN(new Date(endsAt).getTime())) {
        return [];
      }
      const window: PeakPayWindow = {
        title: typeof (row as PeakPayWindow).title === 'string' ? (row as PeakPayWindow).title : undefined,
        amountPesewas,
        startsAt,
        endsAt,
      };
      const centerLat = Number((row as PeakPayWindow).centerLat);
      const centerLng = Number((row as PeakPayWindow).centerLng);
      const radiusMeters = Number((row as PeakPayWindow).radiusMeters);
      if (Number.isFinite(centerLat) && Number.isFinite(centerLng) && Number.isFinite(radiusMeters) && radiusMeters > 0) {
        window.centerLat = centerLat;
        window.centerLng = centerLng;
        window.radiusMeters = radiusMeters;
      }
      return [window];
    });
  } catch {
    return [];
  }
}

export function evaluatePeakPay(opts: {
  now: Date;
  lat?: number | null;
  lng?: number | null;
  windows: PeakPayWindow[];
  maxPesewas?: number;
}): PeakPayDecision {
  const maxPesewas = opts.maxPesewas ?? PEAK_PAY_MAX_PESEWAS;
  let best: PeakPayDecision = NO_PEAK_PAY;
  for (const window of opts.windows) {
    const start = new Date(window.startsAt);
    const end = new Date(window.endsAt);
    if (opts.now < start || opts.now > end) continue;
    if (window.centerLat !== undefined && window.centerLng !== undefined && window.radiusMeters !== undefined) {
      if (opts.lat == null || opts.lng == null) continue;
      const km = distanceKm({ lat: opts.lat, lng: opts.lng }, { lat: window.centerLat, lng: window.centerLng });
      if (km * 1000 > window.radiusMeters) continue;
    }
    const amountPesewas = Math.min(window.amountPesewas, maxPesewas);
    if (amountPesewas > best.amountPesewas) {
      best = { amountPesewas, title: window.title ?? 'Peak pay', endsAt: window.endsAt };
    }
  }
  return best;
}
