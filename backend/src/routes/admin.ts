import { Router } from "express";
import { ah } from "../lib/async";
import { prisma } from "../lib/prisma";
import { badRequest, notFound, ok, okList, paging } from "../lib/response";
import { parseId } from "../lib/validate";
import { requireAuth, requireRole } from "../middleware/auth";

export const adminRoutes = Router();

adminRoutes.use(requireAuth);
// ADMIN-only surface: approving a self-signup into an HR/payroll role is the one
// action in this app that can grant that access, so nothing here is reachable
// by any other role, not even HR_PAYROLL_MANAGER.
adminRoutes.use(requireRole("ADMIN"));

const publicUser = (u: {
  id: number;
  name: string;
  login: string;
  role: string;
  employee_id: number | null;
  status: string;
}) => ({ id: u.id, name: u.name, login: u.login, role: u.role, employee_id: u.employee_id, status: u.status });

/**
 * Signups that requested a role other than EMPLOYEE, awaiting activation.
 * INACTIVE users.status is currently set only by the signup approval flow — if a
 * separate "deactivate this account" feature is ever added using the same status
 * field, this list needs a way to tell the two apart (e.g. a dedicated flag),
 * or a deactivated account would show up here as if it were a pending request.
 */
adminRoutes.get(
  "/pending-users",
  ah(async (req, res) => {
    const { page, limit, skip, take } = paging(req);
    const where = { status: "INACTIVE" as const };

    const [rows, total_records] = await Promise.all([
      prisma.user.findMany({ where, skip, take, orderBy: { created_at: "asc" } }),
      prisma.user.count({ where }),
    ]);

    return okList(res, rows.map(publicUser), { page, limit, total_records });
  })
);

adminRoutes.patch(
  "/pending-users/:id/approve",
  ah(async (req, res) => {
    const id = parseId(req.params.id);
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) throw notFound("User");
    if (user.status !== "INACTIVE") {
      throw badRequest("Only a pending (inactive) account can be approved.", [
        { field: "status", issue: `Account is already ${user.status}.` },
      ]);
    }

    const updated = await prisma.user.update({ where: { id }, data: { status: "ACTIVE" } });
    return ok(res, publicUser(updated));
  })
);

/**
 * Reject deletes the request rather than leaving a rejected row around — there's no
 * REJECTED status in the schema, and a rejected signup has no other use once denied.
 */
adminRoutes.patch(
  "/pending-users/:id/reject",
  ah(async (req, res) => {
    const id = parseId(req.params.id);
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) throw notFound("User");
    if (user.status !== "INACTIVE") {
      throw badRequest("Only a pending (inactive) account can be rejected.", [
        { field: "status", issue: `Account is already ${user.status}.` },
      ]);
    }

    await prisma.user.delete({ where: { id } });
    return ok(res, { id });
  })
);
