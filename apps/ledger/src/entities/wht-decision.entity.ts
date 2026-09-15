import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { ResidentStatus, TaxPartyType, ThresholdType, TransactionType, WhtStatus } from '@ore/contracts';

/** Every WHT evaluation is logged, including not-applicable and threshold-not-met outcomes. */
@Entity({ schema: 'ledger' })
@Index(['transactionId', 'componentType'])
@Index(['supplierId', 'taxYear', 'transactionType'])
@Index(['whtStatus', 'createdAt'])
export class WhtDecision {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  transactionId: string;

  @Column({ type: 'varchar', nullable: true })
  orderId: string | null;

  @Column({ type: 'varchar' })
  componentType: string;

  @Column({ type: 'varchar', nullable: true })
  ruleId: string | null;

  @Column({ type: 'varchar' })
  whtStatus: WhtStatus;

  @Column({ type: 'varchar', nullable: true })
  supplierId: string | null;

  @Column({ type: 'varchar', nullable: true })
  supplierType: TaxPartyType | null;

  @Column({ type: 'varchar', nullable: true })
  payerType: TaxPartyType | null;

  @Column({ type: 'varchar', nullable: true })
  payeeType: TaxPartyType | null;

  @Column({ type: 'varchar', nullable: true })
  transactionType: TransactionType | null;

  @Column({ type: 'varchar', nullable: true })
  contractType: string | null;

  @Column({ type: 'varchar', nullable: true })
  residentStatus: ResidentStatus | null;

  @Column({ type: 'int', nullable: true })
  taxYear: number | null;

  @Column({ type: 'int', default: 0 })
  currentTransactionAmountPesewas: number;

  @Column({ type: 'int', default: 0 })
  priorCumulativeAmountPesewas: number;

  @Column({ type: 'int', default: 0 })
  postTransactionCumulativeAmountPesewas: number;

  @Column({ type: 'varchar', nullable: true })
  thresholdType: ThresholdType | null;

  @Column({ type: 'int', nullable: true })
  thresholdAmountPesewas: number | null;

  @Column({ type: 'boolean', default: false })
  thresholdReachedFlag: boolean;

  @Column({ type: 'varchar', nullable: true })
  thresholdTriggerTransactionId: string | null;

  @Column({ type: 'int', default: 0 })
  rateBps: number;

  @Column({ type: 'int', default: 0 })
  taxBasePesewas: number;

  @Column({ type: 'int', default: 0 })
  whtAmountPesewas: number;

  @Column({ type: 'boolean', default: false })
  certificateRequired: boolean;

  @Column({ type: 'varchar', nullable: true })
  certificateNumber: string | null;

  @Column({ type: 'varchar', nullable: true })
  reviewReason: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
