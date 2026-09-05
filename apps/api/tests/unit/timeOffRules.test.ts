import { describe, expect, it } from 'vitest';
import {
  assertBalanceAvailable,
  calculateDuration,
  remainingBalance,
} from '../../src/utils/timeOffRules';
import { ApiError } from '../../src/utils/ApiError';
import { calculateWeeklyHours } from '@peoplepay360/shared';

const d = (iso: string) => new Date(iso);

interface FakeAllocation {
  allocated_units: number;
  taken_units: number;
  status: 'DRAFT' | 'APPROVED' | 'REFUSED';
  valid_from: Date;
  valid_to: Date;
}

function fakePrisma(
  type: { requires_allocation: boolean } | null,
  allocations: FakeAllocation[] = []
) {
  return {
    timeOffType: { findUnique: async () => type },
    timeOffAllocation: {
      findMany: async ({ where }: any) =>
        allocations.filter(
          (allocation) =>
            allocation.status === where.status &&
            allocation.valid_from <= where.valid_from.lte &&
            allocation.valid_to >= where.valid_to.gte
        ),
    },
  } as any;
}

const allocation = (over: Partial<FakeAllocation> = {}): FakeAllocation => ({
  allocated_units: 20,
  taken_units: 0,
  status: 'APPROVED',
  valid_from: d('2025-01-01'),
  valid_to: d('2025-12-31'),
  ...over,
});

describe('calculateDuration', () => {
  it('counts a single day as 1 in DAYS', () => {
    expect(calculateDuration(d('2025-03-10'), d('2025-03-10'), 'DAYS')).toBe(1);
  });

  it('is inclusive of both end dates in DAYS', () => {
    expect(calculateDuration(d('2025-03-10'), d('2025-03-14'), 'DAYS')).toBe(5);
  });

  it('converts to an 8 hour working day in HOURS', () => {
    expect(calculateDuration(d('2025-03-10'), d('2025-03-10'), 'HOURS')).toBe(8);
    expect(calculateDuration(d('2025-03-10'), d('2025-03-12'), 'HOURS')).toBe(24);
  });

  it('survives a daylight-saving transition', () => {
    // Europe/Brussels shifts on 2025-03-30; rounding keeps the day count whole.
    expect(calculateDuration(d('2025-03-28'), d('2025-03-31'), 'DAYS')).toBe(4);
  });
});

describe('remainingBalance', () => {
  it('sums allocated minus taken across allocations', () => {
    expect(remainingBalance([allocation(), allocation({ allocated_units: 5, taken_units: 2 })])).toBe(23);
  });

  it('is zero for no allocations', () => {
    expect(remainingBalance([])).toBe(0);
  });

  it('handles Decimal-like string values', () => {
    expect(remainingBalance([{ allocated_units: '20.00', taken_units: '5.50' }])).toBe(14.5);
  });
});

describe('assertBalanceAvailable', () => {
  it('passes when the balance covers the request', async () => {
    const prisma = fakePrisma({ requires_allocation: true }, [allocation()]);
    await expect(
      assertBalanceAvailable(prisma, 'emp-1', 'type-1', d('2025-03-10'), d('2025-03-14'), 5)
    ).resolves.toBeUndefined();
  });

  it('passes when the request exactly consumes the balance', async () => {
    const prisma = fakePrisma({ requires_allocation: true }, [allocation({ allocated_units: 5 })]);
    await expect(
      assertBalanceAvailable(prisma, 'emp-1', 'type-1', d('2025-03-10'), d('2025-03-14'), 5)
    ).resolves.toBeUndefined();
  });

  it('rejects a request larger than the balance', async () => {
    const prisma = fakePrisma({ requires_allocation: true }, [allocation({ allocated_units: 3 })]);
    const err = await assertBalanceAvailable(
      prisma,
      'emp-1',
      'type-1',
      d('2025-03-10'),
      d('2025-03-14'),
      5
    ).catch((e) => e);

    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(400);
    expect(err.code).toBe('INSUFFICIENT_BALANCE');
    expect(err.message).toMatch(/requested 5, remaining 3/);
  });

  it('accounts for units already taken', async () => {
    const prisma = fakePrisma({ requires_allocation: true }, [
      allocation({ allocated_units: 20, taken_units: 18 }),
    ]);
    await expect(
      assertBalanceAvailable(prisma, 'emp-1', 'type-1', d('2025-03-10'), d('2025-03-14'), 5)
    ).rejects.toThrow(/remaining 2/);
  });

  it('rejects when no allocation covers the requested dates', async () => {
    const prisma = fakePrisma({ requires_allocation: true }, [
      allocation({ valid_from: d('2026-01-01'), valid_to: d('2026-12-31') }),
    ]);
    await expect(
      assertBalanceAvailable(prisma, 'emp-1', 'type-1', d('2025-03-10'), d('2025-03-14'), 1)
    ).rejects.toThrow(/remaining 0/);
  });

  it('ignores allocations that are not APPROVED', async () => {
    const prisma = fakePrisma({ requires_allocation: true }, [allocation({ status: 'DRAFT' })]);
    await expect(
      assertBalanceAvailable(prisma, 'emp-1', 'type-1', d('2025-03-10'), d('2025-03-14'), 1)
    ).rejects.toThrow(/INSUFFICIENT_BALANCE|Insufficient balance/);
  });

  it('skips the balance check when requires_allocation is false', async () => {
    const prisma = fakePrisma({ requires_allocation: false });
    await expect(
      assertBalanceAvailable(prisma, 'emp-1', 'type-1', d('2025-03-10'), d('2025-03-14'), 999)
    ).resolves.toBeUndefined();
  });

  it('throws 404 for an unknown time off type', async () => {
    const prisma = fakePrisma(null);
    const err = await assertBalanceAvailable(
      prisma,
      'emp-1',
      'missing',
      d('2025-03-10'),
      d('2025-03-14'),
      1
    ).catch((e) => e);

    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(404);
  });
});

describe('calculateWeeklyHours', () => {
  it('sums a five day week minus breaks', () => {
    const lines = Array.from({ length: 5 }, () => ({
      start_time: '09:00',
      end_time: '17:00',
      break_duration_mins: 60,
    }));

    expect(calculateWeeklyHours(lines)).toBe(35);
  });

  it('handles an overnight shift', () => {
    expect(
      calculateWeeklyHours([{ start_time: '22:00', end_time: '06:00', break_duration_mins: 30 }])
    ).toBe(7.5);
  });

  it('never returns negative hours for a break longer than the shift', () => {
    expect(
      calculateWeeklyHours([{ start_time: '09:00', end_time: '10:00', break_duration_mins: 120 }])
    ).toBe(0);
  });

  it('is zero for a schedule with no lines', () => {
    expect(calculateWeeklyHours([])).toBe(0);
  });
});
