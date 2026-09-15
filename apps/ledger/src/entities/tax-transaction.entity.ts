import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { PaymentProcessor, RevenueOwner, SettlementMethod, TaxCategory, TaxClassificationStatus, TaxPartyType, VatStatus, WhtStatus, TransactionType, ResidentStatus } from '@ore/contracts';

/** One append-only classification row per tax-relevant transaction component. */
@Entity({ schema: 'ledger' })
@Index(['transactionId', 'componentType'])
@Index(['orderId'])
@Index(['revenueOwner'])
@Index(['classificationStatus', 'createdAt'])
export class TaxTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  transactionId: string;

  @Column({ type: 'varchar', nullable: true })
  orderId: string | null;

  @Column({ type: 'varchar' })
  componentType: string;

  @Column({ type: 'varchar', nullable: true })
  payerType: TaxPartyType | null;

  @Column({ type: 'varchar', nullable: true })
  payerId: string | null;

  @Column({ type: 'varchar', nullable: true })
  payeeType: TaxPartyType | null;

  @Column({ type: 'varchar', nullable: true })
  payeeId: string | null;

  @Column({ type: 'varchar', nullable: true })
  supplierType: TaxPartyType | null;

  @Column({ type: 'varchar', nullable: true })
  supplierId: string | null;

  @Column({ type: 'varchar', nullable: true })
  customerId: string | null;

  @Column({ type: 'int' })
  grossAmountPesewas: number;

  @Column({ type: 'int', default: 0 })
  taxableAmountPesewas: number;

  @Column({ type: 'varchar', nullable: true })
  taxCategory: TaxCategory | null;

  @Column({ type: 'varchar', nullable: true })
  revenueOwner: RevenueOwner | null;

  @Column({ type: 'varchar', nullable: true })
  paymentProcessor: PaymentProcessor | null;

  @Column({ type: 'varchar', nullable: true })
  settlementMethod: SettlementMethod | null;

  @Column({ type: 'varchar', nullable: true })
  contractType: string | null;

  @Column({ type: 'varchar', nullable: true })
  transactionType: TransactionType | null;

  @Column({ type: 'varchar', nullable: true })
  residentStatus: ResidentStatus | null;

  @Column({ type: 'varchar', default: 'REVIEW_REQUIRED' })
  classificationStatus: TaxClassificationStatus;

  @Column({ type: 'varchar', default: 'REVIEW_REQUIRED' })
  whtStatus: WhtStatus;

  @Column({ type: 'varchar', default: 'REVIEW_REQUIRED' })
  vatStatus: VatStatus;

  @Column({ type: 'text', nullable: true })
  reviewReason: string | null;

  @Column({ type: 'simple-json', nullable: true })
  metadataJson: Record<string, unknown> | null;

  @CreateDateColumn()
  createdAt: Date;
}
