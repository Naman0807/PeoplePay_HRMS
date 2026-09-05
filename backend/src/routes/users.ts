import { Router } from "express";
import bcrypt from "bcryptjs";
import { Prisma, Role } from "@prisma/client";
import { ah } from "../lib/async";
import { prisma } from "../lib/prisma";
import { badRequest, conflict, forbidden, notFound, ok, okList, paging } from "../lib/response";
import { parseId, parseOneOf, requireFields } from "../lib/validate";
import { requireAuth, requireRole } from "../middleware/auth";

/**
 * User and role administration (problem statement: the Admin role covers "user
 * management, role assignment, permission updates").
 *
 * Until this existed, only the five seeded logins could sign in — hiring someone
 * through the Employees screen produced an employee record with no way to log in.
 */

export const userRoutes = Router();

userRoutes.use(requireAuth);

const ROLES = [
  "EMPLOYEE",
  "HR_MANAGER",
  "HR_PAYROLL_USER",
  "HR_PAYROLL_MANAGER",
  "ADMIN",
] as const;
const STATUSES = ["ACTIVE", "INACTIVE"] as const;
const MIN_PASSWORD = 8;

/** Never return password_hash, whatever the caller's role. */
const publicUser = (u: {
  id: number;
  name: string;
  login: string;
  role: Role;
  status: string;
  employee_id: number | null;
  created_at: Date;
}) => ({
  id: u.id,
  name: u.name,
  login: u.login,
  role: u.role,
  status: u.status,
  employee_id: u.employee_id,
  created_at: u.created_at,
});

function assertPassword(value: unknown) {
  const password = String(value ?? "");
  if (password.length < MIN_PASSWORD) {
    throw badRequest("Password is too short.", [
      { field: "password", issue: `At least ${MIN_PASSWORD} characters.` },
    ]);
  }
  return password;
}

/**
 * Anyone may change their own password, and must prove they know the current one.
 * Declared before the admin gate below so it stays reachable by every role.
 */
userRoutes.patch(
  "/me/password",
  ah(async (req, res) => {
    requireFields(req.body, ["current_password", "new_password"]);

    const user = await prisma.user.findUnique({ where: { id: req.user!.user_id } });
    if (!user) throw notFound("User");

    const valid = await bcrypt.compare(String(req.body.current_password), user.password_hash);
    if (!valid) {
      throw forbidden("Current password is incorrect.");
    }

    const password_hash = await bcrypt.hash(assertPassword(req.body.new_password), 10);
    await prisma.user.update({ where: { id: user.id }, data: { password_hash } });

    return ok(res, { id: user.id, password_changed: true });
  })
);

// Everything below is administration.
userRoutes.use(requireRole("ADMIN"));

userRoutes.get(
  "/",
  ah(async (req, res) => {
    const { page, limit, skip, take } = paging(req);
    const where: Prisma.UserWhereInput = {
      ...(req.query.role ? { role: parseOneOf(req.query.role, ROLES, "role") } : {}),
      ...(req.query.status ? { status: parseOneOf(req.query.status, STATUSES, "status") } : {}),
    };

    const [rows, total_records] = await Promise.all([
      prisma.user.findMany({ where, skip, take, orderBy: { id: "asc" } }),
      prisma.user.count({ where }),
    ]);

    return okList(res, rows.map(publicUser), { page, limit, total_records });
  })
);

userRoutes.get(
  "/:id",
  ah(async (req, res) => {
    const user = await prisma.user.findUnique({ where: { id: parseId(req.params.id) } });
    if (!user) throw notFound("User");
    return ok(res, publicUser(user));
  })
);

userRoutes.post(
  "/",
  ah(async (req, res) => {
    requireFields(req.body, ["name", "login", "password", "role"]);
    const password_hash = await bcrypt.hash(assertPassword(req.body.password), 10);

    let employee_id: number | null = null;
    if (req.body.employee_id) {
      employee_id = parseId(req.body.employee_id, "employee_id");
      const employee = await prisma.employee.findUnique({ where: { id: employee_id } });
      if (!employee) throw notFound("Employee");
    }

    const user = await prisma.user
      .create({
        data: {
          name: String(req.body.name),
          login: String(req.body.login),
          password_hash,
          role: parseOneOf(req.body.role, ROLES, "role") as Role,
          employee_id,
        },
      })
      .catch((err) => {
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
          throw conflict("DUPLICATE_LOGIN", "That login is already taken.", [
            { field: "login", issue: "Already in use." },
          ]);
        }
        throw err;
      });

    return ok(res, publicUser(user), 201);
  })
);

userRoutes.patch(
  "/:id",
  ah(async (req, res) => {
    const id = parseId(req.params.id);
    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) throw notFound("User");

    // Locking yourself out, or demoting the last admin, leaves nobody able to fix it.
    const removingOwnAdmin =
      id === req.user!.user_id &&
      ((req.body.role !== undefined && req.body.role !== "ADMIN") ||
        req.body.status === "INACTIVE");
    if (removingOwnAdmin) {
      throw badRequest("You cannot remove your own administrator access.", [
        { field: "role", issue: "Ask another administrator to make this change." },
      ]);
    }

    if (existing.role === "ADMIN" && req.body.role !== undefined && req.body.role !== "ADMIN") {
      const admins = await prisma.user.count({ where: { role: "ADMIN", status: "ACTIVE" } });
      if (admins <= 1) {
        throw conflict("LAST_ADMIN", "This is the only active administrator.", [
          { field: "role", issue: "Promote another user to ADMIN first." },
        ]);
      }
    }

    const data: Prisma.UserUpdateInput = {};
    if (req.body.name !== undefined) data.name = String(req.body.name);
    if (req.body.role !== undefined) data.role = parseOneOf(req.body.role, ROLES, "role") as Role;
    if (req.body.status !== undefined) {
      data.status = parseOneOf(req.body.status, STATUSES, "status");
    }
    if (req.body.password !== undefined) {
      data.password_hash = await bcrypt.hash(assertPassword(req.body.password), 10);
    }
    if (req.body.employee_id !== undefined) {
      data.employee = req.body.employee_id
        ? { connect: { id: parseId(req.body.employee_id, "employee_id") } }
        : { disconnect: true };
    }

    return ok(res, publicUser(await prisma.user.update({ where: { id }, data })));
  })
);
