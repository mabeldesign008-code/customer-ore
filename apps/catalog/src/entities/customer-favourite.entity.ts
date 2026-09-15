import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ schema: 'catalog' })
@Index(['customerId', 'vendorId'], { unique: true })
export class CustomerFavourite {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  customerId: string;

  @Column()
  vendorId: string;

  @CreateDateColumn()
  createdAt: Date;
}
