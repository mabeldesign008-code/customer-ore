import { BadRequestException } from '@nestjs/common';
import { vendorStatementRange } from './ledger.service';

describe('vendor statement date range', () => {
  it('supports ISO date-only bounds through the full end day', () => {
    const range = vendorStatementRange('2026-08-01', '2026-08-07');
    expect(range?.from.toISOString()).toBe('2026-08-01T00:00:00.000Z');
    expect(range?.to.toISOString()).toBe('2026-08-07T23:59:59.999Z');
  });

  it('supports open-ended ranges', () => {
    expect(vendorStatementRange('2026-08-01')?.to.toISOString()).toBe('9999-12-31T23:59:59.999Z');
    expect(vendorStatementRange(undefined, '2026-08-07')?.from.toISOString()).toBe('1970-01-01T00:00:00.000Z');
  });

  it('rejects invalid and reversed ranges', () => {
    expect(() => vendorStatementRange('not-a-date', '2026-08-07')).toThrow(BadRequestException);
    expect(() => vendorStatementRange('2026-08-08', '2026-08-07')).toThrow(BadRequestException);
  });
});
