import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

/** Vendor/customer order issue report; resolution remains an operations workflow. */
@Entity({ schema: 'order' })
@Index(['orderId', 'createdAt'])
export class OrderIssue {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  orderId: string;

  @Column()
  vendorId: string;

  @Column()
  reporterUserId: string;

  @Column({ type: 'varchar' })
  category: string;

  @Column({ type: 'text', nullable: true })
  note: string | null;

  @Column({ type: 'varchar', default: 'OPEN' })
  status: string;

  @Column({ type: 'text', nullable: true })
  resolutionNote: string | null;

  @Column({ type: 'varchar', nullable: true })
  resolvedBy: string | null;

  @Column({ type: Date, nullable: true })
  resolvedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
