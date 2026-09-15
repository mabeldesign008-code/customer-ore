import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

/** One delivered order's vendor earnings (net of commission, doc §4).
 *  settledAt marks inclusion in a weekly settlement; null = still accruing/rolling over. */
@Entity({ schema: 'ledger' })
@Index(['vendorId', 'settledAt'])
export class VendorEarning {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  vendorId: string;

  @Column({ unique: true })
  orderId: string;

  @Column({ type: 'varchar', nullable: true })
  orderRef: string | null;

  @Column({ type: 'int' })
  amountPesewas: number; // vendor share, net of commission

  @Column({ type: 'varchar', nullable: true })
  settlementId: string | null;

  @Column({ type: Date, nullable: true })
  settledAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
