import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/** Declined/timed-out riders never see the same order again (doc §7). */
@Entity({ schema: 'dispatch' })
@Index(['orderId', 'riderId'], { unique: true })
export class OfferExclusion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  orderId: string;

  @Column()
  riderId: string;

  @Column()
  reason: string; // declined | timed_out | admin

  @CreateDateColumn()
  createdAt: Date;
}
