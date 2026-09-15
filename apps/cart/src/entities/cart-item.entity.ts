import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity({ schema: 'cart' })
export class CartItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  cartId: string;

  @Column()
  vendorId: string;

  @Column()
  itemId: string;

  @Column()
  itemName: string;

  @Column({ type: 'int' })
  qty: number;

  @Column({ type: 'int' })
  unitPricePesewas: number;

  @Column({ type: 'simple-json', default: () => "'[]'" })
  modifiers: string[];

  @Column({ type: 'simple-json', default: () => "'[]'" })
  selectedOptions: Record<string, unknown>[];

  @Column({ type: 'int', default: 0 })
  optionsTotalPesewas: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
