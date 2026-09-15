/** Platform-funded rider peak pay. Not a customer charge and not a vendor cut. */
export declare const PEAK_PAY_MAX_PESEWAS = 50000;
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
export declare const NO_PEAK_PAY: PeakPayDecision;
export declare function parsePeakPayWindows(raw: string | undefined): PeakPayWindow[];
export declare function evaluatePeakPay(opts: {
    now: Date;
    lat?: number | null;
    lng?: number | null;
    windows: PeakPayWindow[];
    maxPesewas?: number;
}): PeakPayDecision;
//# sourceMappingURL=peak-pay.d.ts.map