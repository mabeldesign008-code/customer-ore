import { evaluatePeakPay, parsePeakPayWindows } from './peak-pay';

const now = new Date('2026-08-19T18:00:00.000Z');

describe('peak pay', () => {
  it('is off when no windows are configured', () => {
    expect(parsePeakPayWindows(undefined)).toEqual([]);
    expect(evaluatePeakPay({ now, windows: [] }).amountPesewas).toBe(0);
  });

  it('applies a city-wide window that covers now', () => {
    const windows = parsePeakPayWindows(JSON.stringify([
      { title: 'Evening', amountPesewas: 200, startsAt: '2026-08-19T17:00:00.000Z', endsAt: '2026-08-19T21:00:00.000Z' },
    ]));
    expect(evaluatePeakPay({ now, windows })).toEqual({
      amountPesewas: 200,
      title: 'Evening',
      endsAt: '2026-08-19T21:00:00.000Z',
    });
  });

  it('ignores a geo window when the pickup is outside the radius', () => {
    const windows = parsePeakPayWindows(JSON.stringify([
      {
        amountPesewas: 300,
        startsAt: '2026-08-19T17:00:00.000Z',
        endsAt: '2026-08-19T21:00:00.000Z',
        centerLat: 5.1053,
        centerLng: -1.2466,
        radiusMeters: 800,
      },
    ]));
    expect(evaluatePeakPay({ now, lat: 5.2, lng: -1.4, windows }).amountPesewas).toBe(0);
    expect(evaluatePeakPay({ now, lat: 5.1053, lng: -1.2466, windows }).amountPesewas).toBe(300);
  });

  it('does not invent peak when location is required but missing', () => {
    const windows = parsePeakPayWindows(JSON.stringify([
      {
        amountPesewas: 300,
        startsAt: '2026-08-19T17:00:00.000Z',
        endsAt: '2026-08-19T21:00:00.000Z',
        centerLat: 5.1053,
        centerLng: -1.2466,
        radiusMeters: 800,
      },
    ]));
    expect(evaluatePeakPay({ now, windows }).amountPesewas).toBe(0);
  });

  it('picks the highest matching window and caps at GHS 500', () => {
    const windows = parsePeakPayWindows(JSON.stringify([
      { amountPesewas: 100, startsAt: '2026-08-19T17:00:00.000Z', endsAt: '2026-08-19T21:00:00.000Z' },
      { amountPesewas: 80_000, startsAt: '2026-08-19T17:00:00.000Z', endsAt: '2026-08-19T21:00:00.000Z' },
    ]));
    expect(evaluatePeakPay({ now, windows }).amountPesewas).toBe(50_000);
  });
});
