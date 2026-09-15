import { InProcessBus } from '@ore/bus';
import { InMemoryConsumerDedupe } from './consumer-dedupe';

/**
 * Regression cover for the silent event-loss bug (audit F-BUS-1).
 *
 * Every consumer in every service opens with `if (!(await this.take(env.id))) return;`. The claim
 * is committed straight away, in its own statement, outside whatever transaction the handler then
 * opens. So a handler that threw *kept* the claim — and the redelivery that was supposed to be the
 * retry found the envelope already taken, returned without doing anything, and was acked as a
 * success. The event was neither retried nor dead-lettered. It was simply gone.
 *
 * For the ledger that meant a delivered order whose rider and vendor were never paid, with no
 * failed message anywhere to show for it.
 */
describe('dedupe claim release on handler failure', () => {
  describe('InMemoryConsumerDedupe', () => {
    it('claims an envelope exactly once', async () => {
      const dedupe = new InMemoryConsumerDedupe();
      expect(await dedupe.take('e1')).toBe(true);
      expect(await dedupe.take('e1')).toBe(false);
    });

    it('lets a released envelope be claimed again', async () => {
      const dedupe = new InMemoryConsumerDedupe();
      await dedupe.take('e1');
      await dedupe.release('e1');

      expect(await dedupe.take('e1')).toBe(true);
    });

    it('is a no-op for an envelope that was never claimed', async () => {
      const dedupe = new InMemoryConsumerDedupe();
      await expect(dedupe.release('never-seen')).resolves.toBeUndefined();
      expect(await dedupe.take('never-seen')).toBe(true);
    });

    it('does not release other envelopes', async () => {
      const dedupe = new InMemoryConsumerDedupe();
      await dedupe.take('e1');
      await dedupe.take('e2');
      await dedupe.release('e1');

      expect(await dedupe.take('e2')).toBe(false);
    });
  });

  describe('bus wiring', () => {
    let bus: InProcessBus;
    let dedupe: InMemoryConsumerDedupe;

    beforeEach(() => {
      bus = new InProcessBus();
      dedupe = new InMemoryConsumerDedupe();
      bus.setClaimReleaser((id) => dedupe.release(id));
      jest.spyOn(console, 'error').mockImplementation(() => undefined);
    });

    afterEach(() => jest.restoreAllMocks());

    /** The shape every consumer in the repo is written in. */
    const consumer = (work: () => void) => async (env: { id: string }) => {
      if (!(await dedupe.take(env.id))) return;
      work();
    };

    it('retries the work when the first attempt failed', async () => {
      // The regression. Before the fix the second delivery was swallowed by the claim left
      // behind by the first, and `attempts` stayed at 1 — the event lost, silently.
      let attempts = 0;
      const handler = consumer(() => {
        attempts += 1;
        if (attempts === 1) throw new Error('transient db blip');
      });

      await bus.subscribe('order.delivered' as never, handler as never);

      await bus.publish('order.delivered' as never, {}, { envelopeId: 'env-1' });
      await bus.flush();
      await bus.publish('order.delivered' as never, {}, { envelopeId: 'env-1' });
      await bus.flush();

      expect(attempts).toBe(2);
    });

    it('still suppresses a duplicate delivery when the handler succeeded', async () => {
      // The other half of the contract: releasing on failure must not weaken dedupe on success,
      // or the ledger would double-post a delivered order.
      let attempts = 0;
      const handler = consumer(() => {
        attempts += 1;
      });

      await bus.subscribe('order.delivered' as never, handler as never);

      await bus.publish('order.delivered' as never, {}, { envelopeId: 'env-2' });
      await bus.flush();
      await bus.publish('order.delivered' as never, {}, { envelopeId: 'env-2' });
      await bus.flush();

      expect(attempts).toBe(1);
    });

    it('releases only the failed envelope', async () => {
      const seen: string[] = [];
      const handler = async (env: { id: string }) => {
        if (!(await dedupe.take(env.id))) return;
        seen.push(env.id);
        if (env.id === 'bad') throw new Error('nope');
      };

      await bus.subscribe('order.delivered' as never, handler as never);
      await bus.publish('order.delivered' as never, {}, { envelopeId: 'good' });
      await bus.publish('order.delivered' as never, {}, { envelopeId: 'bad' });
      await bus.flush();

      expect(await dedupe.take('good')).toBe(false); // still claimed
      expect(await dedupe.take('bad')).toBe(true); // released
      expect(seen).toEqual(['good', 'bad']);
    });

    it('works when no releaser is wired, so a bus without dedupe still runs', async () => {
      const bare = new InProcessBus();
      const handler = jest.fn().mockRejectedValue(new Error('boom'));

      await bare.subscribe('order.delivered' as never, handler as never);
      await bare.publish('order.delivered' as never, {}, { envelopeId: 'env-3' });

      await expect(bare.flush()).resolves.toBeUndefined();
      expect(handler).toHaveBeenCalled();
    });

    it('does not let a failing releaser mask the handler error', async () => {
      // The handler's error is the diagnostic that matters; a broken release must not replace it.
      bus.setClaimReleaser(() => Promise.reject(new Error('dedupe store down')));
      const errorLog = jest.spyOn(console, 'error').mockImplementation(() => undefined);

      await bus.subscribe('order.delivered' as never, (async () => {
        throw new Error('the real failure');
      }) as never);
      await bus.publish('order.delivered' as never, {}, { envelopeId: 'env-4' });
      await bus.flush();

      expect(errorLog).toHaveBeenCalledWith(expect.stringContaining('order.delivered'), expect.any(Error));
    });
  });
});
