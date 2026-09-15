import { CodCashStatus } from '@ore/contracts';
/** COD cash trail — rider collected cash that belongs to the platform pool (G38). */
export declare class CodCash {
    id: string;
    orderId: string;
    riderId: string;
    amountPesewas: number;
    status: CodCashStatus;
    createdAt: Date;
    updatedAt: Date;
}
//# sourceMappingURL=cod-cash.entity.d.ts.map