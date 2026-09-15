import { BeforeInsert, Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { v7 as uuidv7 } from 'uuid';

@Entity({ schema: 'auth' })
export class OtpCode {
  /**
   * UUIDv7 (time-ordered) rather than TypeORM's default UUIDv4.
   *
   * Callers pick the newest OTP with `ORDER BY createdAt DESC, id DESC`.
   * TypeORM stores @CreateDateColumn as `datetime` with no precision, which on
   * SQLite truncates to whole seconds, so two OTPs requested in the same second
   * get an identical createdAt and the query falls through to the `id` tiebreaker.
   * With a random UUIDv4 that tiebreaker is a coin flip, so verifyOtp could load
   * the older OTP and reject the code the user was just sent. UUIDv7 sorts by
   * creation time, making the tiebreaker monotonic.
   */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @BeforeInsert()
  assignTimeOrderedId(): void {
    if (!this.id) this.id = uuidv7();
  }

  @Column()
  phone: string;

  /** SHA-256 of the 6-digit code (never store plaintext). */
  @Column()
  codeHash: string;

  @Column()
  expiresAt: Date;

  @Column({ type: 'int', default: 0 })
  attempts: number;

  @Column({ type: 'boolean', default: false })
  consumed: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
