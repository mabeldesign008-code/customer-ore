import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/** How much of the single charge belongs to each vendor-order (G37). Sum == charge amount. */
@Entity({ schema: 'payment' })
@Index(['orderId'])
export class PaymentAllocation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  checkoutPaymentId: string;

  @Column()
  checkoutId: string;

  @Column()
  orderId: string;

  @Column({ type: 'int' })
  allocatedPesewas: number;

  @CreateDateColumn()
  createdAt: Date;
}
