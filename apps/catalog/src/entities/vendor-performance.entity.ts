import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { PerformanceEngineConfig, PerformanceEngineResult } from '@ore/contracts';

@Entity({ schema: 'catalog' })
@Index(['active', 'createdAt'])
export class VendorPerformanceConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'int' })
  version: number;

  @Column({ type: 'varchar', default: 'MONTHLY' })
  reviewPeriod: string;

  @Column({ type: 'boolean', default: true })
  active: boolean;

  @Column({ type: 'simple-json' })
  configJson: PerformanceEngineConfig;

  @Column({ type: 'varchar' })
  createdBy: string;

  @Column({ type: 'varchar', nullable: true })
  approvedBy: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity({ schema: 'catalog' })
@Index(['vendorId', 'periodStart', 'periodEnd'])
@Index(['status', 'createdAt'])
@Index(['reviewerId', 'createdAt'])
@Index(['outcome', 'createdAt'])
export class VendorPerformanceRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  vendorId: string;

  @Column({ type: Date })
  periodStart: Date;

  @Column({ type: Date })
  periodEnd: Date;

  @Column({ type: 'int' })
  configVersion: number;

  @Column({ type: 'varchar', nullable: true })
  configId: string | null;

  @Column({ type: 'varchar', nullable: true })
  reviewerId: string | null;

  @Column({ type: 'float', nullable: true })
  overallScore: number | null;

  @Column({ type: 'varchar', nullable: true })
  grade: string | null;

  @Column({ type: 'varchar' })
  status: string;

  @Column({ type: 'varchar' })
  trend: string;

  @Column({ type: 'boolean', default: false })
  insufficientData: boolean;

  @Column({ type: 'simple-json' })
  resultJson: PerformanceEngineResult;

  @Column({ type: 'simple-array', nullable: true })
  metricCategories: string[] | null;

  @Column({ type: 'simple-array', nullable: true })
  incidentTypes: string[] | null;

  @Column({ type: 'simple-array', nullable: true })
  actionCodes: string[] | null;

  @Column({ type: 'varchar', nullable: true })
  outcome: string | null;

  @Column({ type: 'varchar', default: 'REVIEW' })
  recordType: 'REVIEW' | 'CORRECTION' | 'APPEAL' | 'REVERSAL';

  @Column({ type: 'varchar', nullable: true })
  linkedRecordId: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @CreateDateColumn()
  createdAt: Date;
}

@Entity({ schema: 'catalog' })
@Index(['vendorId', 'createdAt'])
export class VendorPerformanceAudit {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', nullable: true })
  vendorId: string | null;

  @Column({ type: 'varchar' })
  action: string;

  @Column({ type: 'varchar' })
  actorId: string;

  @Column({ type: 'varchar', nullable: true })
  recordId: string | null;

  @Column({ type: 'simple-json', nullable: true })
  payloadJson: Record<string, unknown> | null;

  @Column({ type: 'text', nullable: true })
  reason: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
