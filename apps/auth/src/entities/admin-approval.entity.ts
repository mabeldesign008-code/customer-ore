import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

/**
 * A dual-controlled money action, waiting for its checkers.
 *
 * This is the maker-checker state machine. Before it existed, holding a `⚖` permission
 * meant a single finance admin could approve and execute a payout alone — the guard
 * checked *whether* they could, never *whether anyone had checked it*.
 *
 * Two design points do the heavy lifting:
 *
 * 1. `executionRef` is UNIQUE. That is the whole idempotency story: a payout that fires
 *    twice would be this table failing, not the PSP being slow. If a service dies after
 *    the approval is released, replaying lands on the unique constraint, not on a second
 *    transfer. The reference the calling service uses as its PSP idempotency key must be
 *    this same value.
 *
 * 2. The payload is frozen at submission. `payloadJson` and `payloadHash` are written once
 *    in PENDING and never updated afterwards, so a maker cannot quietly change the amount
 *    or the beneficiary between asking and being approved. `assertPayloadUnchanged()`
 *    re-hashes at execution time and refuses if it differs.
 *
 * Status flow: PENDING -> (checkers sign) -> APPROVED -> EXECUTING -> EXECUTED
 *                     \-> REJECTED / EXPIRED / CANCELLED / FAILED
 *
 * EXECUTING is deliberately not recoverable by a plain retry. If a service dies there,
 * nobody knows whether the money moved, so a human has to look and either confirm it
 * happened (`confirmExecuted`) or write the reversal. Guessing is how you pay twice.
 */
@Entity({ schema: 'auth' })
@Index(['status', 'createdAt'])
@Index(['makerUserId', 'createdAt'])
@Index(['permission', 'status'])
export class AdminApproval {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Human-readable kind, e.g. `withdrawal.approve`, `wallet.adjust`. */
  @Column({ type: 'varchar' })
  kind: string;

  /** The dual-controlled permission being exercised, e.g. `finance.withdrawal.approve`. */
  @Column({ type: 'varchar' })
  permission: string;

  /** Which service owns the action. Used to route the execution call and the audit row. */
  @Column({ type: 'varchar' })
  service: string;

  @Column({ type: 'varchar', nullable: true })
  resourceType: string | null;

  @Column({ type: 'varchar', nullable: true })
  resourceId: string | null;

  /**
   * Idempotency key AND the DB-level guard against paying twice. Unique across the table.
   * The executing service must pass this same value to the PSP as its own reference.
   */
  @Index({ unique: true })
  @Column({ type: 'varchar' })
  executionRef: string;

  /** Money in pesewas. Zero for structural actions, which are always dual regardless. */
  @Column({ type: 'int', default: 0 })
  amountPesewas: number;

  @Column({ type: 'varchar' })
  currency: string;

  /** Frozen at submission. Never edited afterwards. */
  @Column({ type: 'simple-json', nullable: true })
  payloadJson: Record<string, unknown> | null;

  /** sha256 of the canonicalised payload. Re-checked at execution. */
  @Column({ type: 'varchar' })
  payloadHash: string;

  @Column({ type: 'varchar' })
  makerUserId: string;

  @Column({ type: 'varchar', nullable: true })
  makerAdminRole: string | null;

  /** One-line justification from the maker. Mandatory for wallet adjustments. */
  @Column({ type: 'text', nullable: true })
  reason: string | null;

  /** How many distinct checkers must sign. Derived from the amount tier. */
  @Column({ type: 'int' })
  requiredApprovals: number;

  /** True when a super admin must be among the checkers. */
  @Column({ type: 'boolean', default: false })
  requiresSuperAdmin: boolean;

  /** Distinct checkers who have signed so far. */
  @Column({ type: 'simple-json', nullable: true })
  approvalsJson: { userId: string; adminRole: string | null; at: string; note?: string }[] | null;

  /** PENDING | APPROVED | EXECUTING | EXECUTED | REJECTED | EXPIRED | CANCELLED | FAILED */
  @Column({ type: 'varchar', default: 'PENDING' })
  status: string;

  /** Approvals lapse. A stale request must not be approvable a week later. */
  @Column({ type: Date })
  expiresAt: Date;

  @Column({ type: 'varchar', nullable: true })
  decidedBy: string | null;

  @Column({ type: Date, nullable: true })
  decidedAt: Date | null;

  @Column({ type: 'varchar', nullable: true })
  executedBy: string | null;

  @Column({ type: Date, nullable: true })
  executedAt: Date | null;

  /** What the executing service reported — PSP reference, transfer id, error. */
  @Column({ type: 'simple-json', nullable: true })
  resultJson: Record<string, unknown> | null;

  @Column({ type: 'text', nullable: true })
  failureReason: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
