import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/** Dispatch audit log — doc §15: every pool, wave, score, accept, decline, timeout,
 *  radius expansion, assignment lock, and admin override is recorded. */
@Entity({ schema: 'dispatch' })
@Index(['orderId'])
export class DispatchAudit {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  orderId: string;

  @Column({ type: 'varchar', nullable: true })
  riderId: string | null;

  @Column()
  eventType: string; // pool_created | offer_created | accepted | declined | timed_out |
                     // radius_expanded | assigned | superseded | admin_override | released

  @Column({ type: 'simple-json', nullable: true })
  detailJson: Record<string, unknown> | null;

  @CreateDateColumn()
  createdAt: Date;
}
