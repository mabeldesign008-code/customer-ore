import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { AdminRole, ApplicationStatus } from '@ore/contracts';

@Entity({ schema: 'onboarding' })
@Index(['applicationId', 'createdAt'])
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  applicationId: string;

  @Column()
  reviewerId: string;

  @Column({ type: 'varchar', default: AdminRole.COMPLIANCE })
  reviewerRole: AdminRole;

  @Column({ type: 'varchar' })
  action: 'APPROVED' | 'REJECTED' | 'REQUIRES_ACTION' | 'SUSPENDED' | 'SMILE_MANUAL';

  @Column({ type: 'varchar' })
  previousState: ApplicationStatus | string;

  @Column({ type: 'varchar' })
  newState: ApplicationStatus | string;

  @Column({ type: 'varchar', nullable: true })
  reason: string | null;

  @Column({ type: 'varchar', nullable: true })
  requiresActionField: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
