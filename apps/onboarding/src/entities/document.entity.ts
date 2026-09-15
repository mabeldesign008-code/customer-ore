import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ schema: 'onboarding' })
@Index(['applicationId'])
export class Document {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  applicationId: string;

  @Column()
  kind: string; // national_id | selfie | business_registration | pharmacy_license | food_hygiene_permit | drivers_license | vehicle_registration ...

  @Column()
  fileName: string;

  @Column()
  contentType: string;

  @Column({ type: 'varchar', nullable: true })
  storageKey: string | null; // set after upload

  @CreateDateColumn()
  createdAt: Date;
}
