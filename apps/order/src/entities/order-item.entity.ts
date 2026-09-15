import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ schema: 'order' })
export class OrderItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  orderId: string;

  @Column()
  itemId: string;

  @Column()
  name: string;

  @Column({ type: 'int' })
  qty: number;

  @Column({ type: 'varchar', nullable: true })
  unit: string | null;

  @Column({ type: 'int' })
  unitPricePesewas: number;

  @Column({ type: 'int' })
  prepTimeMin: number;

  @Column({ type: 'simple-json', default: () => "'[]'" })
  modifiers: string[];

  @Column({ type: 'simple-json', default: () => "'[]'" })
  selectedOptions: Record<string, unknown>[];

  @Column({ type: 'int', default: 0 })
  optionsTotalPesewas: number;

  @Column({ type: 'boolean', default: false })
  prescriptionOnly: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
