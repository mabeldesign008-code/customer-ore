import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity({ schema: 'catalog' })
export class MenuItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  vendorId: string;

  @Column()
  name: string;

  @Column()
  category: string;

  @Column({ type: 'int' })
  pricePesewas: number;

  @Column({ type: 'int', default: 10 })
  prepTimeMin: number; // = fulfillment time for non-food (doc: generic catalogue)

  @Column({ type: 'varchar', default: 'each' })
  unit: string; // each | kg | pack | box | portion

  @Column({ type: 'int', nullable: true })
  stock: number | null; // null = no inventory tracking (food); used for grocery/shop/market/pharmacy

  @Column({ type: 'boolean', default: false })
  prescriptionOnly: boolean; // pharmacy — requires prescription upload (doc §Pharmacy compliance)

  @Column({ type: 'boolean', default: true })
  available: boolean;

  @Column({ type: 'simple-json', default: () => "'[]'" })
  modifiers: string[];

  /** Structured variant/add-on groups with pesewa price adjustments. */
  @Column({ type: 'simple-json', nullable: true })
  addonGroups: Record<string, unknown>[] | null;

  @Column({ type: 'varchar', nullable: true })
  imageKey: string | null;

  @Column({ type: 'varchar', nullable: true })
  imageContentType: string | null;

  @Column({ type: 'varchar', nullable: true })
  sku: string | null;

  @Column({ type: Date, nullable: true })
  expiryDate: Date | null;

  /** Pharmacy-specific dosage/strength, e.g. 500mg or 10ml. */
  @Column({ type: 'varchar', nullable: true })
  dosage: string | null;

  /** Laundry-specific service turnaround, e.g. 24h Express. */
  @Column({ type: 'varchar', nullable: true })
  turnaround: string | null;

  /** Market-specific flag indicating that the price is refreshed daily. */
  @Column({ type: 'boolean', default: false })
  dailyMarketPrice: boolean;

  /** Laundry-specific garment/service classification. */
  @Column({ type: 'varchar', nullable: true })
  garmentType: string | null;

  /** Laundry intake/inspection metadata; state is retained with the item. */
  @Column({ type: 'simple-json', nullable: true })
  conditionJson: Record<string, unknown> | null;

  /** Food dietary tags and other vertical-specific searchable labels. */
  @Column({ type: 'simple-json', default: () => "'[]'" })
  dietaryTags: string[];

  @Column({ type: 'varchar', nullable: true })
  description: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
