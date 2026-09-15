import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { CodCashStatus } from '@ore/contracts';

/** COD cash trail — rider collected cash that belongs to the platform pool (G38). */
@Entity({ schema: 'ledger' })
@Index(['riderId', 'status'])
export class CodCash {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  orderId: string;

  @Column()
  riderId: string;

  @Column({ type: 'int' })
  amountPesewas: number;

  @Column({ type: 'varchar', default: CodCashStatus.EXPECTED })
  status: CodCashStatus;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
