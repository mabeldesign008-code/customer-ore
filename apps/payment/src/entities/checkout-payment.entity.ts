import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { CheckoutPaymentStatus } from '@ore/contracts';

/** One Paystack transaction per checkout (may cover many vendor-orders — G37). */
@Entity({ schema: 'payment' })
export class CheckoutPayment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  checkoutId: string;

  @Column({ unique: true })
  reference: string;

  @Column({ type: 'int' })
  amountPesewas: number;

  @Column({ type: 'varchar', default: 'GHS' })
  currency: string;

  @Column({ type: 'varchar', nullable: true })
  channel: string | null;

  @Column({ type: 'varchar', default: CheckoutPaymentStatus.INITIATED })
  status: CheckoutPaymentStatus;

  @Column({ type: 'varchar', nullable: true })
  customerEmail: string | null;

  @Column({ type: Date, nullable: true })
  paidAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
