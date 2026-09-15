import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

/** Vendor campaign management record. Checkout application is a separate pricing contract. */
@Entity({ schema: 'catalog' })
@Index(['vendorId', 'active', 'startsAt', 'endsAt'])
export class VendorPromotion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  vendorId: string;

  @Column({ type: 'varchar' })
  title: string;

  /** Optional customer-facing code. Unique when set. */
  @Column({ type: 'varchar', nullable: true, unique: true })
  code: string | null;

  @Column({ type: 'varchar' })
  discountType: 'PERCENT' | 'FIXED';

  @Column({ type: 'int' })
  discountValue: number; // percentage points or pesewas depending on discountType

  @Column({ type: 'int', default: 0 })
  minimumSubtotalPesewas: number;

  @Column({ type: 'int', nullable: true })
  budgetPesewas: number | null;

  @Column({ type: 'int', nullable: true })
  redemptionLimit: number | null;

  @Column({ type: 'int', default: 0 })
  spentPesewas: number;

  @Column({ type: 'int', default: 0 })
  redemptionsUsed: number;

  @Column({ type: Date })
  startsAt: Date;

  @Column({ type: Date })
  endsAt: Date;

  @Column({ type: 'boolean', default: true })
  active: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
