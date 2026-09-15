import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { OfferStatus } from '@ore/contracts';

@Entity({ schema: 'dispatch' })
@Index(['orderId', 'status'])
export class Offer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  orderId: string;

  @Column({ type: 'varchar', nullable: true })
  batchId: string | null; // grouped/batched offer (doc §2)

  @Column()
  riderId: string;

  @Column()
  vendorId: string;

  @Column({ type: 'varchar', default: OfferStatus.PENDING })
  status: OfferStatus;

  @Column({ type: Date })
  expiresAt: Date;

  @Column({ type: 'int', default: 0 })
  attempt: number;

  @Column({ type: 'int', default: 0 })
  riderFeePesewas: number;

  /** Peak/surge incentive for this leg, fixed at offer time alongside the base fee. */
  @Column({ type: 'int', default: 0 })
  peakPayPesewas: number;

  @Column({ type: 'float', default: 0 })
  pickupDistanceKm: number;

  @Column({ type: 'float', default: 0 })
  deliveryDistanceKm: number;

  @Column({ type: 'float', default: 0 })
  score: number;

  @Column({ type: 'simple-json', nullable: true })
  validationJson: Record<string, unknown> | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
