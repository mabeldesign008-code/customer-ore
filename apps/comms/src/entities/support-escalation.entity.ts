import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/** Append-only record of every escalation. Never updated, never deleted. */
@Entity({ schema: 'comms' })
@Index(['threadId', 'createdAt'])
export class SupportEscalation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  threadId: string;

  @Column()
  reason: string;

  @Column({ type: 'text', nullable: true })
  summary: string | null;

  @Column({ default: 'general' })
  team: string;

  /** 'AI' when the assistant escalated itself, otherwise the admin user id. */
  @Column()
  actor: string;

  @Column({ type: 'varchar', nullable: true })
  fromStatus: string | null;

  @Column()
  toStatus: string;

  @CreateDateColumn()
  createdAt: Date;
}
