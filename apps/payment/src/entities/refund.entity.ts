import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { RefundStatus } from '@ore/contracts';

@Entity({ schema: 'payment' })
@Index(['orderId'])
export class Refund {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  orderId: string;

  @Column()
  checkoutPaymentId: string;

  @Column({ type: 'int' })
  amountPesewas: number;

  @Column()
  reason: string;

  @Column({ type: 'varchar', nullable: true })
  originalTransactionId: string | null;

  @Column({ type: 'varchar', default: 'UNSPECIFIED' })
  refundComponent: string;

  @Column({ type: 'varchar', default: 'UNKNOWN' })
  originalTaxStatus: string;

  @Column({ type: 'varchar', default: 'OPEN' })
  taxPeriodStatus: 'OPEN' | 'FILED' | 'AMENDED' | 'CLOSED';

  @Column({ type: 'varchar', default: 'PENDING' })
  settlementStatus: string;

  @Column({ type: 'varchar', default: 'APPROVED' })
  approvalStatus: string;

  @Column({ type: 'varchar', nullable: true })
  paystackRef: string | null;

  @Column({ type: 'varchar', default: RefundStatus.PENDING })
  status: RefundStatus;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
