import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/**
 * Who is in a support conversation.
 *
 * Ownership is deliberately NOT modelled here — it lives on the thread as
 * `ownerAdminUserId` and must not change when someone joins. Swarming fails when
 * "everyone piles on, nobody owns", so joining grants participation only.
 */
@Entity({ schema: 'comms' })
@Index(['threadId', 'userId'], { unique: true })
@Index(['userId', 'leftAt'])
export class SupportParticipant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  threadId: string;

  @Column()
  userId: string;

  /** AdminRole of the participant, for display and routing. */
  @Column({ type: 'varchar', nullable: true })
  adminRole: string | null;

  @Column({ type: 'varchar', nullable: true })
  invitedBy: string | null;

  @CreateDateColumn()
  joinedAt: Date;

  @Column({ type: Date, nullable: true })
  leftAt: Date | null;
}
