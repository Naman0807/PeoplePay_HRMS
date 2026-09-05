import { Router } from "express";
import { Prisma } from "@prisma/client";
import { ah } from "../lib/async";
import { assertNoOverlap } from "../lib/contracts";
import { prisma } from "../lib/prisma";
import { badRequest, conflict, notFound, ok, okList, paging } from "../lib/response";
import { parseDate, parseId, parseOneOf, parseOptionalDate, requireFields } from "../lib/validate";
import { requireAuth, requireRole } from "../middleware/auth";
import { assertSelfOrPrivileged } from "../lib/rbac";

export const contractRoutes = Router();
export const employeeContractRoutes = Router({ mergeParams: true });

const WRITE_ROLES = ["HR_MANAGER"] as const;
const STATES = ["DRAFT", "RUNNING", "EXPIRED", "CANCELLED"] as const;

function assertDateOrder(start_date: Date, end_date: Date | null) {
  if (end_date && end_date < start_date) {
    throw badRequest("End date is before the start date.", [
      { field: "end_date", issue: "Must be on or after start_date." },
    ]);
  }
}

function rethrowDuplicateReference(err: unknown): never {
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
    throw conflict("DUPLICATE_REFERENCE", "A contract with this reference already exists.", [
      { field: "reference", issue: "Already in use." },
    ]);
  }
  throw err;
}

// GET /api/employees/:id/contracts
employeeContractRoutes.get(
  "/",
  requireAuth,
  ah(async (req, res) => {
    const employee_id = parseId(req.params.id, "employee_id");
    // A contract carries the wage, so it is not readable across employees.
    assertSelfOrPrivileged(req, employee_id);
    const employee = await prisma.employee.findUnique({ where: { id: employee_id } });
    if (!employee) throw notFound("Employee");

    const { page, limit, skip, take } = paging(req);
    const where: Prisma.ContractWhereInput = {
      employee_id,
      ...(req.query.state ? { state: parseOneOf(req.query.state, STATES, "state") } : {}),
    };

    const [rows, total_records] = await Promise.all([
      prisma.contract.findMany({ where, skip, take, orderBy: { start_date: "desc" } }),
      prisma.contract.count({ where }),
    ]);

    return okList(res, rows, { page, limit, total_records });
  })
);

contractRoutes.use(requireAuth);

contractRoutes.get(
  "/:id",
  ah(async (req, res) => {
    const contract = await prisma.contract.findUnique({ where: { id: parseId(req.params.id) } });
    if (!contract) throw notFound("Contract");
    assertSelfOrPrivileged(req, contract.employee_id);
    return ok(res, contract);
  })
);

contractRoutes.post(
  "/",
  requireRole(...WRITE_ROLES),
  ah(async (req, res) => {
    requireFields(req.body, ["employee_id", "reference", "wage", "start_date"]);

    const employee_id = parseId(req.body.employee_id, "employee_id");
    const start_date = parseDate(req.body.start_date, "start_date");
    const end_date = parseOptionalDate(req.body.end_date, "end_date");
    const wage = Number(req.body.wage);
    const state = req.body.state ? parseOneOf(req.body.state, STATES, "state") : "DRAFT";

    if (!Number.isFinite(wage) || wage < 0) {
      throw badRequest("Invalid wage.", [{ field: "wage", issue: "Must be zero or greater." }]);
    }
    assertDateOrder(start_date, end_date);

    const employee = await prisma.employee.findUnique({ where: { id: employee_id } });
    if (!employee) throw notFound("Employee");

    // Rule 6 runs only when the contract lands in RUNNING — a DRAFT never conflicts.
    if (state === "RUNNING") {
      await assertNoOverlap(prisma, { employee_id, start_date, end_date });
    }

    const contract = await prisma.contract
      .create({
        data: {
          employee_id,
          reference: String(req.body.reference),
          wage,
          start_date,
          end_date,
          state,
          resource_calendar_id: req.body.resource_calendar_id
            ? parseId(req.body.resource_calendar_id, "resource_calendar_id")
            : employee.resource_calendar_id,
          structure_id: req.body.structure_id
            ? parseId(req.body.structure_id, "structure_id")
            : null,
        },
      })
      .catch(rethrowDuplicateReference);

    return ok(res, contract, 201);
  })
);

contractRoutes.patch(
  "/:id",
  requireRole(...WRITE_ROLES),
  ah(async (req, res) => {
    const id = parseId(req.params.id);
    const existing = await prisma.contract.findUnique({ where: { id } });
    if (!existing) throw notFound("Contract");

    const start_date =
      req.body.start_date !== undefined
        ? parseDate(req.body.start_date, "start_date")
        : existing.start_date;
    const end_date =
      req.body.end_date !== undefined
        ? parseOptionalDate(req.body.end_date, "end_date")
        : existing.end_date;
    const state = req.body.state ? parseOneOf(req.body.state, STATES, "state") : existing.state;

    assertDateOrder(start_date, end_date);

    // Re-check on every edit that leaves the contract RUNNING: the dates may have moved
    // under an unchanged state, or the state may have just been promoted from DRAFT.
    if (state === "RUNNING") {
      await assertNoOverlap(prisma, {
        employee_id: existing.employee_id,
        start_date,
        end_date,
        exclude_contract_id: id,
      });
    }

    const data: Prisma.ContractUpdateInput = { start_date, end_date, state };
    if (req.body.reference !== undefined) data.reference = String(req.body.reference);
    if (req.body.wage !== undefined) {
      const wage = Number(req.body.wage);
      if (!Number.isFinite(wage) || wage < 0) {
        throw badRequest("Invalid wage.", [{ field: "wage", issue: "Must be zero or greater." }]);
      }
      data.wage = wage;
    }
    if (req.body.structure_id !== undefined)
      data.structure = req.body.structure_id
        ? { connect: { id: parseId(req.body.structure_id, "structure_id") } }
        : { disconnect: true };
    if (req.body.resource_calendar_id !== undefined)
      data.resource_calendar = req.body.resource_calendar_id
        ? { connect: { id: parseId(req.body.resource_calendar_id, "resource_calendar_id") } }
        : { disconnect: true };

    const contract = await prisma.contract
      .update({ where: { id }, data })
      .catch(rethrowDuplicateReference);

    return ok(res, contract);
  })
);
