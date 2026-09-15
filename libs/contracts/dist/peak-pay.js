"use strict";
/** Platform-funded rider peak pay. Not a customer charge and not a vendor cut. */
Object.defineProperty(exports, "__esModule", { value: true });
exports.NO_PEAK_PAY = exports.PEAK_PAY_MAX_PESEWAS = void 0;
exports.parsePeakPayWindows = parsePeakPayWindows;
exports.evaluatePeakPay = evaluatePeakPay;
function distanceKm(a, b) {
    const toRad = (d) => (d * Math.PI) / 180;
    const dLat = toRad(b.lat - a.lat);
    const dLng = toRad(b.lng - a.lng);
    const h = Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
    return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(h)));
}
exports.PEAK_PAY_MAX_PESEWAS = 50_000;
exports.NO_PEAK_PAY = { amountPesewas: 0, title: null, endsAt: null };
function parsePeakPayWindows(raw) {
    if (!raw || !raw.trim())
        return [];
    try {
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed))
            return [];
        return parsed.flatMap((row) => {
            if (!row || typeof row !== 'object')
                return [];
            const amountPesewas = Number(row.amountPesewas);
            const startsAt = String(row.startsAt ?? '');
            const endsAt = String(row.endsAt ?? '');
            if (!Number.isInteger(amountPesewas) || amountPesewas <= 0)
                return [];
            if (!startsAt || !endsAt || Number.isNaN(new Date(startsAt).getTime()) || Number.isNaN(new Date(endsAt).getTime())) {
                return [];
            }
            const window = {
                title: typeof row.title === 'string' ? row.title : undefined,
                amountPesewas,
                startsAt,
                endsAt,
            };
            const centerLat = Number(row.centerLat);
            const centerLng = Number(row.centerLng);
            const radiusMeters = Number(row.radiusMeters);
            if (Number.isFinite(centerLat) && Number.isFinite(centerLng) && Number.isFinite(radiusMeters) && radiusMeters > 0) {
                window.centerLat = centerLat;
                window.centerLng = centerLng;
                window.radiusMeters = radiusMeters;
            }
            return [window];
        });
    }
    catch {
        return [];
    }
}
function evaluatePeakPay(opts) {
    const maxPesewas = opts.maxPesewas ?? exports.PEAK_PAY_MAX_PESEWAS;
    let best = exports.NO_PEAK_PAY;
    for (const window of opts.windows) {
        const start = new Date(window.startsAt);
        const end = new Date(window.endsAt);
        if (opts.now < start || opts.now > end)
            continue;
        if (window.centerLat !== undefined && window.centerLng !== undefined && window.radiusMeters !== undefined) {
            if (opts.lat == null || opts.lng == null)
                continue;
            const km = distanceKm({ lat: opts.lat, lng: opts.lng }, { lat: window.centerLat, lng: window.centerLng });
            if (km * 1000 > window.radiusMeters)
                continue;
        }
        const amountPesewas = Math.min(window.amountPesewas, maxPesewas);
        if (amountPesewas > best.amountPesewas) {
            best = { amountPesewas, title: window.title ?? 'Peak pay', endsAt: window.endsAt };
        }
    }
    return best;
}
//# sourceMappingURL=peak-pay.js.map