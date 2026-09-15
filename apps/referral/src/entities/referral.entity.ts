import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { ReferralStatus } from '@ore/contracts';

/** Doc §8 — one referee claim on a referrer's code. Credits fire on the referee's first
 *  successful, non-refunded order ≥ min (unique phone, no self/linked referrals, caps). */
@Entity({ schema: 'referral' })
@Index(['status'])
export class Referral {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  code: string;

  @Column()
  referrerUserId: string;

  @Column()
  referrerPhone: string;

  @Column()
  refereePhone: string;

  @Column({ type: 'varchar', nullable: true })
  refereeUserId: string | null; // resolved if the phone already has an account

  @Column({ type: 'varchar', default: ReferralStatus.PENDING })
  status: ReferralStatus;

  @Column({ type: 'simple-json', nullable: true })
  fraudFlags: string[] | null; // self_referral, repeat_referee, velocity, over_cap, linked_phone

  @Column({ type: Date, nullable: true })
  qualifiedAt: Date | null;

  @Column({ type: Date, nullable: true })
  creditedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
