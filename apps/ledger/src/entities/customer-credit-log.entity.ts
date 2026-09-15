import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

/** Immutable credit log — the idempotency key for wallet credits (no double refund). */
@Entity({ schema: 'ledger' })
export class CustomerCreditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column({ type: 'int' })
  amountPesewas: number;

  @Column({ unique: true })
  ref: string; // e.g. "dispute:<id>" — a credit is applied exactly once

  @Column({ type: 'varchar', default: 'manual' })
  kind: string; // manual | referral | errand | dispute | admin

  @Column({ type: Date, nullable: true })
  expiresAt: Date | null; // doc §8: referral credits expire after 14 days if unused

  @Column({ type: Date, nullable: true })
  expiredAt: Date | null;

  @Column()
  reason: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
