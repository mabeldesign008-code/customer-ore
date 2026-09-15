import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

/**
 * A published piece of content: a blog post, a help-centre article, or a legal page.
 *
 * WHY THIS TABLE EXISTS
 * Before it, the platform had no written policy anywhere. The AI support agent was told not
 * to invent policy — correctly — so it refused every "what is your refund policy?" question,
 * because there was genuinely nothing to answer from. This is the source of truth it reads.
 *
 * The row holds the CURRENT body. Every change also writes a `content_revision`, so the
 * current text is always reconstructible and "who changed our refund policy, and what did it
 * say before?" is a query rather than an argument.
 *
 * `slug` is unique because it is the URL. Two articles cannot share one, and publishing must
 * fail loudly rather than quietly shadow an existing page.
 */

export type ContentStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
export type ContentKind = 'BLOG' | 'HELP' | 'LEGAL';

@Entity({ schema: 'comms' })
@Index(['slug'], { unique: true })
@Index(['status', 'kind', 'publishedAt'])
@Index(['categoryId'])
export class ContentArticle {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  title: string;

  @Column({ type: 'varchar' })
  slug: string;

  /** Markdown. Rendered by the client; stored as written so a revert restores exactly this. */
  @Column({ type: 'text' })
  bodyMarkdown: string;

  /** Short summary used in listings, search results and the AI's citation snippet. */
  @Column({ type: 'text', nullable: true })
  excerpt: string | null;

  @Column({ type: 'varchar', default: 'BLOG' })
  kind: ContentKind;

  @Column({ type: 'varchar', default: 'DRAFT' })
  status: ContentStatus;

  @Column({ type: 'varchar', nullable: true })
  categoryId: string | null;

  /** Space-separated. Stored denormalised because tag filtering is a listing concern, and a
   *  join table would make the common query slower for no benefit at this scale. */
  @Column({ type: 'text', nullable: true })
  tagsText: string | null;

  /* ── SEO ─────────────────────────────────────────────────────────────── */
  @Column({ type: 'varchar', nullable: true })
  seoTitle: string | null;

  @Column({ type: 'text', nullable: true })
  seoDescription: string | null;

  @Column({ type: 'varchar', nullable: true })
  ogImageUrl: string | null;

  @Column({ type: 'boolean', default: true })
  indexable: boolean;

  /* ── LEGAL pages only ────────────────────────────────────────────────── */
  /**
   * A legal page nobody has signed off is a liability, so an unreviewed one is published
   * with this watermark rendered above the text. Brand can draft; only a dual-controlled
   * `content.legal.manage` clears it.
   */
  @Column({ type: 'boolean', default: false })
  legalReviewed: boolean;

  /* ── provenance ──────────────────────────────────────────────────────── */
  @Column({ type: 'varchar', nullable: true })
  authorId: string | null;

  @Column({ type: 'varchar', nullable: true })
  lastEditedBy: string | null;

  /** Bumped on every edit. The AI's cache keys on it, so a policy change is picked up. */
  @Column({ type: 'int', default: 1 })
  revisionCount: number;

  @Column({ type: Date, nullable: true })
  publishedAt: Date | null;

  @Column({ type: Date, nullable: true })
  archivedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
