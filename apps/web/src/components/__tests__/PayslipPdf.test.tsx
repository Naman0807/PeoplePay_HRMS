// @vitest-environment node
import { renderToBuffer } from '@react-pdf/renderer';
import { describe, expect, it } from 'vitest';

import PayslipPdf, { type PdfPayslip } from '@/src/components/payslip/PayslipPdf';

const payslip = {
  id: 'payslip-1',
  payrun_id: 'payrun-1',
  employee_id: 'emp-1',
  contract_id: 'contract-1',
  basic_amount: 5000,
  gross_amount: 5500,
  deduction_amount: 275,
  net_amount: 5225,
  worked_days: 22,
  status: 'PAID',
  warnings: null,
  payrun: {
    id: 'payrun-1',
    name: 'January 2025',
    period_start: '2025-01-01',
    period_end: '2025-01-31',
    status: 'PAID',
  },
  employee: {
    id: 'emp-1',
    first_name: 'Ada',
    last_name: 'Lovelace',
    email: 'ada@peoplepay360.com',
    job_position: 'Engineer',
  },
  lines: [
    { id: 'l1', payslip_id: 'payslip-1', salary_rule_id: 'r1', code: 'BASIC', category: 'BASIC', rate: 0, amount: 5000 },
    { id: 'l2', payslip_id: 'payslip-1', salary_rule_id: 'r2', code: 'ALW-HOUSING', category: 'ALLOWANCE', rate: 10, amount: 500 },
    { id: 'l3', payslip_id: 'payslip-1', salary_rule_id: 'r3', code: 'GROSS', category: 'GROSS', rate: 0, amount: 5500 },
    { id: 'l4', payslip_id: 'payslip-1', salary_rule_id: 'r4', code: 'TAX-INCOME', category: 'DEDUCTION', rate: 5, amount: 275 },
    { id: 'l5', payslip_id: 'payslip-1', salary_rule_id: 'r5', code: 'NET', category: 'NET', rate: 0, amount: 5225 },
  ],
} as unknown as PdfPayslip;

/** Rendering through the real PDF renderer is the only way to prove the document is valid. */
describe('payslip PDF', () => {
  it('renders a complete payslip to a PDF document', async () => {
    const buffer = await renderToBuffer(<PayslipPdf payslip={payslip} />);

    expect(buffer.length).toBeGreaterThan(1000);
    expect(buffer.subarray(0, 5).toString()).toBe('%PDF-');
  }, 30_000);

  it('renders a payslip that has no lines yet', async () => {
    const buffer = await renderToBuffer(
      <PayslipPdf payslip={{ ...payslip, lines: [] } as PdfPayslip} />
    );

    expect(buffer.subarray(0, 5).toString()).toBe('%PDF-');
  }, 30_000);

  it('renders when the payrun and employee details are missing', async () => {
    const bare = { ...payslip, payrun: undefined, employee: undefined } as PdfPayslip;

    const buffer = await renderToBuffer(<PayslipPdf payslip={bare} />);

    expect(buffer.subarray(0, 5).toString()).toBe('%PDF-');
  }, 30_000);
});
