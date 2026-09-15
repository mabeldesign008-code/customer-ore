import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/** Saved customer voucher code. Discount still comes from the matching Vendor promotion. */
@Entity({ schema: 'catalog' })
@Index(['customerId', 'code'], { unique: true })
export class CustomerVoucher {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  customerId: string;

  @Column({ type: 'varchar' })
  code: string;

  @Column()
  promotionId: string;

  @Column()
  vendorId: string;

  @CreateDateColumn()
  createdAt: Date;
}
