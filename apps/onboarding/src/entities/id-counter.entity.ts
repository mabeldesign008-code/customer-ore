import { Entity } from 'typeorm';
import { SequenceCounter } from '@ore/db';

/** Per (prefix, year) counter for vendor ORV IDs. Rider YDR IDs are owned by dispatch. Key: `ORV-2026`. */
@Entity({ schema: 'onboarding' })
export class IdCounter extends SequenceCounter {}
