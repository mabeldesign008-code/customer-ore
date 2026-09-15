import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { ResidentStatus, VendorPlan, VendorType } from '@ore/contracts';

export interface WeeklyHours {
  [day: string]: { open: string; close: string }[]; // day: mon..sun, "HH:MM" local
}

export interface HolidayHours {
  [date: string]: { closed: boolean; open?: string; close?: string }; // YYYY-MM-DD in UTC/Ghana time
}

@Entity({ schema: 'catalog' })
export class Vendor {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  ownerUserId: string;

  @Column({ type: 'varchar', default: VendorType.FOOD })
  vendorType: VendorType;

  @Column({ type: 'boolean', default: false })
  approved: boolean; // doc: no orders before admin approval

  @Column({ type: 'varchar', nullable: true })
  publicId: string | null; // ORV-YYYY-NNNN (assigned at approval)

  @Column({ type: 'varchar', nullable: true })
  logoKey: string | null;

  @Column({ type: 'varchar', nullable: true })
  bannerKey: string | null;

  @Column()
  name: string;

  @Column({ type: 'float' })
  lat: number;

  @Column({ type: 'float' })
  lng: number;

  @Column({ type: 'float', default: 8 })
  deliveryRadiusKm: number;

  @Column({ type: 'boolean', default: true })
  acceptsCod: boolean;

  @Column({ type: 'boolean', default: true })
  accepting: boolean;

  @Column({ type: 'int', default: 5 })
  maxConcurrentOrders: number;

  @Column({ type: 'int', default: 10 })
  defaultPrepTimeMin: number;

  @Column({ type: 'simple-json', nullable: true })
  hoursJson: WeeklyHours | null;

  @Column({ type: 'simple-json', nullable: true })
  holidayHoursJson: HolidayHours | null;

  @Column({ type: 'simple-json', nullable: true })
  payoutAccountJson: Record<string, unknown> | null;

  /** Supplier tax profile used for WHT decisions on Ore-paid vendor incentives; unknown requires Finance/Tax review. */
  @Column({ type: 'varchar', default: 'UNKNOWN' })
  taxResidentStatus: ResidentStatus;

  @Column({ type: 'varchar', nullable: true })
  taxIdentificationNumber: string | null;

  @Column({ type: 'simple-json', nullable: true })
  taxProfileJson: Record<string, unknown> | null;

  // ── doc §4 plans / SLA ───────────────────────────────────────────
  @Column({ type: 'varchar', default: VendorPlan.STANDARD })
  plan: VendorPlan; // Premium = stories + reduced commission (doc §4)

  @Column({ type: Date, nullable: true })
  suspendUntil: Date | null; // SLA penalty suspension window

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
