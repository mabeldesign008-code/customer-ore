import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/**
 * Append-only analytics fact. One row per published domain event that no other
 * service consumes (the platform telemetry surface: checkout, offers, disputes,
 * lifecycle transitions, referral claims, ...).
 *
 * Idempotent by envelope id (unique) — replays/redeliveries never double-count.
 */
@Entity({ schema: 'analytics' })
@Index(['name', 'createdAt'])
export class AnalyticsEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  /** NATS envelope id — unique so a redelivered envelope cannot be counted twice. */
  @Column({ type: 'varchar', unique: true })
  envelopeId: string;

  @Column({ type: 'simple-json' })
  payloadJson: Record<string, unknown>;

  @CreateDateColumn()
  createdAt: Date;
}
