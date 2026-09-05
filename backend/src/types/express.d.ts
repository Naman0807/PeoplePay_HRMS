import type { Role } from "@prisma/client";

declare global {
  namespace Express {
    interface Request {
      /** Set by requireAuth from the verified JWT. */
      user?: { user_id: number; role: Role; employee_id: number | null };
    }
  }
}

export {};
