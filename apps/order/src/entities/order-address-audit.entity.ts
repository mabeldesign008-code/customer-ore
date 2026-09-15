import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { DeliveryAddressDto } from '@ore/contracts';

/** Append-only location history for support visibility, corrections and receiver confirmations. */
@Entity({ schema: 'order' })
@Index(['orderId', 'createdAt'])
@Index(['orderId', 'action'])
export class OrderAddressAudit {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  orderId: string;

  @Column({ type: 'varchar' })
  action: 'SNAPSHOT' | 'RECIPIENT_CONFIRMED' | 'SUPPORT_CORRECTION' | 'SYSTEM_NORMALIZATION';

  @Column({ type: 'varchar', nullable: true })
  actorId: string | null;

  @Column({ type: 'varchar', nullable: true })
  actorRole: string | null;

  @Column({ type: 'varchar', nullable: true })
  source: string | null;

  @Column({ type: 'simple-json', nullable: true })
  beforeJson: DeliveryAddressDto | null;

  @Column({ type: 'simple-json' })
  afterJson: DeliveryAddressDto;

  @Column({ type: 'text', nullable: true })
  reason: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
