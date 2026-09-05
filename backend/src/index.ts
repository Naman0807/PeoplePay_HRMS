import "dotenv/config";
import cors from "cors";
import express from "express";
import { errorHandler, notFoundHandler } from "./middleware/error";
import { ok } from "./lib/response";
import { authRoutes } from "./routes/auth";
import { employeeRoutes } from "./routes/employees";
import { contractRoutes, employeeContractRoutes } from "./routes/contracts";
import { payrunRoutes } from "./routes/payruns";
import { payslipRoutes } from "./routes/payslips";

export const app = express();

app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => ok(res, { status: "up" }));

app.use("/api/auth", authRoutes);
app.use("/api/employees", employeeRoutes);
app.use("/api/employees/:id/contracts", employeeContractRoutes);
app.use("/api/contracts", contractRoutes);
app.use("/api/payruns", payrunRoutes);
app.use("/api/payslips", payslipRoutes);

// Still to mount: attendances, leave-requests, dashboard.

app.use(notFoundHandler);
app.use(errorHandler);

// Only listen when run directly, so tests can import the app without binding a port.
if (require.main === module) {
  const port = Number(process.env.PORT) || 4000;
  app.listen(port, () => console.log(`backend listening on http://localhost:${port}`));
}
