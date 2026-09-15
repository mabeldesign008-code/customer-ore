import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { CommsThread } from './thread.entity';

@Entity({ schema: 'comms' })
@Index(['threadId', 'createdAt'])
export class CommsMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  threadId: string;

  @ManyToOne(() => CommsThread, (thread) => thread.messages, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'threadId' })
  thread: CommsThread;

  @Column()
  senderUserId: string;

  @Column({ type: 'varchar' })
  senderRole: string;

  @Column({ type: 'text' })
  body: string;

  /**
   * 'customer' — visible to the customer.
   * 'internal' — staff only. Swarming needs this: a finance admin joining the chat must
   * be able to say "third refund from this rider this week" without the customer seeing it.
   */
  @Column({ type: 'varchar', default: 'customer' })
  visibility: string;

  @Column({ type: 'simple-json', nullable: true })
  attachments: { url: string; type: string; name: string }[] | null;

  @CreateDateColumn()
  createdAt: Date;
}
