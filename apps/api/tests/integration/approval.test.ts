import { beforeEach, describe, expect, it } from 'vitest';
import {
  api,
  bearer,
  createUser,
  isDatabaseReady,
  loginAs,
  prisma,
  resetDatabase,
  TEST_PASSWORD,
} from '../setup';

const dbReady = await isDatabaseReady();

const SIGNUP_PASSWORD = 'newuser123';

const signup = (over: Record<string, unknown> = {}) => ({
  firstName: 'Nora',
  lastName: 'Ali',
  email: 'nora@peoplepay360.com',
  password: SIGNUP_PASSWORD,
  role: 'HR_MANAGER',
  ...over,
});

describe.skipIf(!dbReady)('POST /api/auth/register', () => {
  beforeEach(async () => {
    await resetDatabase();
    await createUser('admin@peoplepay360.com', 'ADMIN');
  });

  it('creates a pending account that cannot log in yet', async () => {
    const res = await api().post('/api/auth/register').send(signup());

    expect(res.status).toBe(201);
    expect(res.body.data.approval_status).toBe('PENDING');
    expect(res.body.data.requested_role).toBe('HR_MANAGER');
    expect(res.body.data.role).toBe('EMPLOYEE'); // no privilege until approved
    expect(res.body.data.is_active).toBe(false);
    expect(res.body.data.password_hash).toBeUndefined();
  });

  it('blocks login while the request is pending', async () => {
    await api().post('/api/auth/register').send(signup());

    const res = await api()
      .post('/api/auth/login')
      .send({ email: 'nora@peoplepay360.com', password: SIGNUP_PASSWORD });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('ACCOUNT_PENDING_APPROVAL');
  });

  it('does not create an employee record before approval', async () => {
    await api().post('/api/auth/register').send(signup());

    expect(await prisma.employee.count()).toBe(0);
  });

  it('rejects a duplicate email with 409', async () => {
    await api().post('/api/auth/register').send(signup());

    const res = await api().post('/api/auth/register').send(signup());

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('EMAIL_ALREADY_REGISTERED');
  });

  it('rejects a weak password with 400', async () => {
    const short = await api().post('/api/auth/register').send(signup({ password: 'abc1' }));
    expect(short.status).toBe(400);
    expect(short.body.error.code).toBe('VALIDATION_ERROR');

    const noDigit = await api().post('/api/auth/register').send(signup({ password: 'abcdefgh' }));
    expect(noDigit.status).toBe(400);
  });

  it('refuses a self-assigned ADMIN role', async () => {
    const res = await api().post('/api/auth/register').send(signup({ role: 'ADMIN' }));

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('defaults the requested role to EMPLOYEE when none is given', async () => {
    const { role: _role, ...withoutRole } = signup();

    const res = await api().post('/api/auth/register').send(withoutRole);

    expect(res.status).toBe(201);
    expect(res.body.data.requested_role).toBe('EMPLOYEE');
  });
});

describe.skipIf(!dbReady)('admin approval queue', () => {
  let adminToken: string;

  async function register(over: Record<string, unknown> = {}) {
    const res = await api().post('/api/auth/register').send(signup(over));
    return res.body.data as { id: string; email: string };
  }

  beforeEach(async () => {
    await resetDatabase();
    await createUser('admin@peoplepay360.com', 'ADMIN');
    adminToken = (await loginAs('admin@peoplepay360.com')).accessToken;
  });

  it('lists the pending signups for an admin', async () => {
    await register();

    const res = await api().get('/api/users/pending').set(bearer(adminToken));

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    // Every row in this queue is PENDING by definition, so the endpoint does not repeat it.
    expect(res.body.data[0]).toMatchObject({
      email: 'nora@peoplepay360.com',
      requested_role: 'HR_MANAGER',
    });
  });

  it('leaves already-approved users out of the queue', async () => {
    const res = await api().get('/api/users/pending').set(bearer(adminToken));

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(0);
  });

  it('forbids a non-admin from reading or acting on the queue', async () => {
    const pending = await register();
    await createUser('hr@peoplepay360.com', 'HR_MANAGER');
    const hrToken = (await loginAs('hr@peoplepay360.com')).accessToken;

    const list = await api().get('/api/users/pending').set(bearer(hrToken));
    expect(list.status).toBe(403);
    expect(list.body.error.code).toBe('INSUFFICIENT_PERMISSIONS');

    const approve = await api().post(`/api/users/${pending.id}/approve`).set(bearer(hrToken));
    expect(approve.status).toBe(403);

    const reject = await api().post(`/api/users/${pending.id}/reject`).set(bearer(hrToken));
    expect(reject.status).toBe(403);
  });

  it('requires authentication to reach the queue', async () => {
    const res = await api().get('/api/users/pending');

    expect(res.status).toBe(401);
  });

  it('grants the requested role on approval and lets the user log in', async () => {
    const pending = await register();

    const approved = await api().post(`/api/users/${pending.id}/approve`).set(bearer(adminToken));
    expect(approved.status).toBe(200);
    expect(approved.body.data).toMatchObject({
      role: 'HR_MANAGER',
      approval_status: 'APPROVED',
      is_active: true,
    });

    const session = await loginAs('nora@peoplepay360.com', SIGNUP_PASSWORD);
    expect(session.user.role).toBe('HR_MANAGER');

    // The new role is real, not cosmetic: HR_MANAGER may list every employee.
    const employees = await api().get('/api/employees').set(bearer(session.accessToken));
    expect(employees.status).toBe(200);
  });

  it('creates the employee record when the signup is approved', async () => {
    const pending = await register();

    await api().post(`/api/users/${pending.id}/approve`).set(bearer(adminToken));

    const employee = await prisma.employee.findFirstOrThrow({ where: { user_id: pending.id } });
    expect(employee).toMatchObject({
      first_name: 'Nora',
      last_name: 'Ali',
      email: 'nora@peoplepay360.com',
      status: 'ACTIVE',
    });
  });

  it('clears the approved user out of the pending queue', async () => {
    const pending = await register();
    await api().post(`/api/users/${pending.id}/approve`).set(bearer(adminToken));

    const res = await api().get('/api/users/pending').set(bearer(adminToken));

    expect(res.body.data).toHaveLength(0);
  });

  it('refuses to approve the same signup twice', async () => {
    const pending = await register();
    await api().post(`/api/users/${pending.id}/approve`).set(bearer(adminToken));

    const res = await api().post(`/api/users/${pending.id}/approve`).set(bearer(adminToken));

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('NOT_PENDING_APPROVAL');
  });

  it('blocks login after a rejection', async () => {
    const pending = await register();

    const rejected = await api().post(`/api/users/${pending.id}/reject`).set(bearer(adminToken));
    expect(rejected.status).toBe(200);
    expect(rejected.body.data).toMatchObject({ approval_status: 'REJECTED', is_active: false });

    const login = await api()
      .post('/api/auth/login')
      .send({ email: 'nora@peoplepay360.com', password: SIGNUP_PASSWORD });

    expect(login.status).toBe(403);
    expect(login.body.error.code).toBe('ACCOUNT_REJECTED');
  });

  it('refuses to reject a user who is not pending', async () => {
    const admin = await prisma.user.findUniqueOrThrow({
      where: { email: 'admin@peoplepay360.com' },
    });

    const res = await api().post(`/api/users/${admin.id}/reject`).set(bearer(adminToken));

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('NOT_PENDING_APPROVAL');

    // The admin must still be able to log in.
    await expect(loginAs('admin@peoplepay360.com')).resolves.toBeDefined();
  });

  it('returns 404 for an unknown user', async () => {
    const res = await api()
      .post('/api/users/00000000-0000-0000-0000-000000000000/approve')
      .set(bearer(adminToken));

    expect(res.status).toBe(404);
  });
});

describe.skipIf(!dbReady)('session invalidation after approval changes', () => {
  beforeEach(async () => {
    await resetDatabase();
    await createUser('admin@peoplepay360.com', 'ADMIN');
  });

  it('stops refreshing tokens once the account is deactivated', async () => {
    await createUser('hr@peoplepay360.com', 'HR_MANAGER');
    const session = await loginAs('hr@peoplepay360.com');

    // The refresh token works while the account is live.
    const before = await api().post('/api/auth/refresh').send({ refreshToken: session.refreshToken });
    expect(before.status).toBe(200);

    await prisma.user.update({
      where: { email: 'hr@peoplepay360.com' },
      data: { is_active: false },
    });

    const after = await api().post('/api/auth/refresh').send({ refreshToken: session.refreshToken });
    expect(after.status).toBe(403);
    expect(after.body.error.code).toBe('ACCOUNT_NOT_ACTIVE');
  });

  it('stops refreshing tokens once the account is rejected', async () => {
    await createUser('hr@peoplepay360.com', 'HR_MANAGER');
    const session = await loginAs('hr@peoplepay360.com');

    await prisma.user.update({
      where: { email: 'hr@peoplepay360.com' },
      data: { approval_status: 'REJECTED' },
    });

    const res = await api().post('/api/auth/refresh').send({ refreshToken: session.refreshToken });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('ACCOUNT_NOT_ACTIVE');
  });

  it('blocks login for a deactivated account', async () => {
    await createUser('hr@peoplepay360.com', 'HR_MANAGER');
    await prisma.user.update({
      where: { email: 'hr@peoplepay360.com' },
      data: { is_active: false },
    });

    const res = await api()
      .post('/api/auth/login')
      .send({ email: 'hr@peoplepay360.com', password: TEST_PASSWORD });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('ACCOUNT_DISABLED');
  });
});
