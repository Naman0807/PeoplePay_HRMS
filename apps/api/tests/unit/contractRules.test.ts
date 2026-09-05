import { describe, expect, it } from 'vitest';
import { assertCoversPeriod, assertNoOverlap, periodsOverlap } from '../../src/utils/contractRules';
import { ApiError } from '../../src/utils/ApiError';

const d = (iso: string) => new Date(iso);

interface FakeContract {
  id: string;
  name: string;
  status: 'DRAFT' | 'RUNNING' | 'EXPIRED' | 'CANCELLED';
  employee_id: string;
  start_date: Date;
  end_date: Date | null;
}

/**
 * Minimal stand-in for `prisma.contract.findMany` that applies the same
 * employee / status / id filters the service passes in.
 */
function fakePrisma(contracts: FakeContract[]) {
  return {
    contract: {
      findMany: async ({ where }: any) => {
        return contracts.filter((contract) => {
          if (where.employee_id && contract.employee_id !== where.employee_id) return false;
          if (where.status && contract.status !== where.status) return false;
          if (where.id?.not && contract.id === where.id.not) return false;
          return true;
        });
      },
    },
  } as any;
}

const running = (over: Partial<FakeContract> = {}): FakeContract => ({
  id: 'c1',
  name: 'Existing contract',
  status: 'RUNNING',
  employee_id: 'emp-1',
  start_date: d('2025-01-01'),
  end_date: d('2025-12-31'),
  ...over,
});

describe('periodsOverlap', () => {
  it('is false for disjoint periods', () => {
    expect(periodsOverlap(d('2025-01-01'), d('2025-03-31'), d('2025-04-01'), d('2025-06-30'))).toBe(false);
  });

  it('is true for identical periods', () => {
    expect(periodsOverlap(d('2025-01-01'), d('2025-12-31'), d('2025-01-01'), d('2025-12-31'))).toBe(true);
  });

  it('is true for partial overlap in either direction', () => {
    expect(periodsOverlap(d('2025-06-01'), d('2025-12-31'), d('2025-01-01'), d('2025-06-30'))).toBe(true);
    expect(periodsOverlap(d('2025-01-01'), d('2025-06-30'), d('2025-06-01'), d('2025-12-31'))).toBe(true);
  });

  it('is true when the periods touch on a single day', () => {
    expect(periodsOverlap(d('2025-06-30'), d('2025-12-31'), d('2025-01-01'), d('2025-06-30'))).toBe(true);
  });

  it('treats a null end date as open-ended', () => {
    expect(periodsOverlap(d('2030-01-01'), null, d('2025-01-01'), null)).toBe(true);
    expect(periodsOverlap(d('2030-01-01'), null, d('2025-01-01'), d('2025-12-31'))).toBe(false);
    expect(periodsOverlap(d('2020-01-01'), d('2020-12-31'), d('2019-01-01'), null)).toBe(true);
  });
});

describe('assertNoOverlap', () => {
  it('passes when there is no overlapping contract', async () => {
    const prisma = fakePrisma([running()]);
    await expect(
      assertNoOverlap(prisma, 'emp-1', d('2026-01-01'), d('2026-12-31'))
    ).resolves.toBeUndefined();
  });

  it('rejects an exact duplicate period', async () => {
    const prisma = fakePrisma([running()]);
    await expect(
      assertNoOverlap(prisma, 'emp-1', d('2025-01-01'), d('2025-12-31'))
    ).rejects.toThrow(/Contract overlaps/);
  });

  it('rejects a partial overlap', async () => {
    const prisma = fakePrisma([running()]);
    await expect(
      assertNoOverlap(prisma, 'emp-1', d('2025-12-01'), d('2026-06-30'))
    ).rejects.toThrow(/Contract overlaps/);
  });

  it('throws a 400 CONTRACT_OVERLAP ApiError', async () => {
    const prisma = fakePrisma([running()]);
    const err = await assertNoOverlap(prisma, 'emp-1', d('2025-05-01'), null).catch((e) => e);

    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(400);
    expect(err.code).toBe('CONTRACT_OVERLAP');
  });

  it('rejects a new contract that starts inside an open-ended one', async () => {
    const prisma = fakePrisma([running({ end_date: null })]);
    await expect(
      assertNoOverlap(prisma, 'emp-1', d('2030-01-01'), d('2030-12-31'))
    ).rejects.toThrow(/Contract overlaps/);
  });

  it('rejects a new open-ended contract that reaches an existing one', async () => {
    const prisma = fakePrisma([running()]);
    await expect(
      assertNoOverlap(prisma, 'emp-1', d('2025-06-01'), null)
    ).rejects.toThrow(/Contract overlaps/);
  });

  it('ignores DRAFT, EXPIRED and CANCELLED contracts', async () => {
    const prisma = fakePrisma([
      running({ id: 'c1', status: 'DRAFT' }),
      running({ id: 'c2', status: 'EXPIRED' }),
      running({ id: 'c3', status: 'CANCELLED' }),
    ]);

    await expect(
      assertNoOverlap(prisma, 'emp-1', d('2025-01-01'), d('2025-12-31'))
    ).resolves.toBeUndefined();
  });

  it('ignores contracts belonging to another employee', async () => {
    const prisma = fakePrisma([running({ employee_id: 'emp-2' })]);
    await expect(
      assertNoOverlap(prisma, 'emp-1', d('2025-01-01'), d('2025-12-31'))
    ).resolves.toBeUndefined();
  });

  it('excludes the contract being updated', async () => {
    const prisma = fakePrisma([running({ id: 'c1' })]);
    await expect(
      assertNoOverlap(prisma, 'emp-1', d('2025-01-01'), d('2025-12-31'), 'c1')
    ).resolves.toBeUndefined();
  });
});

describe('assertCoversPeriod', () => {
  it('accepts a contract spanning the whole payrun period', () => {
    expect(
      assertCoversPeriod({ start_date: d('2024-01-01'), end_date: d('2026-01-01') }, d('2025-01-01'), d('2025-01-31'))
    ).toBe(true);
  });

  it('accepts an open-ended contract that started before the period', () => {
    expect(
      assertCoversPeriod({ start_date: d('2024-01-01'), end_date: null }, d('2025-01-01'), d('2025-01-31'))
    ).toBe(true);
  });

  it('rejects a contract that starts mid-period', () => {
    expect(
      assertCoversPeriod({ start_date: d('2025-01-15'), end_date: null }, d('2025-01-01'), d('2025-01-31'))
    ).toBe(false);
  });

  it('rejects a contract that ends mid-period', () => {
    expect(
      assertCoversPeriod({ start_date: d('2024-01-01'), end_date: d('2025-01-15') }, d('2025-01-01'), d('2025-01-31'))
    ).toBe(false);
  });
});
