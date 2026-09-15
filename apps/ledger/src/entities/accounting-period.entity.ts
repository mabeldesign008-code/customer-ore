import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/**
 * A closed accounting period.
 *
 * Once a month is closed, nothing may post into it — not a correction, not a "quick fix",
 * not a re-run of a settlement that was late. That is the whole point: a statement already
 * given to an accountant or filed with an authority must keep meaning the same thing. A
 * correction to a closed month is made **in the current month** as an adjusting entry that
 * names the period it corrects, so the history stays readable and the original still adds up.
 *
 * Unique on (year, month) so two admins racing to close the same month produce one row.
 */
@Entity({ schema: 'ledger' })
@Index(['year', 'month'], { unique: true })
export class AccountingPeriod {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'int' })
  year: number;

  /** 1-12. */
  @Column({ type: 'int' })
  month: number;

  @Column({ type: 'varchar' })
  label: string; // e.g. '2026-08'

  @Column({ type: 'varchar', nullable: true })
  lockedBy: string | null;

  @Column({ type: 'varchar', nullable: true })
  reason: string | null;

  /** Snapshot of the trial balance at lock time, so "what did we report?" is answerable
   *  forever even if the underlying rows are later disputed. */
  @Column({ type: 'simple-json', nullable: true })
  trialBalanceJson: Record<string, unknown>[] | null;

  @Column({ type: 'int', default: 0 })
  netDebitPesewas: number;

  @Column({ type: 'int', default: 0 })
  netCreditPesewas: number;

  /** True only if debits equalled credits at lock time. A period locked out of balance is
   *  still locked — you cannot un-report it — but it is flagged so it gets chased. */
  @Column({ type: 'boolean', default: false })
  balanced: boolean;

  @CreateDateColumn()
  lockedAt: Date;
}
