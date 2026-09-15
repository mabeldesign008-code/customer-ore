import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { ApplicationStatus, SmileIdStatus, VendorType } from '@ore/contracts';

export { ApplicationStatus, SmileIdStatus };
export type ApplicationKind = 'VENDOR' | 'RIDER';
export type VendorClass = 'INDIVIDUAL' | 'BUSINESS';

@Entity({ schema: 'onboarding' })
@Index(['status', 'kind'])
export class Application {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  applicantUserId: string;

  @Column()
  applicantPhone: string;

  @Column({ type: 'varchar', nullable: true })
  applicantName: string | null;

  @Column({ type: 'varchar' })
  kind: ApplicationKind;

  @Column({ type: 'varchar', default: ApplicationStatus.DRAFT })
  status: ApplicationStatus;

  @Column({ type: 'int', default: 1 })
  currentStage: number;

  @Column({ type: 'int', default: 4 })
  maxStages: number;

  @Column({ type: 'json', nullable: true })
  stageData: Record<string, unknown>;

  @Column({ type: 'varchar', default: SmileIdStatus.NOT_STARTED })
  smileIdStatus: SmileIdStatus;

  @Column({ type: 'varchar', nullable: true })
  vendorClass: VendorClass | null;

  @Column({ type: 'varchar', nullable: true })
  vendorType: VendorType | null;

  @Column({ type: 'varchar', nullable: true })
  businessName: string | null;

  @Column({ type: 'float', nullable: true })
  lat: number | null;

  @Column({ type: 'float', nullable: true })
  lng: number | null;

  @Column({ type: 'json', nullable: true })
  workplaceGps: Record<string, unknown> | null;

  @Column({ type: 'json', nullable: true })
  payoutInfo: Record<string, unknown> | null;

  @Column({ type: 'varchar', nullable: true })
  vehicle: string | null;

  @Column({ type: 'varchar', nullable: true })
  reason: string | null; // rejection reason

  @Column({ type: 'varchar', nullable: true })
  requiresActionField: string | null;

  @Column({ type: 'varchar', nullable: true })
  publicId: string | null; // Vendors: ORV-YYYY-NNNN. Riders: backend-issued YDR-CC-YYYY-NNNN Rider ID.

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
