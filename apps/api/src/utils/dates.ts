/**
 * Midnight UTC of a local calendar day.
 *
 * Prisma stores `@db.Date` columns from the UTC date part of a JS Date, so a
 * local-midnight Date (`new Date(y, m, d)`) lands on the previous day for any
 * positive UTC offset. Query filters parse `"YYYY-MM-DD"` as UTC midnight, so
 * day keys must be built the same way on both sides.
 */
export function utcDayStart(date: Date = new Date()): Date {
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
}
