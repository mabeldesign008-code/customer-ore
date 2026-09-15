import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { RiderBlockStatus } from '@ore/contracts';

@Entity({ schema: 'dispatch' })
@Index(['riderId', 'startsAt'])
export class RiderBlock {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  riderId: string;

  @Column({ type: Date })
  startsAt: Date;

  @Column({ type: Date })
  endsAt: Date;

  @Column({ type: 'varchar', default: 'SCHEDULED' })
  status: RiderBlockStatus;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
