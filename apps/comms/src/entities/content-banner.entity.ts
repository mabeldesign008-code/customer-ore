import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

/**
 * An in-app banner with an audience and a date window.
 *
 * The window is evaluated at read time, not by a scheduled job flipping a status. That
 * choice is deliberate: a job that has to run for the banner to expire is a banner that
 * stays up when the job fails, and a "service down, we are aware" notice still showing a
 * week later is worse than no notice at all.
 *
 * `audience` is a coarse segment, not a query language. Marketing needs "all riders" and
 * "customers in Cape Coast", not a predicate builder, and a coarse enum cannot be written
 * wrong in a way that leaks one customer's banner to another.
 */
@Entity({ schema: 'comms' })
@Index(['status', 'startsAt', 'endsAt'])
export class ContentBanner {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  title: string;

  @Column({ type: 'text', nullable: true })
  body: string | null;

  /** INFO | WARNING | CRITICAL — drives the colour and whether it can be dismissed. */
  @Column({ type: 'varchar', default: 'INFO' })
  severity: 'INFO' | 'WARNING' | 'CRITICAL';

  /** Who sees it. `ALL` is the only value that reaches every role. */
  @Column({ type: 'varchar', default: 'ALL' })
  audience: 'ALL' | 'CUSTOMERS' | 'RIDERS' | 'VENDORS';

  /** Optional city filter, matched case-insensitively. Null means everywhere. */
  @Column({ type: 'varchar', nullable: true })
  city: string | null;

  @Column({ type: 'varchar', nullable: true })
  linkUrl: string | null;

  @Column({ type: 'varchar', default: 'SCHEDULED' })
  status: 'SCHEDULED' | 'ACTIVE' | 'PAUSED' | 'ENDED';

  @Column({ type: 'boolean', default: true })
  dismissible: boolean;

  @Column({ type: Date })
  startsAt: Date;

  @Column({ type: Date, nullable: true })
  endsAt: Date | null;

  @Column({ type: 'varchar', nullable: true })
  createdBy: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
