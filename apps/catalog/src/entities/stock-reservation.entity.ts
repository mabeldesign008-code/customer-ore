import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export type StockReservationStatus = 'RESERVED' | 'CONSUMED' | 'RELEASED';

/** Idempotent inventory reservation used by confirmed Vendor orders. */
@Entity({ schema: 'catalog' })
@Index(['orderId', 'status'])
@Index(['itemId', 'status'])
export class StockReservation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  orderId: string;

  @Column()
  itemId: string;

  @Column({ type: 'int' })
  qty: number;

  @Column({ type: 'varchar', default: 'RESERVED' })
  status: StockReservationStatus;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
