import { prisma } from '../../lib/prisma';
import { utcDayStart } from '../../utils/dates';

export async function getKpis() {
  const today = utcDayStart();

  const [
    totalEmployees,
    activeEmployees,
    activeContracts,
    pendingTimeOffRequests,
    attendanceExceptionsToday,
    paidAgg,
    latestPayrun,
  ] = await Promise.all([
    prisma.employee.count(),
    prisma.employee.count({ where: { status: 'ACTIVE' } }),
    prisma.contract.count({ where: { status: 'RUNNING' } }),
    prisma.timeOffRequest.count({ where: { status: 'SUBMITTED' } }),
    prisma.attendance.count({
      where: { status: 'EXCEPTION', date: today },
    }),
    prisma.payslip.aggregate({
      _sum: { net_amount: true },
      where: { status: 'PAID' },
    }),
    prisma.payrun.findFirst({
      orderBy: { period_end: 'desc' },
      select: { status: true },
    }),
  ]);

  return {
    totalEmployees,
    activeEmployees,
    activeContracts,
    pendingTimeOffRequests,
    attendanceExceptionsToday,
    totalNetPaid: paidAgg._sum.net_amount ?? 0,
    latestPayrunStatus: latestPayrun?.status ?? null,
  };
}

export async function getAttendanceChart(days = 30) {
  const activeCount = await prisma.employee.count({
    where: { status: 'ACTIVE' },
  });

  const result: { date: string; present: number; absent: number; exception: number }[] = [];
  const today = utcDayStart();

  for (let i = days - 1; i >= 0; i--) {
    // UTC arithmetic: `today` is midnight UTC, matching the @db.Date column.
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() - i);

    const nextDay = new Date(d);
    nextDay.setUTCDate(nextDay.getUTCDate() + 1);

    const grouped = await prisma.attendance.groupBy({
      by: ['status'],
      _count: { id: true },
      where: {
        date: { gte: d, lt: nextDay },
      },
    });

    let present = 0;
    let exception = 0;
    for (const g of grouped) {
      if (g.status === 'NORMAL' || g.status === 'MANUALLY_EDITED') {
        present += g._count.id;
      } else if (g.status === 'EXCEPTION') {
        exception += g._count.id;
      }
    }

    const absent = Math.max(activeCount - present, 0);
    const dateStr = d.toISOString().split('T')[0];
    result.push({ date: dateStr, present, absent, exception });
  }

  return result;
}

export async function getDepartmentChart() {
  const employees = await prisma.employee.findMany({
    select: { department_id: true },
    where: { status: 'ACTIVE' },
  });

  const deptMap = new Map<string, number>();
  for (const e of employees) {
    if (e.department_id) {
      deptMap.set(e.department_id, (deptMap.get(e.department_id) ?? 0) + 1);
    }
  }

  if (deptMap.size === 0) return [];

  const departments = await prisma.department.findMany({
    where: { id: { in: Array.from(deptMap.keys()) } },
    select: { id: true, name: true },
  });

  const nameMap = new Map(departments.map((d) => [d.id, d.name]));

  return Array.from(deptMap.entries()).map(([id, count]) => ({
    department: nameMap.get(id) ?? 'Unknown',
    count,
  }));
}

export async function getPayrollChart() {
  const payruns = await prisma.payrun.findMany({
    orderBy: { period_end: 'desc' },
    select: {
      id: true,
      period_end: true,
      payslips: {
        select: { net_amount: true },
      },
    },
  });

  return payruns.map((p) => ({
    payrunName: p.id,
    periodEnd: p.period_end,
    netTotal: p.payslips.reduce((sum, ps) => sum + ps.net_amount.toNumber(), 0),
  }));
}
