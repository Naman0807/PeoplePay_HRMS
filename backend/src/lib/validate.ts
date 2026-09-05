import { badRequest } from "./response";

/** Small hand-rolled validators — the MVP has too few shapes to earn a schema library. */

export function requireFields(body: Record<string, unknown>, fields: string[]) {
  const missing = fields.filter((f) => body[f] === undefined || body[f] === null || body[f] === "");
  if (missing.length) {
    throw badRequest(
      "Required fields are missing.",
      missing.map((field) => ({ field, issue: "This field is required." }))
    );
  }
}

export function parseDate(value: unknown, field: string): Date {
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) {
    throw badRequest("Invalid date.", [{ field, issue: "Expected a date like 2026-04-01." }]);
  }
  return date;
}

export function parseOptionalDate(value: unknown, field: string): Date | null {
  if (value === undefined || value === null || value === "") return null;
  return parseDate(value, field);
}

export function parseId(value: unknown, field = "id"): number {
  const id = Number(value);
  if (!Number.isInteger(id) || id < 1) {
    throw badRequest("Invalid id.", [{ field, issue: "Expected a positive integer." }]);
  }
  return id;
}

export function parseOneOf<T extends string>(value: unknown, allowed: readonly T[], field: string): T {
  if (!allowed.includes(value as T)) {
    throw badRequest("Invalid value.", [{ field, issue: `Expected one of: ${allowed.join(", ")}.` }]);
  }
  return value as T;
}
