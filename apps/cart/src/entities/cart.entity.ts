import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { CartStatus } from '@ore/contracts';

@Entity({ schema: 'cart' })
export class Cart {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  customerId: string;

  @Column({ type: 'varchar', default: CartStatus.ACTIVE })
  status: CartStatus;

  @Column({ type: 'varchar', nullable: true })
  checkoutId: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
