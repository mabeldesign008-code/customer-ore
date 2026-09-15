import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

/**
 * An admin account. 1:1 with `user` where role='admin'.
 *
 * This lives in its own table rather than as more columns on `user` because `user` is
 * shared by customers, vendors and riders and is written by the public OTP signup path.
 * Admin-only concerns — TOTP enrolment, suspension, Telegram alerting, job title —
 * have no business on a row a customer signup also touches.
 *
 * `status` is checked live by `PermissionGuard` on every admin request (cached 15s),
 * so suspending somebody bites immediately instead of waiting out their access token.
 */
@Entity({ schema: 'auth' })
@Index(['userId'], { unique: true })
@Index(['adminRole', 'status'])
export class AdminUser {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  /** AdminRole. Authoritative — `user.adminRole` is only the bootstrap backfill. */
  @Column({ type: 'varchar', default: 'support' })
  adminRole: string;

  @Column({ type: 'varchar', nullable: true })
  displayName: string | null;

  @Column({ type: 'varchar', nullable: true })
  jobTitle: string | null;

  /** ACTIVE | SUSPENDED | REVOKED | PENDING_ENROLMENT */
  @Column({ type: 'varchar', default: 'ACTIVE' })
  status: string;

  /**
   * Null until the admin completes first-login enrolment. An admin who has not enrolled
   * cannot be issued a session — see AuthService.adminLogin.
   */
  @Column({ type: 'varchar', nullable: true })
  pendingTotpSecret: string | null;

  @Column({ type: Date, nullable: true })
  totpEnrolledAt: Date | null;

  /**
   * One-shot enrolment token.
   *
   * `adminLogin` deliberately refuses anyone without `user.totpSecret`, and that secret
   * only exists once enrolment completes — so enrolment cannot require a login token or
   * the admin could never get in. This token is the way in: handed to the invitee once,
   * consumed by POST /auth/admin/enrol, and cleared on success.
   */
  @Column({ type: 'varchar', nullable: true })
  enrolToken: string | null;

  @Column({ type: Date, nullable: true })
  enrolTokenExpiresAt: Date | null;

  /** Where escalation alerts go. Linked via the /link <code> bot flow, never typed in. */
  @Column({ type: 'varchar', nullable: true })
  telegramChatId: string | null;

  @Column({ type: Date, nullable: true })
  telegramLinkedAt: Date | null;

  @Column({ type: 'simple-json', nullable: true })
  notificationPrefsJson: Record<string, unknown> | null;

  @Column({ type: 'varchar', nullable: true })
  invitedBy: string | null;

  @Column({ type: Date, nullable: true })
  invitedAt: Date | null;

  @Column({ type: Date, nullable: true })
  lastLoginAt: Date | null;

  @Column({ type: 'varchar', nullable: true })
  lastLoginIp: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
