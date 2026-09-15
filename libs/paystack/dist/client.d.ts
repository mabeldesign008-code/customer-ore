/** Paystack REST client. Only two money moves: money in (transactions) and money out (refunds/transfers).
 *  Live mode hits the real API; mock mode returns deterministic payloads with a local mock webhook flow. */
/**
 * Typed failures so HTTP layers can answer with the right status (audit S-12/H-5).
 *
 * Everything used to surface as a bare `Error` → generic 500. A caller could not tell
 * "your input is wrong, never retry" from "Paystack is down, retry", and account-side
 * rejections (e.g. "You cannot initiate third party payouts at this time") registered as
 * 5xx outages on dashboards, burning the error budget for what is a configuration state.
 */
/** The caller's input cannot be satisfied (unparseable destination, malformed reference). Maps to 400. */
export declare class PaystackInputError extends Error {
}
/** Paystack parsed the request and said no (business/account rejection). Maps to 400/424 — never 500. */
export declare class PaystackProviderError extends Error {
}
export interface InitializeParams {
    reference: string;
    amountPesewas: number;
    email: string;
    currency: string;
    channels?: string[];
    metadata?: Record<string, unknown>;
}
export interface InitializeResult {
    reference: string;
    accessCode: string | null;
    authorizationUrl: string | null;
    mode: 'live' | 'mock';
}
export interface VerifyResult {
    reference: string;
    status: 'success' | 'failed' | 'abandoned' | string;
    amountPesewas: number;
    feePesewas: number;
    currency: string;
    channel: string | null;
    paidAt: string | null;
    customerEmail?: string;
    metadata?: Record<string, unknown>;
}
export interface RefundResult {
    reference: string;
    status: 'pending' | 'processed' | 'failed';
    amountPesewas: number;
    currency: string;
}
export declare class PaystackClient {
    private readonly env;
    constructor(env?: Record<string, string | undefined>);
    private get ore();
    private get isMock();
    /**
     * Classify a failed Paystack call (audit S-12). A parsed body with `status:false` is
     * Paystack refusing the operation (bad input on our side, or an account-side block like
     * "cannot initiate third party payouts") — a 4xx-class outcome. Anything else (5xx, no
     * parseable body) stays a plain Error so the HTTP layer treats it as an upstream outage.
     */
    private fail;
    /**
     * References the mock flow has been told were paid.
     *
     * Static because in mock mode there is no Paystack to hold the state and every client instance
     * must agree; process-local is the right lifetime, since mock mode is single-process by
     * construction (production refuses to run it — see `loadEnv`).
     */
    private static readonly mockPaid;
    /** Mark a reference paid in mock mode, so `verify` reports success for it and nothing else. */
    static markMockPaid(reference: string, amountPesewas: number, currency?: string, paidAt?: string): void;
    /** Forget every mock payment. Tests only. */
    static resetMockPaid(): void;
    initialize(params: InitializeParams): Promise<InitializeResult>;
    verify(reference: string): Promise<VerifyResult>;
    /** Refund a transaction (full or partial). amountPesewas optional → full refund. */
    refund(transactionReference: string, amountPesewas?: number, reason?: string): Promise<RefundResult>;
    /** Public: create a Paystack Transfer Recipient for Mobile Money or GHIPSS Bank Account in Ghana. */
    createRecipient(params: {
        type: 'mobile_money' | 'ghipss' | 'nuban';
        name: string;
        accountNumber: string;
        bankCode: string;
        currency?: string;
    }): Promise<{
        recipientCode: string;
        mode: 'live' | 'mock';
    }>;
    transferToRecipient(params: {
        reference: string;
        amountPesewas: number;
        recipientCode: string;
        currency?: string;
        reason?: string;
        metadata?: Record<string, unknown>;
    }): Promise<TransferResult>;
    transfer(params: {
        reference: string;
        amountPesewas: number;
        currency: string;
        destination: string;
        reason?: string;
        metadata?: Record<string, unknown>;
    }): Promise<TransferResult>;
    getTransferStatus(reference: string): Promise<{
        reference: string;
        status: 'success' | 'processing' | 'failed';
    }>;
    listGhanaPayoutProviders(type: 'mobile_money' | 'ghipss'): Promise<{
        name: string;
        code: string;
        type: string;
    }[]>;
    /** Live helper: register a transfer recipient ("2332… MOMO MTN" or "… BANK AccountName"). */
    private createTransferRecipient;
    private headers;
}
export interface TransferResult {
    reference: string;
    status: 'success' | 'processing' | 'failed';
}
//# sourceMappingURL=client.d.ts.map