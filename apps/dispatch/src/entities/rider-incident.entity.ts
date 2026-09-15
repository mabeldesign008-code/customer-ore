import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity({ schema: 'dispatch' })
@Index(['riderId', 'createdAt'])
export class RiderIncident {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  riderId: string;

  @Column({ type: 'varchar', nullable: true })
  orderId: string | null;

  @Column({ type: 'varchar' })
  type: string;

  @Column({ type: 'text', nullable: true })
  note: string | null;

  @Column({ type: 'float', nullable: true })
  lat: number | null;

  @Column({ type: 'float', nullable: true })
  lng: number | null;

  @Column({ type: 'varchar', default: 'OPEN' })
  status: string;

  @Column({ type: 'varchar', default: 'LOW' })
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

  @Column({ type: 'varchar', default: 'UNKNOWN' })
  attribution: string;

  @Column({ type: 'boolean', default: false })
  excludedFromPerformance: boolean;

  @Column({ type: 'text', nullable: true })
  exclusionReason: string | null;

  @Column({ type: 'boolean', default: true })
  performanceImpact: boolean;

  @Column({ type: 'varchar', nullable: true })
  reviewerId: string | null;

  @Column({ type: Date, nullable: true })
  reviewedAt: Date | null;

  @Column({ type: 'varchar', nullable: true })
  outcome: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
