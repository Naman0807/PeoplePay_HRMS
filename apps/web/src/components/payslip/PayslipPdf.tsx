'use client';

import {
  Document,
  Page,
  View,
  Text,
  StyleSheet,
} from '@react-pdf/renderer';
import type { Payslip, PayslipLine } from '@/src/lib/api/queries';

type Payrun = {
  id: string;
  name?: string;
  period_start?: string;
  period_end?: string;
  status?: string;
};

type Employee = {
  id: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  job_position?: string;
};

export type PdfPayslipLine = PayslipLine & {
  salary_rule?: { id: string; name: string; code: string };
};

export type PdfPayslip = Omit<Payslip, 'lines'> & {
  lines?: PdfPayslipLine[];
  payrun?: Payrun;
  employee?: Employee;
};

interface PayslipPdfProps {
  payslip: PdfPayslip;
}

const styles = StyleSheet.create({
  page: {
    padding: 28,
    fontSize: 10,
    fontFamily: 'Helvetica',
    color: '#1e293b',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 2,
    borderBottomColor: '#0f172a',
    paddingBottom: 12,
    marginBottom: 16,
  },
  company: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  companySub: {
    fontSize: 9,
    color: '#64748b',
    marginTop: 2,
  },
  titleBlock: {
    alignItems: 'flex-end',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  status: {
    marginTop: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: '#334155',
    color: '#334155',
    fontSize: 8,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  section: {
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoGrid: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 4,
  },
  infoBlock: {
    flex: 1,
    padding: 8,
  },
  infoLabel: {
    fontSize: 8,
    color: '#64748b',
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  infoSub: {
    fontSize: 9,
    color: '#64748b',
    marginTop: 1,
  },
  borderLeft: {
    borderLeftWidth: 1,
    borderLeftColor: '#cbd5e1',
  },
  table: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 4,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderBottomWidth: 1,
    borderBottomColor: '#cbd5e1',
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  cellLabel: {
    flex: 2,
    fontSize: 10,
    color: '#334155',
  },
  cellAmount: {
    flex: 1,
    fontSize: 10,
    color: '#334155',
    textAlign: 'right',
  },
  summary: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 12,
  },
  summaryBox: {
    width: 200,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 4,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 10,
    color: '#475569',
  },
  summaryTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#0f172a',
    backgroundColor: '#0f172a',
    borderBottomLeftRadius: 3,
    borderBottomRightRadius: 3,
  },
  summaryTotalLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  summaryTotalValue: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  footer: {
    marginTop: 24,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#cbd5e1',
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 8,
    color: '#94a3b8',
  },
  empty: {
    fontSize: 9,
    color: '#94a3b8',
    paddingVertical: 6,
  },
});

function money(value: number | string) {
  return `$${Number(value).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDateRange(start?: string, end?: string) {
  if (!start || !end) return '—';
  const fmt = (value: string) => {
    const [year, month, day] = value.slice(0, 10).split('-');
    if (!year || !month || !day) return value;
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[Number(month) - 1]} ${Number(day)}, ${year}`;
  };
  return `${fmt(start)} — ${fmt(end)}`;
}

