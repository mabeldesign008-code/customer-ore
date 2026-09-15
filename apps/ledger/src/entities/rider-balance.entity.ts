import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn, VersionColumn } from 'typeorm';

/** Rider wallet — doc §5: Pending / Available (cleared) / Locked / Cash Liability.
 *  available payout = cleared − COD cash owed − locked (penalties/holds), never negative. */
@Entity({ schema: 'ledger' })
export class RiderBalance {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  riderId: string;

  @Column({ type: 'varchar', nullable: true })
  userId: string | null;

  @Column({ type: 'int', default: 0 })
  pendingPesewas: number; // fees earned, not yet cleared (clearing window RIDER_CLEAR_HOURS)

  @Column({ type: 'int', default: 0 })
  clearedPesewas: number; // available base — earnings that have cleared

  @Column({ type: 'int', default: 0 })
  lockedPesewas: number; // penalties + in-transit withdrawal holds

  @Column({ type: 'int', default: 0 })
  cashOwedPesewas: number; // COD cash collected, owed to platform (mirror of EXPECTED cod_cash)

  @Column({ type: 'int', default: 0 })
  feesEarnedPesewas: number; // lifetime rider fees earned

  @Column({ type: 'int', default: 0 })
  remittedPesewas: number; // lifetime COD cash actually remitted

  // ── clearing window ───────────────────────────────────────────────
  @Column({ type: Date, nullable: true })
  clearsAt: Date | null; // when the current pending batch becomes cleared

  // ── withdrawal day-accounting (daily cap + free-withdrawal counting) ──
  @Column({ type: 'varchar', nullable: true })
  withdrawalDay: string | null; // yyyy-mm-dd of the last withdrawal batch

  @Column({ type: 'int', default: 0 })
  withdrawnTodayPesewas: number;

  @Column({ type: 'int', default: 0 })
  withdrawalsTodayCount: number;

  @VersionColumn()
  version: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
