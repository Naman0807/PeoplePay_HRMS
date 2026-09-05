import { beforeEach, describe, expect, it } from 'vitest';
import {
  api,
  bearer,
  isDatabaseReady,
  loginAs,
  prisma,
  resetDatabase,
  seedBaseWorld,
} from '../setup';

const dbReady = await isDatabaseReady();

describe.skipIf(!dbReady)('/api/time-off/requests', () => {
  let world: Awaited<ReturnType<typeof seedBaseWorld>>;
  let adminToken: string;
  let employeeToken: string;
  let paidLeaveId: string;
  let unpaidLeaveId: string;

  async function allocate(units: number, taken = 0) {
    return prisma.timeOffAllocation.create({
      data: {
        employee_id: world.staff.employee.id,
        time_off_type_id: paidLeaveId,
        allocated_units: units,
        taken_units: taken,
        valid_from: new Date('2025-01-01'),
        valid_to: new Date('2025-12-31'),
        status: 'APPROVED',
      },
    });
  }

  async function createRequest(body: Record<string, unknown>) {
    return api().post('/api/time-off/requests').set(bearer(employeeToken)).send({
      employee_id: world.staff.employee.id,
      time_off_type_id: paidLeaveId,
      ...body,
    });
  }

  beforeEach(async () => {
    await resetDatabase();
    world = await seedBaseWorld();
    adminToken = (await loginAs('admin@peoplepay360.com')).accessToken;
    employeeToken = (await loginAs('employee@peoplepay360.com')).accessToken;

    paidLeaveId = (
      await prisma.timeOffType.create({
        data: { name: 'Paid Time Off', unit: 'DAYS', requires_allocation: true },
      })
    ).id;
    unpaidLeaveId = (
      await prisma.timeOffType.create({
        data: { name: 'Unpaid Leave', unit: 'DAYS', requires_allocation: false },
      })
    ).id;
  });

  it('creates a DRAFT request with the inclusive duration', async () => {
    await allocate(20);

    const res = await createRequest({ start_date: '2025-03-10', end_date: '2025-03-14' });

    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('DRAFT');
    expect(Number(res.body.data.duration)).toBe(5);
  });

  it('submits a request that fits inside the balance', async () => {
    await allocate(20);
    const created = await createRequest({ start_date: '2025-03-10', end_date: '2025-03-14' });

    const res = await api()
      .post(`/api/time-off/requests/${created.body.data.id}/submit`)
      .set(bearer(employeeToken));

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('SUBMITTED');
  });

  it('rejects a submit that exceeds the balance with 400', async () => {
    await allocate(2);
    const created = await createRequest({ start_date: '2025-03-10', end_date: '2025-03-14' });

    const res = await api()
      .post(`/api/time-off/requests/${created.body.data.id}/submit`)
      .set(bearer(employeeToken));

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INSUFFICIENT_BALANCE');
    expect(res.body.error.message).toMatch(/requested 5, remaining 2/);
  });

  it('rejects a submit when no allocation covers the dates', async () => {
    const created = await createRequest({ start_date: '2025-03-10', end_date: '2025-03-14' });

    const res = await api()
      .post(`/api/time-off/requests/${created.body.data.id}/submit`)
      .set(bearer(employeeToken));

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INSUFFICIENT_BALANCE');
  });

  it('skips the balance check for a type that requires no allocation', async () => {
    const created = await createRequest({
      time_off_type_id: unpaidLeaveId,
      start_date: '2025-03-10',
      end_date: '2025-03-20',
    });

    const res = await api()
      .post(`/api/time-off/requests/${created.body.data.id}/submit`)
      .set(bearer(employeeToken));

    expect(res.status).toBe(200);
  });

  it('increments taken_units when an approver approves the request', async () => {
    const allocation = await allocate(20);
    const created = await createRequest({ start_date: '2025-03-10', end_date: '2025-03-14' });
    await api()
      .post(`/api/time-off/requests/${created.body.data.id}/submit`)
      .set(bearer(employeeToken));

    const res = await api()
      .post(`/api/time-off/requests/${created.body.data.id}/approve`)
      .set(bearer(adminToken));

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('APPROVED');

    const updated = await prisma.timeOffAllocation.findUniqueOrThrow({ where: { id: allocation.id } });
    expect(Number(updated.taken_units)).toBe(5);
  });

  it('does not consume the balance when the request is refused', async () => {
    const allocation = await allocate(20);
    const created = await createRequest({ start_date: '2025-03-10', end_date: '2025-03-14' });
    await api()
      .post(`/api/time-off/requests/${created.body.data.id}/submit`)
      .set(bearer(employeeToken));

    const res = await api()
      .post(`/api/time-off/requests/${created.body.data.id}/refuse`)
      .set(bearer(adminToken));

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('REFUSED');

    const updated = await prisma.timeOffAllocation.findUniqueOrThrow({ where: { id: allocation.id } });
    expect(Number(updated.taken_units)).toBe(0);
  });

  it('forbids an EMPLOYEE from approving a request', async () => {
    await allocate(20);
    const created = await createRequest({ start_date: '2025-03-10', end_date: '2025-03-14' });
    await api()
      .post(`/api/time-off/requests/${created.body.data.id}/submit`)
      .set(bearer(employeeToken));

    const res = await api()
      .post(`/api/time-off/requests/${created.body.data.id}/approve`)
      .set(bearer(employeeToken));

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('INSUFFICIENT_PERMISSIONS');
  });

  it('rejects approving a request that was never submitted', async () => {
    await allocate(20);
    const created = await createRequest({ start_date: '2025-03-10', end_date: '2025-03-14' });

    const res = await api()
      .post(`/api/time-off/requests/${created.body.data.id}/approve`)
      .set(bearer(adminToken));

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('INVALID_STATUS');
  });

  it('rejects a second approval of the same request', async () => {
    await allocate(20);
    const created = await createRequest({ start_date: '2025-03-10', end_date: '2025-03-14' });
    await api()
      .post(`/api/time-off/requests/${created.body.data.id}/submit`)
      .set(bearer(employeeToken));
    await api()
      .post(`/api/time-off/requests/${created.body.data.id}/approve`)
      .set(bearer(adminToken));

    const res = await api()
      .post(`/api/time-off/requests/${created.body.data.id}/approve`)
      .set(bearer(adminToken));

    expect(res.status).toBe(409);
  });
});
