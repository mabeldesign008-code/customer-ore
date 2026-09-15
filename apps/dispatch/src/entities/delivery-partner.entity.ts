import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { TaxPartyType } from '@ore/contracts';

export type DeliveryPartnerProfileType = 'INDEPENDENT_DELIVERY_PARTNER' | 'FLEET_DELIVERY_PARTNER';

/** Legal/settlement profile used for tax/WHT classification; rider status is not employment status. */
@Entity({ schema: 'dispatch' })
@Index(['userId'])
@Index(['fleetPartnerId'])
export class DeliveryPartnerProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  type: DeliveryPartnerProfileType;

  @Column({ type: 'varchar', nullable: true })
  userId: string | null;

  @Column({ type: 'varchar', nullable: true })
  fleetPartnerId: string | null;

  @Column({ type: 'varchar', nullable: true })
  vehicle: string | null;

  @Column({ type: 'varchar', nullable: true })
  zoneId: string | null;

  @Column({ type: 'varchar', default: 'PAYSTACK_TRANSFER' })
  settlementMethod: string;

  @Column({ type: 'varchar', default: 'INDEPENDENT_DELIVERY_PARTNER' })
  contractType: string;

  @Column({ type: 'varchar', default: 'UNKNOWN' })
  residentStatus: string;

  @Column({ type: 'varchar', default: 'ACTIVE' })
  status: string;

  @Column({ type: 'simple-json', nullable: true })
  taxProfileJson: { supplierType?: TaxPartyType; notes?: string } | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
