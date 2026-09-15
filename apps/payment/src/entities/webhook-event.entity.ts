import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

/** Webhook dedupe ledger — unique id = the Paystack event id (G06, at-least-once delivery). */
@Entity({ schema: 'payment' })
export class WebhookEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  eventId: string; // Paystack's own event id

  @Column()
  event: string;

  @Column({ type: 'simple-json' })
  payloadJson: Record<string, unknown>;

  @Column({ type: 'boolean', default: false })
  processed: boolean;

  /**
   * How many times processing has been attempted.
   *
   * Processing is fire-and-forget after the row is inserted, so a crash — or any thrown handler —
   * used to leave `processed = false` with nothing to retry it. The comment said "so a manual
   * replay can re-run"; no replay existed. The sweeper retries these, and needs a counter to
   * know when to stop.
   */
  @Column({ type: 'int', default: 0 })
  attempts: number;

  /** Last failure, kept so a permanently-stuck webhook can be diagnosed without log archaeology. */
  @Column({ type: 'text', nullable: true })
  lastError: string | null;

  /** Set when attempts are exhausted. Terminal: the sweeper will not pick it up again. */
  @Column({ type: 'boolean', default: false })
  abandoned: boolean;

  /** When the last attempt ran, so the sweeper can back off rather than hammer a failing event. */
  @Column({ type: Date, nullable: true })
  lastAttemptAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;
}
