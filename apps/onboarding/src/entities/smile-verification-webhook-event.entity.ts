import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/** Dedupe ledger for at-least-once SmileID webhook delivery. */
@Entity({ schema: 'onboarding' })
@Index(['eventHash'], { unique: true })
export class SmileVerificationWebhookEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  eventHash: string;

  @Column()
  providerJobId: string;

  @Column({ type: 'simple-json' })
  payloadJson: Record<string, unknown>;

  @Column({ type: 'boolean', default: false })
  processed: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
