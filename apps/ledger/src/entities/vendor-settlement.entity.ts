import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { VendorSettlementStatus } from '@ore/contracts';

/** Weekly settlement cycle for a vendor (doc §4): Mon cutoff, min GHS 100,
 *  rolling reserve held, payout via Paystack Transfers. */
@Entity({ schema: 'ledger' })
@Index(['vendorId', 'cycleStart'])
export class VendorSettlement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  vendorId: string;

  @Column({ type: Date })
  cycleStart: Date; // previous Monday 00:00 UTC

  @Column({ type: Date })
  cycleEnd: Date; // this Monday 00:00 UTC (orders delivered before this belong to the cycle)

  @Column({ type: 'int', default: 0 })
  grossPesewas: number;

  @Column({ type: 'int', default: 0 })
  debtAppliedPesewas: number; // negative-balance offset (refunds/reversals)

  @Column({ type: 'int', default: 0 })
  reservePesewas: number; // rolling reserve held by the platform

  @Column({ type: 'int', default: 0 })
  payoutPesewas: number; // actually paid to the vendor (net − reserve)

  @Column({ type: 'varchar', default: VendorSettlementStatus.READY })
  status: VendorSettlementStatus;

  @Column({ type: 'varchar', nullable: true })
  transferReference: string | null;

  @Column({ type: 'varchar', nullable: true })
  note: string | null;

  @Column({ type: Date, nullable: true })
  paidAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
