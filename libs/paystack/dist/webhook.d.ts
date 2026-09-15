/** Paystack webhook verification — HMAC-SHA512 over the RAW request body, constant-time compare.
 *  Docs: paystack.com/docs/payments/webhooks. Non-negotiable P0 (gap G06). */
export declare function computeSignature(secretKey: string, rawBody: string | Buffer): string;
export declare function verifyWebhookSignature(secretKey: string, rawBody: string | Buffer, signatureHeader: string | undefined): boolean;
export interface PaystackWebhookPayload<T = unknown> {
    event: string;
    data: T;
}
export declare function parseWebhook(rawBody: string | Buffer): PaystackWebhookPayload;
//# sourceMappingURL=webhook.d.ts.map