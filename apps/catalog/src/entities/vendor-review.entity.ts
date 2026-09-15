import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

/** Customer review attached to one delivered order and Vendor response. */
@Entity({ schema: 'catalog' })
@Index(['vendorId', 'createdAt'])
export class VendorReview {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  orderId: string;

  @Column()
  vendorId: string;

  @Column()
  customerId: string;

  @Column({ type: 'int' })
  rating: number;

  @Column({ type: 'text', nullable: true })
  comment: string | null;

  @Column({ type: 'text', nullable: true })
  vendorResponse: string | null;

  @Column({ type: Date, nullable: true })
  respondedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
