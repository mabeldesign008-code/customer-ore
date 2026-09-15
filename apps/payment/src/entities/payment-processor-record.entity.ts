import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

/**
 * Paystack/payment-processor reconciliation model.
 *
 * This is routing/reconciliation only. Revenue owner, VAT, WHT, refund and
 * settlement treatment are decided by Ore ledger/tax classifications, never by
 * which Paystack bucket received money.
 */
@Entity({ schema: 'payment' })
@Index(['checkoutId'])
@Index(['orderId'])
@Index(['paystackTransactionId'])
@Index(['paymentStatus', 'settlementStatus'])
export class PaymentProcessorRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', default: 'PAYSTACK' })
  paymentProcessor: string;

  @Column({ type: 'varchar', nullable: true })
  checkoutPaymentId: string | null;

  @Column({ type: 'varchar', nullable: true })
  checkoutId: string | null;

  @Column({ type: 'varchar', nullable: true })
  orderId: string | null;

  @Column({ type: 'varchar', nullable: true })
  paystackTransactionId: string | null;

  @Column({ type: 'varchar', nullable: true })
  paystackSplitId: string | null;

  @Column({ type: 'varchar', default: 'INITIATED' })
  paymentStatus: string;

  @Column({ type: 'varchar', default: 'NOT_SPLIT' })
  splitStatus: string;

  @Column({ type: 'int', default: 0 })
  vendorAllocationPesewas: number;

  @Column({ type: 'int', default: 0 })
  deliveryPartnerAllocationPesewas: number;

  @Column({ type: 'int', default: 0 })
  fleetDeliveryPartnerAllocationPesewas: number;

  @Column({ type: 'int', default: 0 })
  oreAllocationPesewas: number;

  @Column({ type: 'int', default: 0 })
  processorFeePesewas: number;

  @Column({ type: 'varchar', default: 'NONE' })
  refundStatus: string;

  @Column({ type: 'varchar', default: 'PENDING_ORDER_OUTCOME' })
  settlementStatus: string;

  @Column({ type: 'simple-json', nullable: true })
  allocationJson: Record<string, unknown> | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
