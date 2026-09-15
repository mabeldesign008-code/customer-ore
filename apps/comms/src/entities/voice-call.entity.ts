import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/**
 * Call-detail record for every in-app voice attempt (audit trail + admin visibility).
 *
 * One row per call ATTEMPT, created before Twilio is involved, so a call that never
 * connects still shows up — "rider tapped call four times and it never rang" is a
 * support question that needs evidence. Twilio status callbacks and client-reported
 * fallback events both update this row; the client events matter because the tel:
 * fallback handoff happens entirely on the device and Twilio never sees it.
 */
@Entity({ schema: 'comms' })
@Index(['callerUserId', 'startedAt'])
@Index(['status'])
export class VoiceCall {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Server-generated opaque id (`vc_…`) shared with the client and the TwiML flow. */
  @Column({ unique: true })
  callId: string;

  /** 'order' — party-to-party on an order; 'support' — user to support agents. */
  @Column({ type: 'varchar' })
  kind: string;

  @Column({ type: 'varchar', nullable: true })
  orderId: string | null;

  @Column()
  callerUserId: string;

  @Column({ type: 'varchar' })
  callerRole: string;

  /** Order calls: the callee's user id. Support calls: null (agent pool). */
  @Column({ type: 'varchar', nullable: true })
  targetUserId: string | null;

  /** 'customer' | 'rider' | 'vendor' for order calls. */
  @Column({ type: 'varchar', nullable: true })
  target: string | null;

  /** 'twilio' when a real call was attempted, 'log' in the unprovisioned mode. */
  @Column({ type: 'varchar' })
  provider: string;

  /** 'android' | 'ios' | 'web' — which push credential the token carried. */
  @Column({ type: 'varchar', nullable: true })
  platform: string | null;

  /** initiated | ringing | answered | completed | no-answer | busy | failed | canceled */
  @Column({ type: 'varchar', default: 'initiated' })
  status: string;

  /** True once the caller was offered/took the native-dialer (cellular) fallback. */
  @Column({ type: 'boolean', default: false })
  fallbackUsed: boolean;

  /** Client-reported events: fallback_offered / fallback_started / voip_failed / quality_poor. */
  @Column({ type: 'simple-json', nullable: true })
  fallbackEvents: { kind: string; detail?: string; at: string }[] | null;

  @Column({ type: 'varchar', nullable: true })
  twilioCallSid: string | null;

  @Column({ type: 'text', nullable: true })
  recordingUrl: string | null;

  /** Support calls only: what the user said the call was about. */
  @Column({ type: 'varchar', nullable: true })
  topic: string | null;

  @Column({ type: 'varchar', nullable: true })
  lastError: string | null;

  @CreateDateColumn()
  startedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  answeredAt: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  endedAt: Date | null;

  @Column({ type: 'int', nullable: true })
  durationSec: number | null;
}
