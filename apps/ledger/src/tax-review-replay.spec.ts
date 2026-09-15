import { Logger } from '@nestjs/common';
import { LedgerService } from './ledger.service';

/**
 * P3-1 / P4-3 — a tax classification review blocked the posting that pays the rider and the
 * vendor, and resolving the review did nothing to unblock it.
 *
 * The refusal to post is correct: guessing a resident status writes a wrong withholding figure
 * into an append-only ledger and files it with the GRA. What was missing was the way back. The
 * order had been delivered and the customer had been charged; the money simply sat there, with
 * the exceptions queue showing a case an operator had already resolved.
 */
describe('LedgerService — tax review replay', () => {
  type Case = { id: string; orderId: string | null; status: string };

  /**
   * The real `replayResolvedTaxReviews`, bound to stub collaborators.
   *
   * `Object.create(prototype)` rather than the DI harness on purpose: this exercises the shipped
   * method, not a copy of it written in the test, while skipping a full TypeORM boot the sweeper
   * logic does not need.
   */
  const makeService = (opts: { cases: Case[]; posted?: Set<string>; onDelivered?: jest.Mock }) => {
    const posted = opts.posted ?? new Set<string>();
    const onDelivered =
      opts.onDelivered ?? jest.fn(async (id: string) => { posted.add(`delivered:${id}`); });

    const service = Object.create(LedgerService.prototype) as Record<string, unknown> & {
      replayResolvedTaxReviews(): Promise<void>;
    };
    Object.assign(service, {
      taxEngine: { resolvedOrderReviews: jest.fn(async () => opts.cases) },
      alreadyPosted: jest.fn(async (ref: string) => posted.has(ref)),
      onDelivered,
    });

    return { service, posted, onDelivered };
  };

  const sweep = (s: { replayResolvedTaxReviews(): Promise<void> }) =>
    (s as unknown as { replayResolvedTaxReviews(): Promise<void> }).replayResolvedTaxReviews();

  beforeEach(() => {
    jest.spyOn(Logger, 'log').mockImplementation(() => undefined);
    jest.spyOn(Logger, 'warn').mockImplementation(() => undefined);
  });
  afterEach(() => jest.restoreAllMocks());

  it('posts an order once its blocking review has been resolved', async () => {
    const { service, posted, onDelivered } = makeService({
      cases: [{ id: 'case-1', orderId: 'order-1', status: 'RESOLVED' }],
    });

    await sweep(service);

    expect(onDelivered).toHaveBeenCalledWith('order-1');
    expect(posted.has('delivered:order-1')).toBe(true);
  });

  it('does not re-post an order that was already posted', async () => {
    // The replay guard is the whole reason re-running is safe; without it the sweeper would
    // credit the rider again every fifteen minutes.
    const { service, onDelivered } = makeService({
      cases: [{ id: 'case-1', orderId: 'order-1', status: 'RESOLVED' }],
      posted: new Set(['delivered:order-1']),
    });

    await sweep(service);

    expect(onDelivered).not.toHaveBeenCalled();
  });

  it('keeps going when one order is still not postable', async () => {
    // One order stuck behind a second unresolved problem must not stop everyone else being paid.
    const onDelivered = jest.fn(async (id: string) => {
      if (id === 'order-stuck') throw new Error('Tax classification requires review before posting');
    });
    const { service } = makeService({
      cases: [
        { id: 'c1', orderId: 'order-stuck', status: 'RESOLVED' },
        { id: 'c2', orderId: 'order-fine', status: 'RESOLVED' },
      ],
      onDelivered,
    });

    await sweep(service);

    expect(onDelivered).toHaveBeenCalledWith('order-stuck');
    expect(onDelivered).toHaveBeenCalledWith('order-fine');
  });

  it('retries a still-blocked order on the next sweep rather than giving up', async () => {
    let attempts = 0;
    const onDelivered = jest.fn(async () => {
      attempts += 1;
      if (attempts === 1) throw new Error('still unknown');
    });
    const { service } = makeService({
      cases: [{ id: 'c1', orderId: 'order-1', status: 'RESOLVED' }],
      onDelivered,
    });

    await sweep(service);
    await sweep(service);

    expect(attempts).toBe(2);
  });

  it('ignores review cases with no order attached', async () => {
    // Rider milestone incentives open review cases too, and they are not order postings.
    const { service, onDelivered } = makeService({
      cases: [{ id: 'c1', orderId: null, status: 'RESOLVED' }],
    });

    await sweep(service);

    expect(onDelivered).not.toHaveBeenCalled();
  });
});

/**
 * The query behind the sweeper. Only RESOLVED cases with an order are replayable: an OPEN case
 * still needs a human, and replaying it would just re-throw every fifteen minutes.
 */
describe('TaxEngineService.resolvedOrderReviews', () => {
  it('asks only for resolved cases that carry an order id', async () => {
    const find = jest.fn().mockResolvedValue([]);
    const { TaxEngineService } = await import('./tax-engine.service');
    const engine = Object.create(TaxEngineService.prototype) as { reviewCases: unknown; resolvedOrderReviews: (n?: number) => Promise<unknown> };
    engine.reviewCases = { find };

    await engine.resolvedOrderReviews();

    const where = find.mock.calls[0][0].where;
    expect(where.status).toBe('RESOLVED');
    expect(where.orderId).toBeDefined(); // Not(IsNull())
    expect(find.mock.calls[0][0].order).toEqual({ resolvedAt: 'ASC' });
  });

  it('bounds the batch so one sweep cannot load the whole backlog', async () => {
    const find = jest.fn().mockResolvedValue([]);
    const { TaxEngineService } = await import('./tax-engine.service');
    const engine = Object.create(TaxEngineService.prototype) as { reviewCases: unknown; resolvedOrderReviews: (n?: number) => Promise<unknown> };
    engine.reviewCases = { find };

    await engine.resolvedOrderReviews();

    expect(find.mock.calls[0][0].take).toBe(200);
  });
});
