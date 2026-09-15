import { ConflictException, Logger } from '@nestjs/common';
import { LedgerService } from './ledger.service';
import { TaxClassificationReviewRequired, isPostingDeferred } from './tax-engine.service';

/**
 * A tax hold is a business outcome, not a failed message.
 *
 * Observed on a live stack: a COD order was delivered, the rider's resident status was UNKNOWN,
 * `onDelivered` opened a review case and then threw. NATS redelivered ten times — re-running the
 * order fetch and three internal HTTP calls each time — and dead-lettered the event. Seventeen
 * of the nineteen messages in `ORE_EVENTS_DLQ` were this, and none of them were a defect. The
 * DLQ is where an operator looks for genuinely broken messages, so filling it with routine
 * compliance holds is how a real one gets missed.
 *
 * Nothing a retry does can clear the hold — only a human decision can — and the review case is
 * already durably written when the deferral is raised, so the event is acked and
 * `replayResolvedTaxReviews` posts the money once the decision is made.
 */
describe('ledger — a tax classification hold is deferred, not dead-lettered', () => {
  describe('TaxClassificationReviewRequired', () => {
    it('is still a 409 to HTTP callers', () => {
      // Admin endpoints surface this to a human; the API contract must not change.
      const err = new TaxClassificationReviewRequired('delivery_partner_resident_status_unknown');
      expect(err).toBeInstanceOf(ConflictException);
      expect(err.getStatus()).toBe(409);
      expect(err.message).toBe(
        'Tax classification requires review before posting: delivery_partner_resident_status_unknown',
      );
    });

    it('carries the reasons so the log says which check blocked', () => {
      const err = new TaxClassificationReviewRequired('a, b');
      expect(err.reasons).toBe('a, b');
    });
  });

  describe('isPostingDeferred', () => {
    it('recognises a deferral', () => {
      expect(isPostingDeferred(new TaxClassificationReviewRequired('x'))).toBe(true);
    });

    it.each([
      ['a plain conflict', new ConflictException('Tax classification requires review before posting: x')],
      ['an unrelated error', new Error('database is on fire')],
      ['a string', 'Tax classification requires review before posting'],
      ['null', null],
    ])('does not mistake %s for one', (_label, value) => {
      // Deliberately not message-matching: an unrelated 409 that happens to be worded the same
      // way must still be retried, and a real fault must never be silently acked.
      expect(isPostingDeferred(value)).toBe(false);
    });
  });

  describe('settleOrDefer', () => {
    /** The consumer wrapper, exercised directly — it is the seam that decides ack vs nak. */
    const settleOrDefer = async (service: object, orderId: string) =>
      (service as { settleOrDefer: (id: string) => Promise<void> }).settleOrDefer(orderId);

    /** The shipped method bound to a stub `onDelivered`, as in the replay spec. */
    const fakeService = (onDelivered: jest.Mock) =>
      Object.assign(Object.create(LedgerService.prototype) as object, { onDelivered });

    beforeEach(() => {
      jest.spyOn(Logger, 'log').mockImplementation(() => undefined);
    });
    afterEach(() => jest.restoreAllMocks());

    it('swallows a deferral so the message is acked', async () => {
      const onDelivered = jest.fn().mockRejectedValue(new TaxClassificationReviewRequired('rider_unknown'));
      await expect(settleOrDefer(fakeService(onDelivered), 'order-1')).resolves.toBeUndefined();
      expect(onDelivered).toHaveBeenCalledWith('order-1');
    });

    it('rethrows anything else, so a real fault still retries and still dead-letters', async () => {
      const onDelivered = jest.fn().mockRejectedValue(new Error('order service unreachable'));
      await expect(settleOrDefer(fakeService(onDelivered), 'order-1')).rejects.toThrow('order service unreachable');
    });

    it('passes a successful posting straight through', async () => {
      const onDelivered = jest.fn().mockResolvedValue(undefined);
      await expect(settleOrDefer(fakeService(onDelivered), 'order-1')).resolves.toBeUndefined();
    });
  });
});
