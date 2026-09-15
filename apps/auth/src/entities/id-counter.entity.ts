import { Entity } from 'typeorm';
import { SequenceCounter } from '@ore/db';

/** Per (prefix, year) counter for customer IDs (ORC-YYYY-NNNNNN, doc §IDs). Key: `ORC-2026`. */
@Entity({ schema: 'auth' })
export class IdCounter extends SequenceCounter {}
