import "dotenv/config";
import cors from "cors";
import express from "express";
import { errorHandler, notFoundHandler } from "./middleware/error";
import { ok } from "./lib/response";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => ok(res, { status: "up" }));

// Routes mount here as they land: auth, employees, contracts, attendances,
// leave-requests, payruns, payslips, dashboard.

app.use(notFoundHandler);
app.use(errorHandler);

const port = Number(process.env.PORT) || 4000;
app.listen(port, () => console.log(`backend listening on http://localhost:${port}`));
