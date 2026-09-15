import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity({ schema: 'notification' })
export class Campaign {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'varchar', default: 'DRAFT' })
  status: string; // DRAFT, PENDING_APPROVAL, APPROVED, SCHEDULED, SENDING, COMPLETED, CANCELLED

  @Column()
  titleTemplate: string;

  @Column({ type: 'text' })
  bodyTemplate: string;

  @Column({ type: 'simple-json', nullable: true })
  dataJson: Record<string, string> | null;

  @Column({ type: 'simple-json' })
  audienceRule: Record<string, any>;

  @Column({ type: Date, nullable: true })
  scheduledAt: Date | null;

  @Column({ nullable: true })
  createdByUserId: string;

  @Column({ nullable: true })
  approvedByUserId: string;

  @Column({ type: 'int', default: 0 })
  targetCount: number;

  @Column({ type: 'int', default: 0 })
  sentCount: number;

  @Column({ type: 'int', default: 0 })
  failCount: number;

  @Column({ type: 'int', default: 0 })
  openCount: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
