import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

/**
 * One row per journal batch that must be replay-safe (audit P0). The key is a
 * deterministic business key (`delivered:<orderId>`, `charge:<orderId>`, …); inserting
 * it is the commit point — if the key already exists the batch was already posted and
 * is skipped. The PK is the hard stop for concurrent duplicates.
 */
@Entity({ schema: 'ledger' })
export class LedgerIdempotency {
  @PrimaryColumn()
  id: string;

  @CreateDateColumn()
  createdAt: Date;
}