function formatGeneratedDate() {
  const d = new Date();
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

function EarningsTable({ lines }: { lines: PdfPayslipLine[] }) {
  if (lines.length === 0) {
    return (
      <View style={styles.empty}>
        <Text>No allowances recorded this period.</Text>
      </View>
    );
  }
  return (
    <View style={styles.table}>
      <View style={styles.tableHeader}>
        <Text style={styles.cellLabel}>Earning</Text>
        <Text style={styles.cellAmount}>Amount</Text>
      </View>
      {lines.map((line) => (
        <View key={line.id} style={styles.tableRow}>
          <Text style={styles.cellLabel}>{line.salary_rule?.name ?? line.code}</Text>
          <Text style={styles.cellAmount}>{money(line.amount)}</Text>
        </View>
      ))}
    </View>
  );
}

function DeductionsTable({ lines }: { lines: PdfPayslipLine[] }) {
  if (lines.length === 0) {
    return (
      <View style={styles.empty}>
        <Text>No deductions this period.</Text>
      </View>
    );
  }
  return (
    <View style={styles.table}>
      <View style={styles.tableHeader}>
        <Text style={styles.cellLabel}>Deduction</Text>
        <Text style={styles.cellAmount}>Amount</Text>
      </View>
      {lines.map((line) => (
        <View key={line.id} style={styles.tableRow}>
          <Text style={styles.cellLabel}>{line.salary_rule?.name ?? line.code}</Text>
          <Text style={styles.cellAmount}>-{money(line.amount)}</Text>
        </View>
      ))}
    </View>
  );
}

export default function PayslipPdf({ payslip }: PayslipPdfProps) {
  const lines = payslip.lines ?? [];
  const earnings = lines.filter((line) => line.category !== 'DEDUCTION');
  const deductions = lines.filter((line) => line.category === 'DEDUCTION');
  const status = payslip.status ?? payslip.payrun?.status ?? '';

  return (
    <Document title={`Payslip - ${payslip.employee?.first_name ?? ''} ${payslip.employee?.last_name ?? ''}`}>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.company}>PeoplePay360</Text>
            <Text style={styles.companySub}>Payroll Management System</Text>
          </View>
          <View style={styles.titleBlock}>
            <Text style={styles.title}>Payslip</Text>
            {status ? <Text style={styles.status}>{status}</Text> : null}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Employee</Text>
          <View style={styles.infoGrid}>
            <View style={styles.infoBlock}>
              <Text style={styles.infoLabel}>Name</Text>
              <Text style={styles.infoValue}>
                {payslip.employee
                  ? `${payslip.employee.first_name} ${payslip.employee.last_name}`
                  : '—'}
              </Text>
            </View>
            <View style={[styles.infoBlock, styles.borderLeft]}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>{payslip.employee?.email ?? '—'}</Text>
            </View>
            <View style={[styles.infoBlock, styles.borderLeft]}>
              <Text style={styles.infoLabel}>Position</Text>
              <Text style={styles.infoValue}>
                {payslip.employee?.job_position ?? '—'}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pay Period</Text>
          <View style={styles.infoGrid}>
            <View style={styles.infoBlock}>
              <Text style={styles.infoLabel}>Period</Text>
              <Text style={styles.infoValue}>
                {formatDateRange(payslip.payrun?.period_start, payslip.payrun?.period_end)}
              </Text>
            </View>
            <View style={[styles.infoBlock, styles.borderLeft]}>
              <Text style={styles.infoLabel}>Payrun</Text>
              <Text style={styles.infoValue}>{payslip.payrun?.name ?? '—'}</Text>
            </View>
            <View style={[styles.infoBlock, styles.borderLeft]}>
              <Text style={styles.infoLabel}>Worked Days</Text>
              <Text style={styles.infoValue}>{payslip.worked_days ?? '—'}</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Earnings</Text>
          <EarningsTable lines={earnings} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Deductions</Text>
          <DeductionsTable lines={deductions} />
        </View>

        <View style={styles.summary}>
          <View style={styles.summaryBox}>
            <View style={styles.summaryRow}>
              <Text>Gross Salary</Text>
              <Text>{money(payslip.gross_amount)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text>Total Deductions</Text>
              <Text>-{money(payslip.deduction_amount)}</Text>
            </View>
            <View style={styles.summaryTotal}>
              <Text style={styles.summaryTotalLabel}>Net Pay</Text>
              <Text style={styles.summaryTotalValue}>{money(payslip.net_amount)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.footer}>
          <Text>This is a system-generated payslip.</Text>
          <Text>Generated {formatGeneratedDate()}</Text>
        </View>
      </Page>
    </Document>
  );
}
