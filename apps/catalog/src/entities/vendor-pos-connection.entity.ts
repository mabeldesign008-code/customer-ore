import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

/** Generic POS/webhook bridge connection; external adapters can build on this contract. */
@Entity({ schema: 'catalog' })
export class VendorPosConnection {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  vendorId: string;

  @Column({ type: 'varchar' })
  provider: string;

  @Column({ type: 'varchar', nullable: true })
  externalStoreId: string | null;

  @Column({ type: 'varchar' })
  tokenHash: string;

  @Column({ type: 'boolean', default: true })
  active: boolean;

  @Column({ type: Date, nullable: true })
  lastReceivedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
