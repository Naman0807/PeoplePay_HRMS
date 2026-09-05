import type { Prisma, PrismaClient } from "@prisma/client";
import { conflict } from "./response";

/** Stands in for "no end date" so an open-ended contract compares as running forever. */
export const OPEN_ENDED = new Date("9999-12-31");

type OverlapArgs = {
  employee_id: number;
  start_date: Date;
  end_date: Date | null;
  /** On PATCH, the contract being edited must not conflict with itself. */
  exclude_contract_id?: number;
};

/**
 * Rule 6 (AGENT.md §3): an employee may not have two RUNNING contracts covering the
 * same dates. Two ranges overlap when each starts on or before the other ends, with a
 * null end_date treated as open-ended.
 *
 * DRAFT, EXPIRED and CANCELLED contracts neither trigger nor block — only the
 * resulting RUNNING state is checked, per AGENT.md §4.
 */
export async function findOverlappingContract(
  db: PrismaClient | Prisma.TransactionClient,
  { employee_id, start_date, end_date, exclude_contract_id }: OverlapArgs
) {
  return db.contract.findFirst({
    where: {
      employee_id,
      state: "RUNNING",
      ...(exclude_contract_id ? { id: { not: exclude_contract_id } } : {}),
      start_date: { lte: end_date ?? OPEN_ENDED },
      OR: [{ end_date: null }, { end_date: { gte: start_date } }],
    },
    orderBy: { start_date: "asc" },
  });
}

/** Throws the 409 the jury will test for, naming the contract that blocked it. */
export async function assertNoOverlap(
  db: PrismaClient | Prisma.TransactionClient,
  args: OverlapArgs
) {
  const clash = await findOverlappingContract(db, args);
  if (!clash) return;

  const until = clash.end_date ? clash.end_date.toISOString().slice(0, 10) : "active";
  throw conflict(
    "CONTRACT_OVERLAP",
    "Employee already has a running contract for this period.",
    [
      {
        field: "start_date",
        issue: `Overlaps ${clash.reference} (${clash.start_date.toISOString().slice(0, 10)} - ${until})`,
      },
    ]
  );
}
