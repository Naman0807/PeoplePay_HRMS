import { Router } from "express";
import PDFDocument from "pdfkit";
import { ah } from "../lib/async";
import { prisma } from "../lib/prisma";
import { notFound, ok } from "../lib/response";
import { parseId } from "../lib/validate";
import { requireAuth } from "../middleware/auth";
import { assertSelfOrPrivileged } from "../lib/rbac";

export const payslipRoutes = Router();

payslipRoutes.use(requireAuth);

const payslipInclude = {
  employee: true,
  contract: true,
  structure: true,
  payrun: true,
  // sequence order is data — the payslip screen renders this array as it arrives.
  line_ids: { orderBy: { sequence: "asc" } },
} as const;

const money = (value: unknown) => Number(value ?? 0).toFixed(2);

payslipRoutes.get(
  "/:id",
  ah(async (req, res) => {
    const payslip = await prisma.payslip.findUnique({
      where: { id: parseId(req.params.id) },
      include: payslipInclude,
    });
    if (!payslip) throw notFound("Payslip");
    // Without this an employee can read any colleague's salary by guessing an id.
    assertSelfOrPrivileged(req, payslip.employee_id);
    return ok(res, payslip);
  })
);

payslipRoutes.get(
  "/:id/pdf",
  ah(async (req, res) => {
    const payslip = await prisma.payslip.findUnique({
      where: { id: parseId(req.params.id) },
      include: payslipInclude,
    });
    if (!payslip) throw notFound("Payslip");
    assertSelfOrPrivileged(req, payslip.employee_id);

    const period = `${payslip.date_from.toISOString().slice(0, 10)} to ${payslip.date_to
      .toISOString()
      .slice(0, 10)}`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="payslip-${payslip.id}.pdf"`);

    const doc = new PDFDocument({ size: "A4", margin: 50 });
    doc.pipe(res);

    doc.fontSize(18).text("PeoplePay360 — Payslip", { align: "left" });
    doc.moveDown(0.4);
    doc.fontSize(10);
    doc.text(`Employee:  ${payslip.employee.name}`);
    doc.text(`Contract:  ${payslip.contract.reference}`);
    doc.text(`Structure: ${payslip.structure.name}`);
    doc.text(`Period:    ${period}`);
    doc.text(`Worked days: ${payslip.worked_days ?? "-"}`);
    if (payslip.warning_code) doc.text(`Warning:   ${payslip.warning_code}`);
    doc.moveDown(0.8);

    // The same rule-by-rule breakdown the screen shows — in sequence order, from
    // payslip_lines. Nothing here is recomputed for the PDF.
    const [colSeq, colCode, colName, colAmount] = [50, 100, 180, 430];
    doc.fontSize(10).text("Seq", colSeq, doc.y);
    const headerY = doc.y - doc.currentLineHeight();
    doc.text("Code", colCode, headerY);
    doc.text("Rule", colName, headerY);
    doc.text("Amount", colAmount, headerY, { width: 110, align: "right" });
    doc.moveTo(50, doc.y + 2).lineTo(545, doc.y + 2).stroke();
    doc.moveDown(0.5);

    for (const line of payslip.line_ids) {
      const y = doc.y;
      doc.text(String(line.sequence), colSeq, y);
      doc.text(line.rule_code, colCode, y);
      doc.text(line.rule_name, colName, y);
      doc.text(money(line.amount), colAmount, y, { width: 110, align: "right" });
      doc.moveDown(0.3);
    }

    doc.moveTo(50, doc.y + 2).lineTo(545, doc.y + 2).stroke();
    doc.moveDown(0.6);
    doc.fontSize(11);
    doc.text("Gross", colName, doc.y);
    doc.text(money(payslip.gross_amount), colAmount, doc.y - doc.currentLineHeight(), { width: 110, align: "right" });
    doc.text("Net", colName, doc.y);
    doc.text(money(payslip.net_amount), colAmount, doc.y - doc.currentLineHeight(), { width: 110, align: "right" });

    doc.end();
  })
);
