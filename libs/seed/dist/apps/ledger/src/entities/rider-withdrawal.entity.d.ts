import { WithdrawalStatus } from '@ore/contracts';
/** Rider payout request — doc §5: min GHS 50, daily cap GHS 2,000, 1 free payout/day then GHS 2.
 *  Status is driven by the money-out channel (Paystack Transfer webhook/response = truth). */
export declare class RiderWithdrawal {
    id: string;
    riderId: string;
    /**
     * Explicit `int`, like every other money column. TypeORM infers `integer` for a `number`
     * property on Postgres, so this was already correct — but an inferred column type is a bad
     * thing to rely on in a withdrawal table, and it was the only money column relying on it.
     */
    amountPesewas: number;
    feePesewas: number;
    destination: string;
    status: WithdrawalStatus;
    transferReference: string | null;
    adminNote: string | null;
    processedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
}
//# sourceMappingURL=rider-withdrawal.entity.d.ts.map