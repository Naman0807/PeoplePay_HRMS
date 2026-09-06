import { Prisma } from '@prisma/client';
import { describe, expect, it } from 'vitest';
import { ok } from '../../src/utils/apiResponse';

describe('ok', () => {
  it('converts Decimal columns to numbers so clients can do arithmetic', () => {
    const res = ok({ worked_hours: new Prisma.Decimal('8.25') });
    expect(res.data.worked_hours).toBe(8.25);
    expect(typeof res.data.worked_hours).toBe('number');
  });

  it('converts Decimals nested in arrays and objects', () => {
    const res = ok({
      items: [{ wage: new Prisma.Decimal('1200.50') }],
      meta: { total: new Prisma.Decimal('1') },
    });
    expect(res.data.items[0].wage).toBe(1200.5);
    expect(res.data.meta.total).toBe(1);
  });

  it('leaves dates, nulls and plain values alone', () => {
    const date = new Date('2026-09-06T00:00:00.000Z');
    const res = ok({ date, check_out: null, status: 'NORMAL' });
    expect(res.data.date).toBe(date);
    expect(res.data.check_out).toBeNull();
    expect(res.data.status).toBe('NORMAL');
  });
});
