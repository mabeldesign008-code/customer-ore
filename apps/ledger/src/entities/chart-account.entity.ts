import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

/**
 * The chart of accounts: our internal account names mapped to the codes an accountant uses.
 *
 * The ledger posts to names like `platform_revenue` and `pending_rider_payable`. Those are
 * implementation names — they say what the code did, not what the money is. An accountant
 * filing this needs `4100 Revenue — delivery commission`. Without this table the export is
 * a list of internal identifiers and the person reconciling it has to guess, which is how a
 * mis-mapped liability ends up on the wrong side of the balance sheet.
 *
 * `nature` matters more than it looks: it is what decides whether a balance is an asset, a
 * liability or income, and therefore which side of the trial balance it belongs on. Getting
 * it wrong does not change the numbers, it changes what they mean.
 */

export type AccountNature =
  | 'ASSET'      // money we hold or are owed: COD cash receivable, customer credit granted
  | 'LIABILITY'  // money we owe: vendor payable, rider payable, customer cash held
  | 'REVENUE'    // platform income: service fee, commission, peak surcharge
  | 'EXPENSE'    // platform-funded outflows: peak pay, referral rewards, bonuses
  | 'CONTROL';   // clearing/suspense accounts that must net to zero: pending_rider_payable

@Entity({ schema: 'ledger' })
@Index(['name'], { unique: true })
@Index(['code'], { unique: true })
export class ChartAccount {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** The internal ledger account name. This is the join key to `ledger_entry.account`. */
  @Column({ type: 'varchar' })
  name: string;

  /** The accountant's code, e.g. `4100`. Unique so a code cannot be reused across accounts. */
  @Column({ type: 'varchar' })
  code: string;

  /** Human label used on statements and exports. */
  @Column({ type: 'varchar' })
  label: string;

  @Column({ type: 'varchar', default: 'CONTROL' })
  nature: AccountNature;

  /**
   * Normal balance side. A liability increases on credit, an asset on debit. The trial
   * balance uses this to report a signed balance rather than forcing the reader to know
   * the convention.
   */
  @Column({ type: 'varchar', default: 'DEBIT' })
  normalSide: 'DEBIT' | 'CREDIT';

  /** Set for accounts whose balance must be zero at a period end (clearing/suspense). */
  @Column({ type: 'boolean', default: false })
  mustNetToZero: boolean;

  /** Free-text note for the accountant. Why this mapping exists is worth writing down. */
  @Column({ type: 'text', nullable: true })
  note: string | null;

  @Column({ type: 'varchar', nullable: true })
  updatedBy: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
