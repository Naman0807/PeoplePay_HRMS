import bcrypt from "bcryptjs";
import { Router } from "express";
import { ah } from "../lib/async";
import { prisma } from "../lib/prisma";
import { ok, unauthorized } from "../lib/response";
import { requireFields } from "../lib/validate";
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

authRoutes.get(
  "/me",
  requireAuth,
  ah(async (req, res) => {
    const user = await prisma.user.findUnique({ where: { id: req.user!.user_id } });
    if (!user) throw unauthorized("Account no longer exists.");
    return ok(res, publicUser(user));
  })
);
