import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/**
 * An uploaded image or file available to the editor.
 *
 * The bytes live in object storage; this row is the catalogue. Storing the original filename
 * and content type matters for the alt-text/accessibility story and for refusing to serve
 * something executable that was uploaded with a misleading extension.
 */
@Entity({ schema: 'comms' })
@Index(['uploadedBy', 'createdAt'])
export class ContentMedia {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Public URL the editor embeds. */
  @Column({ type: 'varchar' })
  url: string;

  @Column({ type: 'varchar' })
  originalName: string;

  @Column({ type: 'varchar', nullable: true })
  contentType: string | null;

  @Column({ type: 'int', default: 0 })
  sizeBytes: number;

  @Column({ type: 'int', nullable: true })
  widthPx: number | null;

  @Column({ type: 'int', nullable: true })
  heightPx: number | null;

  @Column({ type: 'varchar', nullable: true })
  altText: string | null;

  @Column({ type: 'varchar', nullable: true })
  uploadedBy: string | null;

  /** Object-storage key, kept so the file can be deleted or migrated later. */
  @Column({ type: 'varchar', nullable: true })
  storageKey: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
