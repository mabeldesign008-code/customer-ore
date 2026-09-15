import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { StoryKind } from '@ore/contracts';

/** WhatsApp-status style vendor story (doc §4 — Premium only). */
@Entity({ schema: 'catalog' })
@Index(['vendorId', 'active'])
export class VendorStory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  vendorId: string;

  @Column({ type: 'varchar' })
  kind: StoryKind;

  @Column()
  mediaKey: string;

  @Column({ type: 'varchar', nullable: true })
  muxPlaybackId: string | null; // VIDEO — Mux (mock: passthrough; live uses Mux upload)

  @Column({ type: 'varchar', nullable: true })
  caption: string | null;

  @Column({ type: 'boolean', default: true })
  active: boolean;

  @Column({ type: Date })
  expiresAt: Date; // TTL (default 24h)

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
