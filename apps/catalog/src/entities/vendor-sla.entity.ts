import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { VendorPenaltyLevel } from '@ore/contracts';

/** One SLA violation (doc §4: late accept / ready-too-early / cancel-after-accept). */
@Entity({ schema: 'catalog' })
@Index(['vendorId', 'createdAt'])
export class VendorSlaViolation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  vendorId: string;

  @Column()
  type: string; // LATE_ACCEPT | READY_EARLY | CANCEL_AFTER_ACCEPT | PRICE_MANIPULATION

  @Column({ type: 'varchar', nullable: true })
  orderId: string | null;

  @Column({ type: 'int', default: 0 })
  severity: number;

  @Column({ type: 'varchar', nullable: true })
  note: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

/** A penalty applied to a vendor (doc §4 ladder: warning → financial → suspension → permanent). */
@Entity({ schema: 'catalog' })
export class VendorPenalty {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  vendorId: string;

  @Column({ type: 'varchar' })
  level: VendorPenaltyLevel;

  @Column()
  trigger: string;

  @Column({ type: 'int', default: 0 })
  amountPesewas: number;

  @Column({ type: 'varchar', nullable: true })
  note: string | null;

  @Column({ type: 'varchar', nullable: true })
  decidedBy: string | null;

  @Column({ type: 'boolean', default: true })
  active: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
