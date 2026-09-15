import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { ChargebackStatus, FaultParty } from '@ore/contracts';

/** Doc §Payment — bank/PSP-initiated chargeback: freeze → evidence → won/lost. One per order. */
@Entity({ schema: 'ledger' })
@Index(['status'])
export class Chargeback {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  orderId: string;

  @Column({ unique: true })
  reference: string; // bank/PSP chargeback reference

  @Column({ type: 'int' })
  amountPesewas: number;

  @Column()
  reason: string;

  @Column({ type: 'simple-json', nullable: true })
  evidenceKeys: string[] | null;

  @Column({ type: 'varchar', default: ChargebackStatus.OPEN })
  status: ChargebackStatus;

  @Column({ type: 'varchar', nullable: true })
  fault: FaultParty | null;

  @Column({ type: 'int', default: 0 })
  feesPesewas: number; // PSP/bank chargeback fees — allocated to the at-fault party

  @Column({ type: 'int', default: 0 })
  refundedPesewas: number; // money actually returned to the bank (LOST)

  @Column({ type: 'varchar', nullable: true })
  note: string | null;

  @Column({ type: 'varchar', nullable: true })
  decidedBy: string | null;

  @Column({ type: Date, nullable: true })
  decidedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
