import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export type VendorWithdrawalStatus = 'REQUESTED' | 'PROCESSING' | 'PAID' | 'FAILED' | 'REJECTED';

/** Optional early Vendor payout request; scheduled settlements remain the default path. */
@Entity({ schema: 'ledger' })
@Index(['vendorId', 'status'])
export class VendorWithdrawal {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  vendorId: string;

  @Column({ type: 'int' })
  amountPesewas: number;

  @Column({ type: 'varchar' })
  destination: string;

  @Column({ type: 'varchar', default: 'REQUESTED' })
  status: VendorWithdrawalStatus;

  @Column({ type: 'varchar', nullable: true })
  transferReference: string | null;

  @Column({ type: 'text', nullable: true })
  note: string | null;

  @Column({ type: Date, nullable: true })
  processedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
