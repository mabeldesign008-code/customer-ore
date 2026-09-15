import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/** Double-entry-ish ledger line: every order creates account debits/credits (G28). */
@Entity({ schema: 'ledger' })
@Index(['orderId'])
@Index(['account', 'createdAt'])
export class LedgerEntry {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', nullable: true })
  orderId: string | null;

  @Column()
  account: string; // e.g. customer_cash, platform_fees, vendor_payable, rider_payable, psp_fee, refund

  @Column({ type: 'int', default: 0 })
  debitPesewas: number; // money moving in

  @Column({ type: 'int', default: 0 })
  creditPesewas: number; // money moving out / payable

  @Column({ type: 'varchar', nullable: true })
  ref: string | null;

  /**
   * Replay guard for money movements (audit P0): the deterministic business key of the
   * batch this row belongs to (`delivered:<orderId>`, `charge:<orderId>`, …). NOT unique
   * here — every leg of one batch shares the key; uniqueness lives in ledger_idempotency
   * (one row per batch), which is what makes at-least-once event delivery unable to
   * double-post, even across restarts.
   */
  @Column({ type: 'varchar', nullable: true })
  idempotencyKey: string | null;

  @Column({ type: 'simple-json', nullable: true })
  metaJson: Record<string, unknown> | null;

  @CreateDateColumn()
  createdAt: Date;
}
