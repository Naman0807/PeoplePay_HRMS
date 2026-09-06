import { describe, expect, it } from 'vitest';
import { utcDayStart } from '../../src/utils/dates';

describe('utcDayStart', () => {
  it('keeps the local calendar day, pinned to midnight UTC', () => {
    // 06 Sep 2026, late enough locally that a positive UTC offset would not
    // change the date, but the time-of-day must still be dropped.
    const start = utcDayStart(new Date(2026, 8, 6, 13, 45, 30));
    expect(start.getUTCFullYear()).toBe(2026);
    expect(start.getUTCMonth()).toBe(8);
    expect(start.getUTCDate()).toBe(6);
    expect(start.getUTCHours()).toBe(0);
    expect(start.getUTCMinutes()).toBe(0);
  });

  it('matches how a "YYYY-MM-DD" query filter is parsed', () => {
    expect(utcDayStart(new Date(2026, 8, 6, 0, 0, 0)).getTime()).toBe(
      new Date('2026-09-06').getTime()
    );
  });

  it('does not shift the day for a time just before local midnight', () => {
    expect(utcDayStart(new Date(2026, 8, 6, 23, 59, 59)).toISOString()).toBe(
      '2026-09-06T00:00:00.000Z'
    );
  });
});
