import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

/**
 * A fraud flag: a suspicion, recorded.
 *
 * WHY A FLAG IS NOT AN ACTION
 * A flag changes nothing by itself — it does not suspend, does not hold, does not refund. It is
 * the observation, and the actions are separate, dual-controlled decisions that reference it.
 * Conflating them is how a suspicion becomes a punishment with no decision recorded anywhere,
 * which is both unfair to the user and indefensible for the platform.
 *
 * WHY IT CARRIES THE EVIDENCE
 * `evidenceJson` holds the observable facts (order ids, amounts, timings) rather than a
 * narrative. Six months later, the person reviewing whether the flag was justified needs the
 * data, not the mood of whoever raised it.
 */

export type FraudFlagStatus = 'OPEN' | 'INVESTIGATING' | 'CONFIRMED' | 'DISMISSED';

export type FraudFlagSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

@Entity({ schema: 'auth' })
@Index(['status', 'severity'])
@Index(['targetType', 'targetId'])
@Index(['createdAt'])
export class FraudFlag {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  targetType: 'CUSTOMER' | 'RIDER' | 'VENDOR' | 'ORDER' | 'PAYMENT';

  @Column({ type: 'varchar' })
  targetId: string;

  @Column({ type: 'varchar', default: 'MEDIUM' })
  severity: FraudFlagSeverity;

  /** Short machine-ish label so flags can be grouped: COD_MISMATCH, STOLEN_CARD, MULTI_ACCOUNT… */
  @Column({ type: 'varchar' })
  category: string;

  @Column({ type: 'text' })
  reason: string;

  @Column({ type: 'simple-json', nullable: true })
  evidenceJson: Record<string, unknown> | null;

  @Column({ type: 'varchar', default: 'OPEN' })
  status: FraudFlagStatus;

  /** 'MANUAL' for a person, or the name of the rule/service that raised it. */
  @Column({ type: 'varchar', default: 'MANUAL' })
  raisedBy: string;

  @Column({ type: 'varchar', nullable: true })
  assignedTo: string | null;

  @Column({ type: 'varchar', nullable: true })
  resolvedBy: string | null;

  @Column({ type: Date, nullable: true })
  resolvedAt: Date | null;

  /** Required on CONFIRMED and DISMISSED: a conclusion with no reasoning cannot be reviewed. */
  @Column({ type: 'text', nullable: true })
  resolutionNote: string | null;

  /** The hold placed because of this flag, if one was. Lifting the flag should surface it. */
  @Column({ type: 'varchar', nullable: true })
  holdId: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
