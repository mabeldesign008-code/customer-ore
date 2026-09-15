import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { HolidayHours, WeeklyHours } from './vendor.entity';

/** A Vendor's additional operating location. The primary Vendor row remains the default location. */
@Entity({ schema: 'catalog' })
@Index(['vendorId', 'active'])
export class VendorLocation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  vendorId: string;

  @Column()
  name: string;

  @Column({ type: 'text' })
  address: string;

  @Column({ type: 'float' })
  lat: number;

  @Column({ type: 'float' })
  lng: number;

  @Column({ type: 'float', default: 8 })
  deliveryRadiusKm: number;

  @Column({ type: 'boolean', default: true })
  accepting: boolean;

  @Column({ type: 'simple-json', nullable: true })
  hoursJson: WeeklyHours | null;

  @Column({ type: 'simple-json', nullable: true })
  holidayHoursJson: HolidayHours | null;

  @Column({ type: 'boolean', default: true })
  active: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
