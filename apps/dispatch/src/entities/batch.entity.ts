import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { BatchStatus, BatchType, BatchRouteStop } from '@ore/contracts';

/** Doc §2 — a grouped/batched delivery: one rider, N pickups, M drops.
 *  Orders keep their own assignments + fees (per-order fees unchanged); the batch
 *  coordinates the shared route. */
@Entity({ schema: 'dispatch' })
@Index(['riderId', 'status'])
export class Batch {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  type: BatchType;

  @Column({ type: 'varchar', nullable: true })
  riderId: string | null; // null while offers are out

  @Column({ type: 'varchar', default: BatchStatus.PENDING })
  status: BatchStatus;

  @Column({ type: 'simple-json' })
  orderIds: string[];

  @Column({ type: 'simple-json' })
  pickupOrder: BatchRouteStop[];

  @Column({ type: 'simple-json' })
  dropOrder: BatchRouteStop[];

  @Column({ type: 'int', default: 0 })
  totalRiderFeePesewas: number; // Σ per-order distance fees (doc §2: per-order fees unchanged)

  @Column({ type: 'int', default: 0 })
  codExposurePesewas: number; // Σ COD totals — rider eligibility checked against the sum

  /**
   * Per-order fee split for this batch, keyed by order id.
   *
   * The offer carries the batch total, but each order's assignment must record what THAT order
   * is worth — the ledger pays per leg, per order. Without this, every assignment in a batch of
   * three would claim the whole batch fee.
   */
  @Column({ type: 'simple-json', nullable: true })
  feeByOrderJson: Record<string, { fee: number; peak: number }> | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
