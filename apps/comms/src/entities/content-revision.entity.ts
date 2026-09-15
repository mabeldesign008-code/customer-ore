import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/**
 * Every version of an article's body. APPEND-ONLY — there is no update path and no delete
 * path anywhere in the codebase for this table.
 *
 * A revert does not delete the bad version; it writes the old body back as a NEW revision.
 * That matters because the interesting question is rarely "what does it say now?" and almost
 * always "what did our refund policy say on the 4th, when that customer was told no?" — and
 * a revert that erased history would make that unanswerable.
 */
@Entity({ schema: 'comms' })
@Index(['articleId', 'revision'])
@Index(['articleId', 'createdAt'])
export class ContentRevision {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  articleId: string;

  /** 1, 2, 3… per article. Unique per article, so two concurrent edits cannot both claim 4. */
  @Column({ type: 'int' })
  revision: number;

  @Column({ type: 'text' })
  bodyMarkdown: string;

  @Column({ type: 'varchar', nullable: true })
  title: string | null;

  @Column({ type: 'varchar', nullable: true })
  excerpt: string | null;

  /** Why. Optional for a typo, but a policy change without a note is a policy change with
   *  no record of who decided it. */
  @Column({ type: 'varchar', nullable: true })
  changeNote: string | null;

  @Column({ type: 'varchar', nullable: true })
  editedBy: string | null;

  /** Set when this revision was created by reverting to an earlier one. */
  @Column({ type: 'int', nullable: true })
  revertedFrom: number | null;

  @CreateDateColumn()
  createdAt: Date;
}
