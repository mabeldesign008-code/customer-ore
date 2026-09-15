import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

/**
 * A refund that has been asked for but not yet paid.
 *
 * Before this existed, `finance.refund.approve` was a permission with nothing behind it:
 * whoever held it could refund any order in one call, and the person asking and the person
 * approving were the same click. Splitting it means a refund is proposed here, sits in a
 * queue, and only executes once a *different* admin signs it — the approval itself runs
 * through the maker-checker gate, so the two-person rule is enforced by the same code
 * path as every other money movement.
 *
 * `amountPesewas` is frozen at submission. The approver sees exactly what they are
 * signing; it cannot be edited between asking and approving.
 */
@Entity({ schema: 'payment' })
@Index(['status', 'createdAt'])
@Index(['orderId'])
export class RefundRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  orderId: string;

  @Column({ type: 'int' })
  amountPesewas: number;

  @Column({ type: 'text' })
  reason: string;

  @Column({ type: 'varchar', default: 'UNSPECIFIED' })
  refundComponent: string;

  @Column({ type: 'varchar', default: 'UNKNOWN' })
  originalTaxStatus: string;

  @Column({ type: 'varchar', default: 'OPEN' })
  taxPeriodStatus: 'OPEN' | 'FILED' | 'AMENDED' | 'CLOSED';

  /** customer | admin — who raised it. Customers raising it is the normal path. */
  @Column({ type: 'varchar', default: 'admin' })
  raisedBy: string;

  @Column({ type: 'varchar', nullable: true })
  raisedByUserId: string | null;

  /** PENDING | APPROVED | REJECTED | EXECUTED | FAILED */
  @Column({ type: 'varchar', default: 'PENDING' })
  status: string;

  @Column({ type: 'varchar', nullable: true })
  decidedBy: string | null;

  @Column({ type: Date, nullable: true })
  decidedAt: Date | null;

  @Column({ type: 'text', nullable: true })
  decisionNote: string | null;

  /** The approval row in auth that authorised execution, if any. */
  @Column({ type: 'varchar', nullable: true })
  approvalId: string | null;

  @Column({ type: 'varchar', nullable: true })
  executionRef: string | null;

  /** The Refund row created once it actually paid out. */
  @Column({ type: 'varchar', nullable: true })
  refundId: string | null;

  @Column({ type: 'text', nullable: true })
  failureReason: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
