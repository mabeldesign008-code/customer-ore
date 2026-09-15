import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

/**
 * Provider-job correlation and final-result storage for SmileID verification.
 * Raw image bytes are never stored here.
 */
@Entity({ schema: 'onboarding' })
@Index(['providerJobId'], { unique: true })
@Index(['applicationId', 'createdAt'])
export class SmileVerificationJob {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  applicationId: string;

  @Column({ type: 'varchar' })
  applicantUserId: string;

  @Column({ type: 'varchar' })
  providerJobId: string;

  @Column({ type: 'varchar', nullable: true })
  providerUserId: string | null;

  @Column({ type: 'varchar', default: 'PENDING' })
  status: string;

  @Column({ type: 'varchar', nullable: true })
  reason: string | null;

  @Column({ type: 'text', nullable: true })
  message: string | null;

  @Column({ type: 'simple-json', nullable: true })
  providerPayload: Record<string, unknown> | null;

  @Column({ type: Date, nullable: true })
  providerCreatedAt: Date | null;

  @Column({ type: Date, nullable: true })
  completedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
