import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

/** Fleet partner legal profile. Fleet-linked riders inherit settlement/tax treatment from here. */
@Entity({ schema: 'dispatch' })
@Index(['name'])
export class FleetPartner {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'varchar', default: 'FLEET_DELIVERY_PARTNER' })
  contractType: string;

  @Column({ type: 'varchar', default: 'UNKNOWN' })
  residentStatus: string;

  @Column({ type: 'varchar', default: 'PAYSTACK_TRANSFER' })
  settlementMethod: string;

  @Column({ type: 'varchar', default: 'ACTIVE' })
  status: string;

  @Column({ type: 'simple-json', nullable: true })
  taxProfileJson: Record<string, unknown> | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
