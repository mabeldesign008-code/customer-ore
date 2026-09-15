import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/**
 * The central admin audit log. APPEND-ONLY.
 *
 * Before this table existed there was no queryable record of who moved money, who
 * approved a withdrawal, or who force-transitioned an order — the services threaded an
 * `adminUserId` into ledger refs, and since there was only ever one shared admin account
 * even that was meaningless.
 *
 * There is deliberately no update path and no delete path anywhere in the codebase for
 * this table. Same treatment as `ledger_entry`, `support_escalation` and
 * `support_tool_audit`.
 */
@Entity({ schema: 'auth' })
@Index(['actorUserId', 'createdAt'])
@Index(['resourceType', 'resourceId'])
@Index(['permission', 'createdAt'])
export class AdminAction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', nullable: true })
  actorUserId: string | null;

  /** The role the actor held at the time. Recorded, not joined — roles change. */
  @Column({ type: 'varchar', nullable: true })
  actorAdminRole: string | null;

  @Column({ type: 'varchar', nullable: true })
  permission: string | null;

  /** allow | deny */
  @Column({ type: 'varchar' })
  decision: string;

  @Column({ type: 'varchar', nullable: true })
  reason: string | null;

  @Column({ type: 'varchar', nullable: true })
  service: string | null;

  @Column({ type: 'varchar', nullable: true })
  method: string | null;

  @Column({ type: 'varchar', nullable: true })
  path: string | null;

  @Column({ type: 'varchar', nullable: true })
  resourceType: string | null;

  @Column({ type: 'varchar', nullable: true })
  resourceId: string | null;

  /** Set on money actions so "everything above GHS X today" is one indexed query. */
  @Column({ type: 'int', nullable: true })
  amountPesewas: number | null;

  @Column({ type: 'simple-json', nullable: true })
  beforeJson: Record<string, unknown> | null;

  @Column({ type: 'simple-json', nullable: true })
  afterJson: Record<string, unknown> | null;

  /**
   * True when the permission decision fell back to the JWT because the auth service was
   * unreachable. Lets you reconstruct exactly which window ran degraded.
   */
  @Column({ type: 'boolean', default: false })
  degraded: boolean;

  @Column({ type: 'varchar', nullable: true })
  ip: string | null;

  @Column({ type: 'varchar', nullable: true })
  userAgent: string | null;

  @Column({ type: 'varchar', nullable: true })
  traceId: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
