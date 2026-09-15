import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn, VersionColumn } from 'typeorm';

/** Doc §Payment — customer wallet credit (ledger-based; instant, no PSP round trip).
 *  Refund priority: wallet credit first. */
@Entity({ schema: 'ledger' })
export class CustomerCredit {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  userId: string;

  @Column({ type: 'int', default: 0 })
  creditPesewas: number;

  @Column({ type: 'int', default: 0 })
  lifetimeCreditedPesewas: number;

  @Column({ type: 'int', default: 0 })
  lifetimeUsedPesewas: number;

  @VersionColumn()
  version: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
