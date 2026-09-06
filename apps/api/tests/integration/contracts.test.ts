import { beforeEach, describe, expect, it } from 'vitest';
import {
  api,
  bearer,
  createContract,
  isDatabaseReady,
  loginAs,
  resetDatabase,
  seedBaseWorld,
} from '../setup';

const dbReady = await isDatabaseReady();

describe.skipIf(!dbReady)('/api/contracts', () => {
  let world: Awaited<ReturnType<typeof seedBaseWorld>>;
  let adminToken: string;
  let employeeToken: string;

  const payload = (over: Record<string, unknown> = {}) => ({
    employee_id: world.staff.employee.id,
    name: 'Permanent contract',
    start_date: '2025-01-01',
    end_date: '2025-12-31',
    wage: 5000,
    salary_structure_id: world.structure.id,
    working_schedule_id: world.schedule.id,
    status: 'RUNNING',
    ...over,
  });

  beforeEach(async () => {
    await resetDatabase();
    world = await seedBaseWorld();
    adminToken = (await loginAs('admin@peoplepay360.com')).accessToken;
    employeeToken = (await loginAs('employee@peoplepay360.com')).accessToken;
  });

  it('creates a valid contract', async () => {
    const res = await api().post('/api/contracts').set(bearer(adminToken)).send(payload());

    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('RUNNING');
    expect(Number(res.body.data.wage)).toBe(5000);
  });

  it('rejects an overlapping RUNNING contract with 400 CONTRACT_OVERLAP', async () => {
    await createContract({
      employeeId: world.staff.employee.id,
      salaryStructureId: world.structure.id,
      scheduleId: world.schedule.id,
      startDate: '2025-01-01',
      endDate: '2025-12-31',
    });

    const res = await api()
      .post('/api/contracts')
      .set(bearer(adminToken))
      .send(payload({ start_date: '2025-06-01', end_date: '2026-06-01' }));

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('CONTRACT_OVERLAP');
  });

  it('accepts a contract that starts after the previous one ends', async () => {
    await createContract({
      employeeId: world.staff.employee.id,
      salaryStructureId: world.structure.id,
      scheduleId: world.schedule.id,
      startDate: '2024-01-01',
      endDate: '2024-12-31',
    });

    const res = await api().post('/api/contracts').set(bearer(adminToken)).send(payload());

    expect(res.status).toBe(201);
  });

  it('allows an overlapping DRAFT contract', async () => {
    await createContract({
      employeeId: world.staff.employee.id,
      salaryStructureId: world.structure.id,
      scheduleId: world.schedule.id,
      startDate: '2025-01-01',
      endDate: '2025-12-31',
      status: 'DRAFT',
    });

    const res = await api().post('/api/contracts').set(bearer(adminToken)).send(payload());

    expect(res.status).toBe(201);
  });

  it('rejects end_date before start_date with 400', async () => {
    const res = await api()
      .post('/api/contracts')
      .set(bearer(adminToken))
      .send(payload({ start_date: '2025-12-31', end_date: '2025-01-01' }));

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('forbids an EMPLOYEE from managing contracts', async () => {
    const res = await api().post('/api/contracts').set(bearer(employeeToken)).send(payload());

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('INSUFFICIENT_PERMISSIONS');
  });

  it('lists contracts filtered by employee', async () => {
    await createContract({
      employeeId: world.staff.employee.id,
      salaryStructureId: world.structure.id,
      scheduleId: world.schedule.id,
    });

    const res = await api()
      .get(`/api/contracts?employeeId=${world.staff.employee.id}`)
      .set(bearer(adminToken));

    expect(res.status).toBe(200);
    expect(res.body.data.items).toHaveLength(1);
    expect(res.body.data.meta.total).toBe(1);
  });

  it('does not report a contract as overlapping itself on update', async () => {
    const contract = await createContract({
      employeeId: world.staff.employee.id,
      salaryStructureId: world.structure.id,
      scheduleId: world.schedule.id,
      startDate: '2025-01-01',
      endDate: '2025-12-31',
    });

    const res = await api()
      .patch(`/api/contracts/${contract.id}`)
      .set(bearer(adminToken))
      .send({ wage: 6000 });

    expect(res.status).toBe(200);
    expect(Number(res.body.data.wage)).toBe(6000);
  });
});
