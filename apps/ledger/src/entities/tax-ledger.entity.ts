import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { TaxCategory, TaxType } from '@ore/contracts';

/** ORE_TAX_LEDGER — append-only tax ledger. Filed rows are immutable by migration trigger. */
@Entity({ schema: 'ledger', name: 'ore_tax_ledger' })
@Index(['orderId'])
@Index(['invoiceId'])
@Index(['partyId'])
@Index(['taxType', 'taxPeriod'])
@Index(['sourceTransaction'])
export class TaxLedger {
  @PrimaryGeneratedColumn('uuid')
  taxTransactionId: string;

  @Column({ type: 'varchar', nullable: true })
  orderId: string | null;

  @Column({ type: 'varchar', nullable: true })
  invoiceId: string | null;

  @Column({ type: 'varchar', nullable: true })
  partyId: string | null;

  @Column({ type: 'varchar' })
  taxType: TaxType;

  @Column({ type: 'varchar' })
  taxCategory: TaxCategory;

  @Column({ type: 'int' })
  taxableValuePesewas: number;

  @Column({ type: 'int' })
  taxRateBps: number;

  @Column({ type: 'int' })
  taxAmountPesewas: number;

  @Column({ type: 'varchar' })
  taxPeriod: string;

  @Column({ type: Date })
  transactionDate: Date;

  @Column({ type: 'varchar' })
  sourceTransaction: string;

  @Column({ type: 'varchar', nullable: true })
  sourceComponent: string | null;

  @Column({ type: 'varchar', nullable: true })
  ruleId: string | null;

  @Column({ type: 'varchar', nullable: true })
  reversalReference: string | null;

  @Column({ type: 'varchar', default: 'CONFIRMED' })
  paymentStatus: string;

  @Column({ type: 'varchar', default: 'OPEN' })
  filingStatus: 'OPEN' | 'FILED' | 'AMENDED' | 'CLOSED';

  @Column({ type: 'varchar', nullable: true })
  certificateNumber: string | null;

  @Column({ type: 'simple-json', nullable: true })
  metaJson: Record<string, unknown> | null;

  @CreateDateColumn()
  createdAt: Date;
}
