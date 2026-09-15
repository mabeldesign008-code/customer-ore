import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { DeliveryAddressDto } from '@ore/contracts';

@Entity({ schema: 'auth' })
@Index(['customerId', 'active'])
export class CustomerSavedAddress {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  customerId: string;

  @Column({ type: 'varchar' })
  label: string;

  @Column({ type: 'simple-json' })
  addressJson: DeliveryAddressDto;

  @Column({ type: 'boolean', default: false })
  isDefault: boolean;

  @Column({ type: 'boolean', default: true })
  active: boolean;

  @Column({ type: 'varchar', nullable: true })
  createdBy: string | null;

  @Column({ type: 'varchar', nullable: true })
  updatedBy: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity({ schema: 'auth' })
@Index(['customerId', 'createdAt'])
@Index(['addressId', 'createdAt'])
export class CustomerAddressAudit {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  customerId: string;

  @Column({ type: 'varchar', nullable: true })
  addressId: string | null;

  @Column({ type: 'varchar' })
  action: 'CREATED' | 'UPDATED' | 'DEACTIVATED' | 'SUPPORT_CORRECTION' | 'DEFAULT_CHANGED';

  @Column({ type: 'varchar' })
  actorId: string;

  @Column({ type: 'varchar' })
  actorRole: string;

  @Column({ type: 'simple-json', nullable: true })
  beforeJson: DeliveryAddressDto | null;

  @Column({ type: 'simple-json', nullable: true })
  afterJson: DeliveryAddressDto | null;

  @Column({ type: 'text', nullable: true })
  reason: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
