/** Immutable audit log of every transition — G34. Powers tracking feed + dispute evidence. */
export declare class OrderEvent {
    id: string;
    orderId: string;
    from: string | null;
    to: string;
    actor: string;
    payloadJson: Record<string, unknown> | null;
    createdAt: Date;
}
//# sourceMappingURL=order-event.entity.d.ts.map