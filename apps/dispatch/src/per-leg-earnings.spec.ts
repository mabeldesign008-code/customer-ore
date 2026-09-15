import { buildDispatchHarness, makeAssignment, DispatchHarness } from './dispatch-test-harness';
import { NotFoundException } from '@nestjs/common';

/**
 * The dispatch half of the unpaid-rider fix.
 *
 * Rider pay used to live only on the order, where each dispatch overwrote the last. The ledger
 * now asks dispatch who actually worked the order and what each leg was worth, so these two
 * methods are the source of truth for who gets paid.
 */
describe('DispatchService — per-leg earnings', () => {
  let h: DispatchHarness;

  beforeEach(async () => {
    h = await buildDispatchHarness();
  });

  afterEach(async () => {
    await h.module.close();
  });

  describe('assignmentsForOrder', () => {
    it('reports every leg of a laundry order, oldest first, with its own fee', async () => {
      h.assignments.find.mockResolvedValue([
        makeAssignment({
          id: 'leg-collect', riderId: 'rider-collect', status: 'COMPLETED',
          riderFeePesewas: 800, peakPayPesewas: 100,
          assignedAt: new Date('2026-09-01T10:00:00.000Z'),
          completedAt: new Date('2026-09-01T10:30:00.000Z'),
        }),
        makeAssignment({
          id: 'leg-return', riderId: 'rider-return', status: 'ACTIVE',
          riderFeePesewas: 900, peakPayPesewas: 0,
          assignedAt: new Date('2026-09-02T14:00:00.000Z'),
        }),
      ]);

      const legs = await h.service.assignmentsForOrder('order-laundry');

      expect(legs).toHaveLength(2);
      expect(legs[0]).toMatchObject({ id: 'leg-collect', riderId: 'rider-collect', riderFeePesewas: 800, peakPayPesewas: 100 });
      expect(legs[1]).toMatchObject({ id: 'leg-return', riderId: 'rider-return', riderFeePesewas: 900 });
      // Two different riders — the collection rider is visible to the ledger, which is the
      // entire point of this endpoint.
      expect(new Set(legs.map((l) => l.riderId)).size).toBe(2);
    });

    it('asks for COMPLETED and ACTIVE legs only, ordered by assignment time', async () => {
      h.assignments.find.mockResolvedValue([]);

      await h.service.assignmentsForOrder('order-1');

      expect(h.assignments.find).toHaveBeenCalledWith({
        where: [
          { orderId: 'order-1', status: 'COMPLETED' },
          { orderId: 'order-1', status: 'ACTIVE' },
        ],
        order: { assignedAt: 'ASC' },
      });
    });

    it('serialises dates as ISO strings so they survive the internal HTTP hop', async () => {
      h.assignments.find.mockResolvedValue([
        makeAssignment({
          assignedAt: new Date('2026-09-01T10:00:00.000Z'),
          completedAt: new Date('2026-09-01T10:30:00.000Z'),
          earningsPostedAt: new Date('2026-09-01T11:00:00.000Z'),
        }),
      ]);

      const [leg] = await h.service.assignmentsForOrder('order-1');

      expect(leg.assignedAt).toBe('2026-09-01T10:00:00.000Z');
      expect(leg.completedAt).toBe('2026-09-01T10:30:00.000Z');
      expect(leg.earningsPostedAt).toBe('2026-09-01T11:00:00.000Z');
    });

    it('reports null rather than a date string for a leg that is not finished or not paid', async () => {
      h.assignments.find.mockResolvedValue([makeAssignment()]);

      const [leg] = await h.service.assignmentsForOrder('order-1');

      expect(leg.completedAt).toBeNull();
      expect(leg.earningsPostedAt).toBeNull();
    });

    it('defaults missing fees to zero rather than leaking undefined into the split', async () => {
      h.assignments.find.mockResolvedValue([
        { id: 'a1', orderId: 'o1', riderId: 'r1', status: 'ACTIVE', assignedAt: new Date(), completedAt: null, earningsPostedAt: null } as never,
      ]);

      const [leg] = await h.service.assignmentsForOrder('o1');

      expect(leg.riderFeePesewas).toBe(0);
      expect(leg.peakPayPesewas).toBe(0);
    });

    it('returns an empty list for an order nobody worked', async () => {
      h.assignments.find.mockResolvedValue([]);
      await expect(h.service.assignmentsForOrder('order-none')).resolves.toEqual([]);
    });
  });

  describe('markEarningsPosted', () => {
    it('stamps a leg the first time the ledger confirms payment', async () => {
      const leg = makeAssignment({ earningsPostedAt: null });
      h.assignments.findOne.mockResolvedValue(leg);
      h.assignments.save.mockImplementation(async (a) => a);

      await h.service.markEarningsPosted('assign-1');

      expect(leg.earningsPostedAt).toBeInstanceOf(Date);
      expect(h.assignments.save).toHaveBeenCalledWith(leg);
    });

    it('does not move an existing stamp — a redelivered event must not re-pay the leg', async () => {
      const already = new Date('2026-09-01T11:00:00.000Z');
      const leg = makeAssignment({ earningsPostedAt: already });
      h.assignments.findOne.mockResolvedValue(leg);
      h.assignments.save.mockImplementation(async (a) => a);

      await h.service.markEarningsPosted('assign-1');

      expect(leg.earningsPostedAt).toBe(already);
      expect(h.assignments.save).not.toHaveBeenCalled();
    });

    it('throws when the assignment does not exist, so the ledger logs a real failure', async () => {
      h.assignments.findOne.mockResolvedValue(null);
      await expect(h.service.markEarningsPosted('ghost')).rejects.toThrow(NotFoundException);
    });
  });
});
