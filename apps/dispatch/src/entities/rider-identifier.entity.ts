import { Column, CreateDateColumn, Entity, Index, PrimaryColumn, PrimaryGeneratedColumn } from 'typeorm';

/**
 * Database-owned counter for public Rider identifiers.
 *
 * The primary key is exactly the spec scope: one atomic sequence per
 * `(city_code, approval_year)`. Application code must increment this table with a
 * single UPSERT/RETURNING statement; it must never use COUNT()+1.
 */
@Entity({ schema: 'dispatch', name: 'rider_identifier_sequence' })
export class RiderIdentifierSequence {
  @PrimaryColumn({ type: 'varchar' })
  cityCode: string;

  @PrimaryColumn({ type: 'int' })
  approvalYear: number;

  @Column({ type: 'int', default: 0 })
  seq: number;
}

/** Immutable audit trail for Rider ID creation, correction and historical lookup. */
@Entity({ schema: 'dispatch', name: 'rider_identifier_audit' })
@Index(['riderId'])
@Index(['identifier'])
@Index(['previousIdentifier'])
export class RiderIdentifierAudit {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Internal dispatch Rider UUID. Never the public Rider ID. */
  @Column({ type: 'varchar' })
  riderId: string;

  @Column({ type: 'varchar' })
  eventType: 'CREATED' | 'CORRECTED' | 'LEGACY_PUBLIC_ID_RETIRED';

  /** New/current public Rider ID for this event. */
  @Column({ type: 'varchar' })
  identifier: string;

  /** Original/previous public Rider ID when an audited correction occurs. */
  @Column({ type: 'varchar', nullable: true })
  previousIdentifier: string | null;

  @Column({ type: 'varchar', nullable: true })
  cityId: string | null;

  @Column({ type: 'varchar', nullable: true })
  cityCode: string | null;

  @Column({ type: 'int', nullable: true })
  approvalYear: number | null;

  @Column({ type: 'int', nullable: true })
  sequenceNumber: number | null;

  @Column({ type: 'varchar', nullable: true })
  previousCityId: string | null;

  @Column({ type: 'varchar', nullable: true })
  previousCityCode: string | null;

  @Column({ type: 'int', nullable: true })
  previousApprovalYear: number | null;

  @Column({ type: 'int', nullable: true })
  previousSequenceNumber: number | null;

  @Column({ type: 'text' })
  reason: string;

  @Column({ type: 'varchar' })
  actorId: string;

  @Column({ type: 'varchar', nullable: true })
  actorRole: string | null;

  /** Ticket/checker reference authorising a correction or source approval. */
  @Column({ type: 'varchar', nullable: true })
  approvalReference: string | null;

  @Column({ type: 'simple-json', nullable: true })
  metadataJson: Record<string, unknown> | null;

  @CreateDateColumn()
  createdAt: Date;
}
