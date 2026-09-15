import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export type AssignmentStatus = 'ACTIVE' | 'COMPLETED' | 'RELEASED';

@Entity({ schema: 'dispatch' })
@Index('assignment_active_order', ['orderId'], { unique: true, where: `"status" = 'ACTIVE'` })
export class Assignment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  orderId: string;

  @Column()
  riderId: string;

  @Column({ type: 'varchar', nullable: true })
  offerId: string | null;

  @Column({ type: 'varchar', nullable: true })
  batchId: string | null;

  @Column({ type: 'float', default: 0 })
  pickupDistanceKm: number;

  @Column({ type: 'float', default: 0 })
  score: number;

  @Column({ type: 'varchar', default: 'competitive_wave' })
  source: string;

  /**
   * What this rider earns for THIS leg, fixed at the moment the offer was accepted.
   *
   * Rider pay is per-assignment, not per-order: a laundry order has a collection leg and a
   * return leg worked by two different riders, and a reassignment after pickup leaves two
   * riders each owed for the distance they actually covered. The order-level
   * `riderFeePesewas` is the SUM across legs (what the order costs Ore); this is the split
   * (what each rider is owed). Booking earnings from the order-level field alone paid only
   * whoever happened to be assigned at delivery.
   */
  @Column({ type: 'int', default: 0 })
  riderFeePesewas: number;

  @Column({ type: 'int', default: 0 })
  peakPayPesewas: number;

  /** Set when the ledger has credited this leg, so a redelivery cannot pay it twice. */
  @Column({ type: Date, nullable: true })
  earningsPostedAt: Date | null;

  @Column({ type: 'simple-json', nullable: true })
  validationJson: Record<string, unknown> | null;

  @Column({ type: 'varchar', default: 'ACTIVE' })
  status: AssignmentStatus;

  @CreateDateColumn()
  assignedAt: Date;

  /**
   * When the rider confirmed pickup, inside the vendor's geofence.
   *
   * Recorded so delivery time can be decomposed into legs rather than measured only end to end.
   * A single "45 minutes" figure cannot say whether the kitchen was slow, the rider was far, or
   * the rider stood at the counter waiting — and those three have completely different fixes.
   * Every ETA model worth the name (Swiggy's four-leg decomposition, Deliveroo's Frank) is built
   * on per-leg history, and none of it existed here.
   */
  @Column({ type: Date, nullable: true })
  pickedUpAt: Date | null;

  @Column({ type: Date, nullable: true })
  completedAt: Date | null;
}
