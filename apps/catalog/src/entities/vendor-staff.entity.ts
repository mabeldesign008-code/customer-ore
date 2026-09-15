import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export type VendorStaffRole = 'MANAGER' | 'ORDER_OPERATOR' | 'CATALOG_EDITOR' | 'FINANCE_VIEWER';

/** Staff access is attached to the existing Vendor auth role and scoped to one Vendor. */
@Entity({ schema: 'catalog' })
@Index(['vendorId', 'userId'], { unique: true })
export class VendorStaff {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  vendorId: string;

  @Column()
  userId: string;

  @Column()
  displayName: string;

  @Column({ type: 'varchar', nullable: true })
  phone: string | null;

  @Column({ type: 'varchar', default: 'ORDER_OPERATOR' })
  staffRole: VendorStaffRole;

  @Column({ type: 'boolean', default: true })
  active: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
