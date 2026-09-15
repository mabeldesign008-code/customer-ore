import { Entity } from 'typeorm';
import { SequenceCounter } from '@ore/db';

/** Per (city, service, date) counter for visible order refs (doc §Order ID). Key: `CC-FO-20260810`. */
@Entity({ schema: 'order' })
export class OrderSequence extends SequenceCounter {}
