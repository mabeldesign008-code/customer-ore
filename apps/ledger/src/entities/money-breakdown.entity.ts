import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

/** Per-order money breakdown — the G10 split, recorded at checkout, settled later. */
@Entity({ schema: 'ledger' })
export class MoneyBreakdown {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  orderId: string;

  @Column({ type: 'int' })
  subtotalPesewas: number;

  @Column({ type: 'int' })
  deliveryFeePesewas: number;

  @Column({ type: 'int' })
  serviceFeePesewas: number;

  @Column({ type: 'int' })
  platformFeePesewas: number;

  @Column({ type: 'int' })
  vendorSharePesewas: number;

  @Column({ type: 'int' })
  riderFeePesewas: number;

  @Column({ type: 'int', default: 0 })
  pspFeePesewas: number;

  @Column({ type: 'int' })
  totalPesewas: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
