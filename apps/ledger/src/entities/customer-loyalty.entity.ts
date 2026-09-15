import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

/** 1 point per GHS 1 of delivered subtotal. 100 points redeem for GHS 1 wallet credit. */
@Entity({ schema: 'ledger' })
export class CustomerLoyalty {
  @PrimaryColumn()
  userId: string;

  @Column({ type: 'int', default: 0 })
  points: number;

  @Column({ type: 'int', default: 0 })
  lifetimeEarned: number;

  @Column({ type: 'int', default: 0 })
  lifetimeRedeemed: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
