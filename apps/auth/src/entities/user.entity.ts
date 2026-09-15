import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Role } from '@ore/contracts';

@Entity({ schema: 'auth' })
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  phone: string;

  @Column({ type: 'varchar', default: Role.CUSTOMER })
  role: Role;

  @Column({ type: 'simple-array', default: Role.CUSTOMER })
  roles: string[];

  @Column({ type: 'varchar', nullable: true })
  name: string | null;

  @Column({ type: 'varchar', nullable: true })
  email: string | null;

  @Column({ type: 'varchar', nullable: true })
  passwordHash: string | null;

  @Column({ type: 'varchar', nullable: true })
  totpSecret: string | null;

  @Column({ type: 'varchar', nullable: true })
  deviceToken: string | null;

  @Column({ type: 'varchar', nullable: true })
  deviceFingerprint: string | null;

  @Column({ type: 'boolean', default: false })
  verified: boolean;

  /** AdminRole for admin users; null for everyone else. Drives support queue routing. */
  @Column({ type: 'varchar', nullable: true })
  adminRole: string | null;

  @Column({ type: 'varchar', nullable: true })
  publicId: string | null; // ORC-YYYY-NNNNNN (doc §IDs — auto at signup)

  /* ─────────────────── account standing (Operations) ───────────────────
   * None of this existed, so there was no way to stop an abusive account: no status, no
   * suspension, and nothing for the auth guard to enforce. A banned customer could simply
   * keep ordering.
   */

  /** ACTIVE | SUSPENDED | BANNED. Only ACTIVE may transact. */
  @Column({ type: 'varchar', default: 'ACTIVE' })
  status: string;

  /** When a SUSPENDED account may come back on its own. Null for an indefinite suspension. */
  @Column({ type: Date, nullable: true })
  suspendedUntil: Date | null;

  /** Shown to the customer and kept in the audit trail. Mandatory — a suspension with no
   * reason is unauditable and, in a dispute, indefensible. */
  @Column({ type: 'text', nullable: true })
  suspensionReason: string | null;

  @Column({ type: 'varchar', nullable: true })
  suspendedBy: string | null;

  @Column({ type: Date, nullable: true })
  lastLoginAt: Date | null;

  /** City, for the operations map and for city-scoped marketing. */
  @Column({ type: 'varchar', nullable: true })
  city: string | null;

  /**
   * Marketing consent. Separate from `verified`: a verified account is not a consenting
   * one, and conflating them is how you end up emailing people who never asked.
   */
  @Column({ type: 'boolean', default: false })
  marketingConsent: boolean;

  /** Customer COD risk tier. Applies only to customer accounts and is enforced at checkout. */
  @Column({ type: 'varchar', default: 'NEW' })
  customerCodTier: 'NEW' | 'STANDARD' | 'TRUSTED' | 'PREMIUM';

  @Column({ type: 'boolean', default: false })
  customerCodBlocked: boolean;

  @Column({ type: 'text', nullable: true })
  customerCodBlockReason: string | null;

  /** Bumped on suspend/ban so issued tokens stop being trusted immediately. */
  @Column({ type: 'int', default: 0 })
  tokenEpoch: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
