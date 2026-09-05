import { beforeEach, describe, expect, it } from 'vitest';
import {
  api,
  bearer,
  createContract,
  isDatabaseReady,
  loginAs,
  prisma,
  resetDatabase,
  seedBaseWorld,
} from '../setup';

const dbReady = await isDatabaseReady();

describe.skipIf(!dbReady)('payrun wizard', () => {
  let world: Awaited<ReturnType<typeof seedBaseWorld>>;
  let adminToken: string;
  let employeeToken: string;

  async function createPayrun(over: Record<string, unknown> = {}) {
    return api()
      .post('/api/payruns')
      .set(bearer(adminToken))
      .send({
        name: 'January 2025',
        salary_structure_id: world.structure.id,
        period_start: '2025-01-01',
        period_end: '2025-01-31',
        ...over,
      });
  }

  beforeEach(async () => {
    await resetDatabase();
    world = await seedBaseWorld();
    adminToken = (await loginAs('admin@peoplepay360.com')).accessToken;
    employeeToken = (await loginAs('employee@peoplepay360.com')).accessToken;

    // Open-ended RUNNING contract so the employee is eligible for the period.
    await createContract({
      employeeId: world.staff.employee.id,
      salaryStructureId: world.structure.id,
      scheduleId: world.schedule.id,
      startDate: '2024-01-01',
      endDate: null,
      wage: 5000,
    });
  });

  it('runs the full wizard and produces the seed payslip vector', async () => {
    const payrun = await createPayrun();
    expect(payrun.status).toBe(201);
    expect(payrun.body.data.status).toBe('DRAFT');
    const payrunId = payrun.body.data.id;

    const eligible = await api()
      .get(`/api/payruns/${payrunId}/eligible-employees`)
      .set(bearer(adminToken));
    expect(eligible.status).toBe(200);
    expect(eligible.body.data).toHaveLength(1);
    expect(eligible.body.data[0].employee.id).toBe(world.staff.employee.id);

    const selected = await api()
      .post(`/api/payruns/${payrunId}/select-employees`)
      .set(bearer(adminToken))
      .send({ employee_ids: [world.staff.employee.id] });
    expect(selected.status).toBe(200);

    const computed = await api().post(`/api/payruns/${payrunId}/compute`).set(bearer(adminToken));
    expect(computed.status).toBe(200);
    expect(computed.body.data.payrun.status).toBe('COMPUTED');
    expect(computed.body.data.summary.totalNet).toBe(5225);

    const payslips = await api().get(`/api/payruns/${payrunId}/payslips`).set(bearer(adminToken));
    expect(payslips.status).toBe(200);
    expect(payslips.body.data).toHaveLength(1);

    const payslip = payslips.body.data[0];
    expect(Number(payslip.basic_amount)).toBe(5000);
    expect(Number(payslip.gross_amount)).toBe(5500);
    expect(Number(payslip.deduction_amount)).toBe(275);
    expect(Number(payslip.net_amount)).toBe(5225);
    expect(payslip.warnings).toBeNull();

    expect(payslip.lines.map((line: { code: string }) => line.code)).toEqual([
      'BASIC',
      'ALW-HOUSING',
      'GROSS',
      'TAX-INCOME',
      'NET',
    ]);
    expect(payslip.lines.map((line: { amount: string }) => Number(line.amount))).toEqual([
      5000, 500, 5500, 275, 5225,
    ]);

    const validated = await api().post(`/api/payruns/${payrunId}/validate`).set(bearer(adminToken));
    expect(validated.status).toBe(200);
    expect(validated.body.data.status).toBe('VALIDATED');

    const paid = await api().post(`/api/payruns/${payrunId}/mark-paid`).set(bearer(adminToken));
    expect(paid.status).toBe(200);
    expect(paid.body.data.status).toBe('PAID');

    const finalPayslip = await prisma.payslip.findFirstOrThrow({ where: { payrun_id: payrunId } });
    expect(finalPayslip.status).toBe('PAID');

    const payrunEmployee = await prisma.payrunEmployee.findFirstOrThrow({
      where: { payrun_id: payrunId },
    });
    expect(payrunEmployee.status).toBe('PAID');
    expect(Number(payrunEmployee.net_salary)).toBe(5225);
  });

  it('recomputes idempotently instead of duplicating payslips', async () => {
    const payrunId = (await createPayrun()).body.data.id;
    await api()
      .post(`/api/payruns/${payrunId}/select-employees`)
      .set(bearer(adminToken))
      .send({ employee_ids: [world.staff.employee.id] });

    await api().post(`/api/payruns/${payrunId}/compute`).set(bearer(adminToken));
    const second = await api().post(`/api/payruns/${payrunId}/compute`).set(bearer(adminToken));

    expect(second.status).toBe(200);
    expect(await prisma.payslip.count({ where: { payrun_id: payrunId } })).toBe(1);
    expect(await prisma.payslipLine.count()).toBe(5);
  });

  it('refuses to compute a payrun with no selected employee', async () => {
    const payrunId = (await createPayrun()).body.data.id;

    const res = await api().post(`/api/payruns/${payrunId}/compute`).set(bearer(adminToken));

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('NO_EMPLOYEES');
  });

  it('refuses to validate a payrun that is still DRAFT', async () => {
    const payrunId = (await createPayrun()).body.data.id;
    await api()
      .post(`/api/payruns/${payrunId}/select-employees`)
      .set(bearer(adminToken))
      .send({ employee_ids: [world.staff.employee.id] });

    const res = await api().post(`/api/payruns/${payrunId}/validate`).set(bearer(adminToken));

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('INVALID_STATUS');
  });

  it('refuses to mark a payrun paid before it is validated', async () => {
    const payrunId = (await createPayrun()).body.data.id;
    await api()
      .post(`/api/payruns/${payrunId}/select-employees`)
      .set(bearer(adminToken))
      .send({ employee_ids: [world.staff.employee.id] });
    await api().post(`/api/payruns/${payrunId}/compute`).set(bearer(adminToken));

    const res = await api().post(`/api/payruns/${payrunId}/mark-paid`).set(bearer(adminToken));

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('INVALID_STATUS');
  });

  it('refuses to recompute a validated payrun', async () => {
    const payrunId = (await createPayrun()).body.data.id;
    await api()
      .post(`/api/payruns/${payrunId}/select-employees`)
      .set(bearer(adminToken))
      .send({ employee_ids: [world.staff.employee.id] });
    await api().post(`/api/payruns/${payrunId}/compute`).set(bearer(adminToken));
    await api().post(`/api/payruns/${payrunId}/validate`).set(bearer(adminToken));

    const res = await api().post(`/api/payruns/${payrunId}/compute`).set(bearer(adminToken));

    expect(res.status).toBe(409);
  });

  it('excludes an employee whose contract does not cover the whole period', async () => {
    await prisma.contract.updateMany({ data: { start_date: new Date('2025-01-15') } });

    const payrunId = (await createPayrun()).body.data.id;
    const eligible = await api()
      .get(`/api/payruns/${payrunId}/eligible-employees`)
      .set(bearer(adminToken));

    expect(eligible.body.data).toHaveLength(0);

    const selected = await api()
      .post(`/api/payruns/${payrunId}/select-employees`)
      .set(bearer(adminToken))
      .send({ employee_ids: [world.staff.employee.id] });

    expect(selected.status).toBe(400);
    expect(selected.body.error.code).toBe('INELIGIBLE_EMPLOYEES');
  });

  it('rejects period_end before period_start with 400', async () => {
    const res = await createPayrun({ period_start: '2025-02-01', period_end: '2025-01-01' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('forbids an EMPLOYEE from reaching the payrun endpoints', async () => {
    const list = await api().get('/api/payruns').set(bearer(employeeToken));
    expect(list.status).toBe(403);

    const create = await api()
      .post('/api/payruns')
      .set(bearer(employeeToken))
      .send({
        name: 'January 2025',
        salary_structure_id: world.structure.id,
        period_start: '2025-01-01',
        period_end: '2025-01-31',
      });
    expect(create.status).toBe(403);
    expect(create.body.error.code).toBe('INSUFFICIENT_PERMISSIONS');
  });

  it('reports a payrun computed against a broken formula as 400', async () => {
    await prisma.salaryRule.updateMany({
      where: { code: 'GROSS' },
      data: { formula_string: 'BASIC + BONUS' },
    });

    const payrunId = (await createPayrun()).body.data.id;
    await api()
      .post(`/api/payruns/${payrunId}/select-employees`)
      .set(bearer(adminToken))
      .send({ employee_ids: [world.staff.employee.id] });

    const res = await api().post(`/api/payruns/${payrunId}/compute`).set(bearer(adminToken));

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_FORMULA');
    expect(res.body.error.message).toMatch(/Unknown reference "BONUS"/);
  });
});

describe.skipIf(!dbReady)('/api/payslips', () => {
  let world: Awaited<ReturnType<typeof seedBaseWorld>>;
  let adminToken: string;
  let employeeToken: string;

  beforeEach(async () => {
    await resetDatabase();
    world = await seedBaseWorld();
    adminToken = (await loginAs('admin@peoplepay360.com')).accessToken;
    employeeToken = (await loginAs('employee@peoplepay360.com')).accessToken;

    await createContract({
      employeeId: world.staff.employee.id,
      salaryStructureId: world.structure.id,
      scheduleId: world.schedule.id,
      startDate: '2024-01-01',
      endDate: null,
    });

    const payrunId = (
      await api()
        .post('/api/payruns')
        .set(bearer(adminToken))
        .send({
          name: 'January 2025',
          salary_structure_id: world.structure.id,
          period_start: '2025-01-01',
          period_end: '2025-01-31',
        })
    ).body.data.id;

    await api()
      .post(`/api/payruns/${payrunId}/select-employees`)
      .set(bearer(adminToken))
      .send({ employee_ids: [world.staff.employee.id] });
    await api().post(`/api/payruns/${payrunId}/compute`).set(bearer(adminToken));
  });

  it('lets an employee read their own payslip', async () => {
    const res = await api().get('/api/payslips').set(bearer(employeeToken));

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(Number(res.body.data[0].net_amount)).toBe(5225);
  });

  it('returns the payslip lines on the detail endpoint', async () => {
    const list = await api().get('/api/payslips').set(bearer(adminToken));
    const res = await api().get(`/api/payslips/${list.body.data[0].id}`).set(bearer(adminToken));

    expect(res.status).toBe(200);
    expect(res.body.data.lines).toHaveLength(5);
  });
});
