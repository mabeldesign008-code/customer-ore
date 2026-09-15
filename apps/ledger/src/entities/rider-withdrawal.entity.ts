import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { WithdrawalStatus } from '@ore/contracts';

/** Rider payout request — doc §5: min GHS 50, daily cap GHS 2,000, 1 free payout/day then GHS 2.
 *  Status is driven by the money-out channel (Paystack Transfer webhook/response = truth). */
@Entity({ schema: 'ledger' })
@Index(['riderId', 'status'])
export class RiderWithdrawal {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  riderId: string;

  /**
   * Explicit `int`, like every other money column. TypeORM infers `integer` for a `number`
   * property on Postgres, so this was already correct — but an inferred column type is a bad
   * thing to rely on in a withdrawal table, and it was the only money column relying on it.
   */
  @Column({ type: 'int' })
  amountPesewas: number;

  @Column({ type: 'int', default: 0 })
  feePesewas: number;

  @Column()
  destination: string; // "2335… MoMo" / bank label the rider provided

  @Column({ type: 'varchar', default: WithdrawalStatus.REQUESTED })
  status: WithdrawalStatus;

  @Column({ type: 'varchar', nullable: true })
  transferReference: string | null; // Paystack Transfer reference (money-out truth)

  @Column({ type: 'varchar', nullable: true })
  adminNote: string | null;

  @Column({ type: Date, nullable: true })
  processedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
