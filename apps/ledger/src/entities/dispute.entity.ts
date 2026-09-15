import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { DisputeReason, DisputeStatus, FaultParty, RefundMethod } from '@ore/contracts';

/** Doc §Payment — customer-raised dispute on a delivered order. One per order. */
@Entity({ schema: 'ledger' })
@Index(['status'])
export class Dispute {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  orderId: string;

  @Column()
  customerId: string;

  @Column()
  vendorId: string;

  @Column({ type: 'varchar' })
  reason: DisputeReason;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'simple-json', nullable: true })
  evidenceKeys: string[] | null; // media storage keys

  @Column({ type: 'varchar', default: DisputeStatus.OPEN })
  status: DisputeStatus;

  @Column({ type: 'varchar', nullable: true })
  fault: FaultParty | null; // doc §Payment fault matrix

  @Column({ type: 'int', default: 0 })
  decisionPesewas: number; // amount the customer is entitled to (0 = none)

  @Column({ type: 'int', default: 0 })
  refundedPesewas: number; // actually refunded (never refunded twice)

  @Column({ type: 'varchar', nullable: true })
  refundMethod: RefundMethod | null;

  @Column({ type: 'varchar', nullable: true })
  note: string | null;

  @Column({ type: 'varchar', nullable: true })
  decidedBy: string | null;

  @Column({ type: Date, nullable: true })
  decidedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
