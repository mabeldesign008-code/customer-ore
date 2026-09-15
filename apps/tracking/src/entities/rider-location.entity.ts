import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ schema: 'tracking' })
@Index(['riderId', 'createdAt'])
export class RiderLocation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  riderId: string;

  @Column({ type: 'varchar', nullable: true })
  orderId: string | null;

  @Column({ type: 'float' })
  lat: number;

  @Column({ type: 'float' })
  lng: number;

  @Column({ type: 'float', nullable: true })
  speedKmh: number | null;

  @CreateDateColumn()
  createdAt: Date;
}
