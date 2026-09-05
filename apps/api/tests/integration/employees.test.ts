import { beforeEach, describe, expect, it } from 'vitest';
import {
  api,
  bearer,
  createEmployee,
  isDatabaseReady,
  loginAs,
  prisma,
  resetDatabase,
  seedBaseWorld,
} from '../setup';

const dbReady = await isDatabaseReady();

describe.skipIf(!dbReady)('/api/employees', () => {
  let world: Awaited<ReturnType<typeof seedBaseWorld>>;
  let adminToken: string;
  let employeeToken: string;

  beforeEach(async () => {
    await resetDatabase();
    world = await seedBaseWorld();
    adminToken = (await loginAs('admin@peoplepay360.com')).accessToken;
    employeeToken = (await loginAs('employee@peoplepay360.com')).accessToken;
  });

  it('lists every employee for an HR role', async () => {
    await createEmployee({
      email: 'second@peoplepay360.com',
      departmentId: world.department.id,
      scheduleId: world.schedule.id,
    });

    const res = await api().get('/api/employees').set(bearer(adminToken));

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.meta.total).toBe(2);
  });

  it('lists only their own record for an EMPLOYEE', async () => {
    await createEmployee({
      email: 'second@peoplepay360.com',
      departmentId: world.department.id,
      scheduleId: world.schedule.id,
    });

    const res = await api().get('/api/employees').set(bearer(employeeToken));

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].email).toBe('employee@peoplepay360.com');
  });

  it('returns the caller record from /me', async () => {
    const res = await api().get('/api/employees/me').set(bearer(employeeToken));

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(world.staff.employee.id);
  });

  it('lets an EMPLOYEE read their own record', async () => {
    const res = await api()
      .get(`/api/employees/${world.staff.employee.id}`)
      .set(bearer(employeeToken));

    expect(res.status).toBe(200);
  });

  it('forbids an EMPLOYEE from reading somebody else record', async () => {
    const other = await createEmployee({
      email: 'second@peoplepay360.com',
      departmentId: world.department.id,
      scheduleId: world.schedule.id,
    });

    const res = await api()
      .get(`/api/employees/${other.employee.id}`)
      .set(bearer(employeeToken));

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('creates an employee (and its login) for an HR role', async () => {
    const res = await api()
      .post('/api/employees')
      .set(bearer(adminToken))
      .send({
        first_name: 'Nora',
        last_name: 'Ali',
        email: 'nora@peoplepay360.com',
        department_id: world.department.id,
        job_position: 'Designer',
        working_schedule_id: world.schedule.id,
        temporary_password: 'welcome123',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.email).toBe('nora@peoplepay360.com');

    const user = await prisma.user.findUnique({ where: { email: 'nora@peoplepay360.com' } });
    expect(user?.role).toBe('EMPLOYEE');
  });

  it('forbids an EMPLOYEE from creating an employee', async () => {
    const res = await api()
      .post('/api/employees')
      .set(bearer(employeeToken))
      .send({
        first_name: 'Nora',
        last_name: 'Ali',
        email: 'nora@peoplepay360.com',
        department_id: world.department.id,
        job_position: 'Designer',
        working_schedule_id: world.schedule.id,
      });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('INSUFFICIENT_PERMISSIONS');
  });

  it('rejects an invalid create payload with 400', async () => {
    const res = await api()
      .post('/api/employees')
      .set(bearer(adminToken))
      .send({ first_name: 'Nora' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('updates an employee for an HR role', async () => {
    const res = await api()
      .patch(`/api/employees/${world.staff.employee.id}`)
      .set(bearer(adminToken))
      .send({ job_position: 'Senior Tester' });

    expect(res.status).toBe(200);
    expect(res.body.data.job_position).toBe('Senior Tester');
  });

  it('forbids an EMPLOYEE from updating a record', async () => {
    const res = await api()
      .patch(`/api/employees/${world.staff.employee.id}`)
      .set(bearer(employeeToken))
      .send({ job_position: 'CEO' });

    expect(res.status).toBe(403);
  });

  it('returns 404 for an unknown employee', async () => {
    const res = await api()
      .get('/api/employees/00000000-0000-0000-0000-000000000000')
      .set(bearer(adminToken));

    expect(res.status).toBe(404);
  });
});

describe.skipIf(!dbReady)('/api/users RBAC', () => {
  beforeEach(async () => {
    await resetDatabase();
    await seedBaseWorld();
  });

  it('allows ADMIN to list users', async () => {
    const { accessToken } = await loginAs('admin@peoplepay360.com');

    const res = await api().get('/api/users').set(bearer(accessToken));

    expect(res.status).toBe(200);
  });

  it('forbids a non-admin from listing users', async () => {
    const { accessToken } = await loginAs('employee@peoplepay360.com');

    const res = await api().get('/api/users').set(bearer(accessToken));

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('INSUFFICIENT_PERMISSIONS');
  });
});
