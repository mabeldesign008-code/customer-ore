/** Dedupe ledger for at-least-once SmileID webhook delivery. */
export declare class SmileVerificationWebhookEvent {
    id: string;
    eventHash: string;
    providerJobId: string;
    payloadJson: Record<string, unknown>;
    processed: boolean;
    createdAt: Date;
}
//# sourceMappingURL=smile-verification-webhook-event.entity.d.ts.map