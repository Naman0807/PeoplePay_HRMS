import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { Router } from "express";
import { ah } from "../lib/async";
import { prisma } from "../lib/prisma";
import { badRequest, conflict, notFound, ok, unauthorized } from "../lib/response";
import { parseId, requireFields } from "../lib/validate";
import { requireAuth, signToken } from "../middleware/auth";

export const authRoutes = Router();

/** The user object both endpoints return — shape fixed in AGENT.md §4. */
const publicUser = (u: {
  id: number;
  name: string;
  login: string;
  role: string;
  employee_id: number | null;
}) => ({ id: u.id, name: u.name, login: u.login, role: u.role, employee_id: u.employee_id });

authRoutes.post(
  "/login",
  ah(async (req, res) => {
    requireFields(req.body, ["login", "password"]);

    const user = await prisma.user.findUnique({ where: { login: String(req.body.login) } });
    // Same message whether the login is unknown or the password is wrong — no account enumeration.
    const valid = user && (await bcrypt.compare(String(req.body.password), user.password_hash));
    if (!user || !valid) throw unauthorized("Incorrect login or password.");
    if (user.status !== "ACTIVE") throw unauthorized("This account is inactive.");

    const token = signToken({ user_id: user.id, role: user.role, employee_id: user.employee_id });
    return ok(res, { token, user: publicUser(user) });
  })
);

/**
 * Self-service signup. New accounts are always role EMPLOYEE — there is no path here
 * to hand yourself HR/payroll access. employee_id is optional and unvalidated against
 * the employees table by design: linking an account to an employee record is HR's
 * job, not something a signup form can prove. Until that link exists, self-service
 * screens that require employee_id (Time Off, Attendance clock-in) won't work for
 * this account — that's a real gap, not something this endpoint pretends to solve.
 */
authRoutes.post(
  "/signup",
  ah(async (req, res) => {
    requireFields(req.body, ["name", "login", "password"]);

    const password = String(req.body.password);
    if (password.length < 8) {
      throw badRequest("Password too short.", [
        { field: "password", issue: "Must be at least 8 characters." },
      ]);
    }

    const employee_id =
      req.body.employee_id !== undefined && req.body.employee_id !== null && req.body.employee_id !== ""
        ? parseId(req.body.employee_id, "employee_id")
        : null;

    if (employee_id !== null) {
      // employee_id is a real FK (onDelete: SetNull) — an id that doesn't exist would
      // otherwise surface as an uncaught constraint violation (500), not a clean 400.
      const employee = await prisma.employee.findUnique({ where: { id: employee_id } });
      if (!employee) throw notFound("Employee");

      // Nothing in the schema stops two accounts from claiming the same employee_id —
      // without this check, anyone signing up could self-service as someone else's
      // employee (their own attendance clock-in, their own leave requests). One
      // employee, one account.
      const alreadyLinked = await prisma.user.findFirst({ where: { employee_id } });
      if (alreadyLinked) {
        throw conflict("EMPLOYEE_ALREADY_LINKED", "This employee already has an account.", [
          { field: "employee_id", issue: "Already linked to another user." },
        ]);
      }
    }

    const password_hash = await bcrypt.hash(password, 10);

    const user = await prisma.user
      .create({
        data: {
          name: String(req.body.name),
          login: String(req.body.login),
          password_hash,
          role: "EMPLOYEE",
          employee_id,
        },
      })
      .catch((err) => {
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
          throw conflict("DUPLICATE_LOGIN", "An account with this login already exists.", [
            { field: "login", issue: "Already in use." },
          ]);
        }
        throw err;
      });

    const token = signToken({ user_id: user.id, role: user.role, employee_id: user.employee_id });
    return ok(res, { token, user: publicUser(user) }, 201);
  })
);

authRoutes.get(
  "/me",
  requireAuth,
  ah(async (req, res) => {
    const user = await prisma.user.findUnique({ where: { id: req.user!.user_id } });
    if (!user) throw unauthorized("Account no longer exists.");
    return ok(res, publicUser(user));
  })
);
