import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/**
 * Every AI tool call. This is how an admin sees why the assistant said what it said,
 * and how a bad answer is traced back to a bad lookup. Append-only.
 */
@Entity({ schema: 'comms' })
@Index(['threadId', 'createdAt'])
export class SupportToolAudit {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  threadId: string;

  @Column()
  tool: string;

  @Column({ type: 'text', nullable: true })
  argsJson: string | null;

  @Column({ type: 'varchar', nullable: true })
  outcome: string | null;

  @Column({ type: 'varchar', nullable: true })
  model: string | null;

  @Column({ type: 'int', default: 0 })
  promptTokens: number;

  @Column({ type: 'int', default: 0 })
  completionTokens: number;

  @CreateDateColumn()
  createdAt: Date;
}
