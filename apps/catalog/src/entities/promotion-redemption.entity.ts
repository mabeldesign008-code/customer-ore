import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

/** Idempotent promotion redemption tied to an order. */
@Entity({ schema: 'catalog' })
@Index(['promotionId', 'status'])
export class PromotionRedemption {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  orderId: string;

  @Column()
  promotionId: string;

  @Column({ type: 'varchar', nullable: true })
  customerId: string | null;

  @Column({ type: 'int' })
  discountPesewas: number;

  @Column({ type: 'varchar', default: 'REDEEMED' })
  status: 'REDEEMED' | 'RELEASED';

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
