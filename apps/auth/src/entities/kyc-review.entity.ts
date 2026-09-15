import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

/**
 * A KYC review case.
 *
 * WHY THIS IS MANUAL
 * Smile ID requires a `partner_id` in every request body and the partner ID has not been
 * provided, so automated verification cannot run. Rather than block the whole capability, the
 * review is a human queue: someone looks at the documents and records a decision. The
 * automated path can be dropped in later without changing this table, because what it stores
 * is the *decision*, not the method.
 *
 * WHY THE DECISION IS DUAL-CONTROLLED
 * `compliance.kyc.decide` is `WW-----W` — operations and compliance both hold it. Approving a
 * KYC is what unlocks withdrawals for an account, so it is the single highest-leverage approval
 * in the system: one wrong approve is a payout to an identity the platform never verified.
 *
 * WHY DOCUMENT REFERENCES, NOT DOCUMENTS
 * This table stores keys, never images. A KYC document is the most sensitive thing the platform
 * holds, and copying it into a second store doubles the places it can leak from.
 */

export type KycStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'NEEDS_INFO';

export type KycDocumentType = 'NATIONAL_ID' | 'PASSPORT' | 'DRIVERS_LICENCE' | 'VOTER_ID' | 'SELFIE' | 'UTILITY_BILL';

@Entity({ schema: 'auth' })
@Index(['status', 'createdAt'])
@Index(['userId', 'createdAt'])
export class KycReview {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  userId: string;

  @Column({ type: 'varchar', default: 'CUSTOMER' })
  userType: 'CUSTOMER' | 'RIDER' | 'VENDOR';

  @Column({ type: 'varchar', default: 'PENDING' })
  status: KycStatus;

  /** Storage keys of the submitted documents. Never the documents themselves. */
  @Column({ type: 'simple-json', nullable: true })
  documentKeysJson: Array<{ type: KycDocumentType; key: string; uploadedAt: string }> | null;

  @Column({ type: 'varchar', nullable: true })
  idNumber: string | null;

  @Column({ type: 'varchar', nullable: true })
  fullName: string | null;

  @Column({ type: 'varchar', nullable: true })
  submittedBy: string | null;

  @Column({ type: Date, nullable: true })
  submittedAt: Date | null;

  @Column({ type: 'varchar', nullable: true })
  decidedBy: string | null;

  @Column({ type: Date, nullable: true })
  decidedAt: Date | null;

  /**
   * Mandatory on reject and on needs-info. A rejection with no reason cannot be appealed and
   * cannot be reviewed by the next person in the queue.
   */
  @Column({ type: 'text', nullable: true })
  decisionNote: string | null;

  /** Which automated provider produced the result, once one is wired. Null while manual. */
  @Column({ type: 'varchar', nullable: true })
  provider: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
