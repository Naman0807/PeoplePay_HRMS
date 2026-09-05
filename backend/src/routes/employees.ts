import { Router } from "express";
import { Prisma } from "@prisma/client";
import { ah } from "../lib/async";
import { prisma } from "../lib/prisma";
import { badRequest, conflict, notFound, ok, okList, paging } from "../lib/response";
import { parseId, parseOneOf, requireFields } from "../lib/validate";
import { requireAuth, requireRole } from "../middleware/auth";
import { assertSelfOrPrivileged, HR_ADMIN_ROLES, scopeEmployeeRows } from "../lib/rbac";

export const employeeRoutes = Router();

employeeRoutes.use(requireAuth);

const WRITE_ROLES = HR_ADMIN_ROLES;
const STATUSES = ["ACTIVE", "INACTIVE"] as const;

/** Unique constraint on work_email surfaces as a 409, not a 500. */
function rethrowDuplicateEmail(err: unknown): never {
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
    throw conflict("DUPLICATE_EMAIL", "An employee with this work email already exists.", [
      { field: "work_email", issue: "Already in use." },
    ]);
  }
  throw err;
}

employeeRoutes.get(
  "/",
  ah(async (req, res) => {
    const { page, limit, skip, take } = paging(req);

    // An employee sees their own record only — the spec grants them "own employee
    // details", not the staff directory.
    const where: Prisma.EmployeeWhereInput = scopeEmployeeRows(req, {
      ...(req.query.department ? { department: String(req.query.department) } : {}),
      ...(req.query.status ? { status: parseOneOf(req.query.status, STATUSES, "status") } : {}),
    });

    const [rows, total_records] = await Promise.all([
      prisma.employee.findMany({ where, skip, take, orderBy: { id: "asc" } }),
      prisma.employee.count({ where }),
    ]);

    return okList(res, rows, { page, limit, total_records });
  })
);

employeeRoutes.get(
  "/:id",
  ah(async (req, res) => {
    const id = parseId(req.params.id);
    assertSelfOrPrivileged(req, id);
    const employee = await prisma.employee.findUnique({ where: { id } });
    if (!employee) throw notFound("Employee");
    return ok(res, employee);
  })
);

employeeRoutes.post(
  "/",
  requireRole(...WRITE_ROLES),
  ah(async (req, res) => {
    requireFields(req.body, ["name", "work_email"]);

    const employee = await prisma.employee
      .create({
        data: {
          name: String(req.body.name),
          work_email: String(req.body.work_email),
          department: req.body.department ? String(req.body.department) : null,
          job_title: req.body.job_title ? String(req.body.job_title) : null,
          manager_id: req.body.manager_id ? parseId(req.body.manager_id, "manager_id") : null,
          resource_calendar_id: req.body.resource_calendar_id
            ? parseId(req.body.resource_calendar_id, "resource_calendar_id")
            : null,
          ...(req.body.status ? { status: parseOneOf(req.body.status, STATUSES, "status") } : {}),
        },
      })
      .catch(rethrowDuplicateEmail);

    return ok(res, employee, 201);
  })
);

employeeRoutes.patch(
  "/:id",
  requireRole(...WRITE_ROLES),
  ah(async (req, res) => {
    const id = parseId(req.params.id);
    const existing = await prisma.employee.findUnique({ where: { id } });
    if (!existing) throw notFound("Employee");

    if (req.body.manager_id !== undefined && Number(req.body.manager_id) === id) {
      throw badRequest("An employee cannot manage themselves.", [
        { field: "manager_id", issue: "Must not be the employee's own id." },
      ]);
    }

    const data: Prisma.EmployeeUpdateInput = {};
    if (req.body.name !== undefined) data.name = String(req.body.name);
    if (req.body.work_email !== undefined) data.work_email = String(req.body.work_email);
    if (req.body.department !== undefined)
      data.department = req.body.department ? String(req.body.department) : null;
    if (req.body.job_title !== undefined)
      data.job_title = req.body.job_title ? String(req.body.job_title) : null;
    if (req.body.status !== undefined) data.status = parseOneOf(req.body.status, STATUSES, "status");
    if (req.body.manager_id !== undefined)
      data.manager = req.body.manager_id
        ? { connect: { id: parseId(req.body.manager_id, "manager_id") } }
        : { disconnect: true };
    if (req.body.resource_calendar_id !== undefined)
      data.resource_calendar = req.body.resource_calendar_id
        ? { connect: { id: parseId(req.body.resource_calendar_id, "resource_calendar_id") } }
        : { disconnect: true };

    const employee = await prisma.employee
      .update({ where: { id }, data })
      .catch(rethrowDuplicateEmail);

    return ok(res, employee);
  })
);
