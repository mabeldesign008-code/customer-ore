import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

/** Daily reconciliation report (G28/G30). */
@Entity({ schema: 'ledger' })
export class ReconcileRun {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'date' })
  period: string;

  @Column({ type: 'varchar', default: 'RUNNING' })
  status: 'RUNNING' | 'MATCHED' | 'FLAGGED';

  @Column({ type: 'simple-json', nullable: true })
  reportJson: Record<string, unknown> | null;

  @CreateDateColumn()
  createdAt: Date;
}
