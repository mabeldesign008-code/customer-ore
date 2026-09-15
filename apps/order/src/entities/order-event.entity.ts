import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/** Immutable audit log of every transition — G34. Powers tracking feed + dispute evidence. */
@Entity({ schema: 'order' })
@Index(['orderId'])
export class OrderEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  orderId: string;

  @Column({ type: 'varchar', nullable: true })
  from: string | null;

  @Column()
  to: string;

  @Column({ type: 'varchar', default: 'system' })
  actor: string;

  @Column({ type: 'simple-json', nullable: true })
  payloadJson: Record<string, unknown> | null;

  @CreateDateColumn()
  createdAt: Date;
}
