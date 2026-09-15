import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { ResidentStatus, TaxBase, TaxPartyType, TaxType, ThresholdType, TransactionType } from '@ore/contracts';

/** Versioned tax/WHT rule table. Rates are data, not posting-code constants. */
@Entity({ schema: 'ledger' })
@Index(['taxType', 'active', 'effectiveFrom'])
@Index(['ruleId'], { unique: true })
export class TaxRule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  ruleId: string;

  @Column({ type: 'varchar' })
  taxType: TaxType;

  @Column({ type: 'varchar', nullable: true })
  supplierType: TaxPartyType | 'ANY' | null;

  @Column({ type: 'varchar', nullable: true })
  payerType: TaxPartyType | 'ANY' | null;

  @Column({ type: 'varchar', nullable: true })
  payeeType: TaxPartyType | 'ANY' | null;

  @Column({ type: 'varchar', nullable: true })
  residentStatus: ResidentStatus | 'ANY' | null;

  @Column({ type: 'varchar', nullable: true })
  transactionType: TransactionType | 'ANY' | null;

  @Column({ type: 'varchar', nullable: true })
  contractType: string | null;

  @Column({ type: 'varchar', nullable: true })
  thresholdType: ThresholdType | null;

  @Column({ type: 'int', nullable: true })
  thresholdAmountPesewas: number | null;

  /** Basis points: 15% = 1500, 2.5% = 250, 7% = 700. */
  @Column({ type: 'int' })
  rateBps: number;

  @Column({ type: 'varchar', default: 'TAXABLE_AMOUNT' })
  taxBase: TaxBase;

  @Column({ type: Date })
  effectiveFrom: Date;

  @Column({ type: Date, nullable: true })
  effectiveTo: Date | null;

  @Column({ type: 'boolean', default: false })
  exemption: boolean;

  @Column({ type: 'boolean', default: false })
  certificateRequired: boolean;

  @Column({ type: 'boolean', default: true })
  active: boolean;

  @Column({ type: 'int', default: 1 })
  version: number;

  @Column({ type: 'varchar', nullable: true })
  updatedBy: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
