import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ schema: 'notification' })
@Index(['userId', 'createdAt'])
export class NotificationFeed {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column()
  type: string;

  @Column()
  title: string;

  @Column()
  body: string;

  @Column({ type: 'simple-json', nullable: true })
  dataJson: Record<string, unknown> | null;

  @Column({ type: 'boolean', default: false })
  read: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
