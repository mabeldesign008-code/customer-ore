import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export type TaxReviewStatus = 'OPEN' | 'IN_REVIEW' | 'RESOLVED' | 'REJECTED';

/** Exceptions queue: unclear classification never defaults to Ore revenue/no-WHT. */
@Entity({ schema: 'ledger' })
@Index(['status', 'createdAt'])
@Index(['orderId'])
@Index(['reasonCode'])
export class TaxReviewCase {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  transactionId: string;

  @Column({ type: 'varchar', nullable: true })
  orderId: string | null;

  @Column({ type: 'varchar', nullable: true })
  componentType: string | null;

  @Column({ type: 'varchar' })
  reasonCode: string;

  @Column({ type: 'text' })
  reason: string;

  @Column({ type: 'varchar', default: 'OPEN' })
  status: TaxReviewStatus;

  @Column({ type: 'varchar', nullable: true })
  assignedTo: string | null;

  @Column({ type: 'varchar', nullable: true })
  resolvedBy: string | null;

  @Column({ type: Date, nullable: true })
  resolvedAt: Date | null;

  @Column({ type: 'text', nullable: true })
  resolutionNote: string | null;

  @Column({ type: 'simple-json', nullable: true })
  payloadJson: Record<string, unknown> | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
