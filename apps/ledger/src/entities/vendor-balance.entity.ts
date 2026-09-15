import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn, VersionColumn } from 'typeorm';

/** Vendor running balances (doc §4): accrued lifetime earnings, rolling reserve held,
 *  negative-balance carry (owed), lifetime paid out. Pending = unsettled VendorEarning rows. */
@Entity({ schema: 'ledger' })
export class VendorBalance {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  vendorId: string;

  @Column({ type: 'int', default: 0 })
  accruedPesewas: number; // lifetime net earnings

  @Column({ type: 'int', default: 0 })
  reservePesewas: number; // rolling reserve currently held

  @Column({ type: 'int', default: 0 })
  owedPesewas: number; // negative balance (instant reversals on fault) — offsets future payouts

  @Column({ type: 'int', default: 0 })
  withdrawalHeldPesewas: number; // early-payout requests awaiting transfer result

  @Column({ type: 'int', default: 0 })
  paidOutPesewas: number; // lifetime settled to the vendor

  @Column({ type: 'int', default: 0 })
  bonusPesewas: number; // doc §8: vendor referral bonus (GHS 200 after N real orders) — included in settlements

  @VersionColumn()
  version: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
