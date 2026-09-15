import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

/**
 * A content category — blog, help, legal, or a grouping inside them.
 *
 * `slug` is what appears in a URL, so it is unique and stable: renaming a category must not
 * silently move every article under it to a new address that nobody has linked to yet.
 */
@Entity({ schema: 'comms' })
@Index(['slug'], { unique: true })
export class ContentCategory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'varchar' })
  slug: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  /** BLOG | HELP | LEGAL. Decides the default audience and whether the AI may cite it. */
  @Column({ type: 'varchar', default: 'BLOG' })
  kind: 'BLOG' | 'HELP' | 'LEGAL';

  @Column({ type: 'int', default: 0 })
  sortOrder: number;

  @Column({ type: 'varchar', nullable: true })
  createdBy: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
