import { Column, CreateDateColumn, Entity, Index, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { CommsMessage } from './message.entity';

@Entity({ schema: 'comms' })
@Index('comms_thread_order_id_unique', ['orderId'], { unique: true })
@Index('comms_thread_support_owner_unique', ['ownerUserId'], { unique: true, where: "kind = 'support'" })
export class CommsThread {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** `order` is live order membership. `support` is the user ↔ Ore Support inbox. */
  @Column({ type: 'varchar', default: 'order' })
  kind: 'order' | 'support';

  @Column({ type: 'varchar', nullable: true })
  orderId: string | null;

  /** Support-thread owner (JWT `sub`). Null on order threads. */
  @Column({ type: 'varchar', nullable: true })
  ownerUserId: string | null;

  @Column({ type: 'varchar', nullable: true })
  ownerRole: string | null;

  @Column({ type: 'varchar', nullable: true })
  customerId: string | null;

  @Column({ type: 'varchar', nullable: true })
  vendorId: string | null;

  @Column({ type: 'varchar', nullable: true })
  riderId: string | null;

  @OneToMany(() => CommsMessage, (message) => message.thread)
  messages: CommsMessage[];

  /**
   * Who owns the conversation right now. The AI and a human must never both be speaking:
   * an admin taking over flips this to HUMAN_ACTIVE and the assistant stops replying.
   */
  @Column({ type: 'varchar', default: 'AI_HANDLING' })
  status: string;

  @Column({ type: 'varchar', nullable: true })
  assignedToUserId: string | null;

  /**
   * The support rep who owns this conversation. Does NOT change when a specialist is
   * invited — that is the whole point of swarming: one point of contact for the customer.
   */
  @Column({ type: 'varchar', nullable: true })
  ownerAdminUserId: string | null;

  /** Comma-separated AdminRoles alerted to this thread, e.g. "finance,operations". */
  @Column({ type: 'varchar', nullable: true })
  flaggedTeams: string | null;

  @Column({ type: 'varchar', nullable: true })
  escalationReason: string | null;

  @Column({ type: 'varchar', nullable: true })
  escalationTeam: string | null;

  @Column({ type: Date, nullable: true })
  lastAiAt: Date | null;

  @Column({ type: Date, nullable: true })
  lastHumanAt: Date | null;

  /* ─────────────────────────── ticket fields (T4.1) ─────────────────────────
   * A conversation only becomes a ticket once it has an identity, a clock and an
   * outcome. Without these you cannot answer "how long did we take?", "who closed
   * it?", or "was the customer satisfied?" — which are the three questions support
   * management actually asks. History is retained forever (chat transcripts are the
   * investigation record), so a closed ticket stays queryable.
   */

  /** Human-facing reference, e.g. SUP-00042. What the customer is told to quote. */
  @Column({ type: 'varchar', nullable: true })
  ticketRef: string | null;

  /** low | normal | high | urgent. Drives the SLA clock. */
  @Column({ type: 'varchar', default: 'normal' })
  priority: string;

  /** refund | delivery | payment | account | complaint | other. Free-form-ish. */
  @Column({ type: 'varchar', nullable: true })
  category: string | null;

  @Column({ type: 'simple-json', nullable: true })
  tagsJson: string[] | null;

  /** First human reply. The number customers actually feel. */
  @Column({ type: Date, nullable: true })
  firstResponseAt: Date | null;

  @Column({ type: Date, nullable: true })
  resolvedAt: Date | null;

  /** Closed is terminal; resolved can be reopened. */
  @Column({ type: Date, nullable: true })
  closedAt: Date | null;

  @Column({ type: 'varchar', nullable: true })
  closedBy: string | null;

  /** How many times a resolved ticket came back. A high count means we close too early. */
  @Column({ type: 'int', default: 0 })
  reopenCount: number;

  /** 1-5, from the post-resolution in-chat survey. */
  @Column({ type: 'int', nullable: true })
  csatScore: number | null;

  @Column({ type: 'text', nullable: true })
  csatComment: string | null;

  /** When the SLA for this priority expires. Breaches are alerted, not silently missed. */
  @Column({ type: Date, nullable: true })
  slaDueAt: Date | null;

  @Column({ type: Date, nullable: true })
  slaBreachedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
