import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  api,
  bearer,
  createUser,
  isDatabaseReady,
  loginAs,
  resetDatabase,
  TEST_PASSWORD,
} from '../setup';

const dbReady = await isDatabaseReady();

describe.skipIf(!dbReady)('POST /api/auth', () => {
  beforeAll(async () => {
    await resetDatabase();
  });

  beforeEach(async () => {
    await resetDatabase();
    await createUser('admin@peoplepay360.com', 'ADMIN');
  });

  it('logs a user in and returns tokens plus the user', async () => {
    const res = await api()
      .post('/api/auth/login')
      .send({ email: 'admin@peoplepay360.com', password: TEST_PASSWORD });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toEqual(expect.any(String));
    expect(res.body.data.refreshToken).toEqual(expect.any(String));
    expect(res.body.data.user).toMatchObject({
      email: 'admin@peoplepay360.com',
      role: 'ADMIN',
    });
    expect(res.body.data.user.password_hash).toBeUndefined();
  });

  it('rejects a wrong password with 401', async () => {
    const res = await api()
      .post('/api/auth/login')
      .send({ email: 'admin@peoplepay360.com', password: 'wrong-password' });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('rejects an unknown email with 401', async () => {
    const res = await api()
      .post('/api/auth/login')
      .send({ email: 'nobody@peoplepay360.com', password: TEST_PASSWORD });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('rejects a malformed body with 400', async () => {
    const res = await api().post('/api/auth/login').send({ email: 'not-an-email' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('issues a new access token from a refresh token', async () => {
    const session = await loginAs('admin@peoplepay360.com');

    const res = await api().post('/api/auth/refresh').send({ refreshToken: session.refreshToken });

    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toEqual(expect.any(String));
  });

  it('rejects an invalid refresh token', async () => {
    const res = await api().post('/api/auth/refresh').send({ refreshToken: 'not-a-token' });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_REFRESH_TOKEN');
  });

  it('invalidates the refresh token on logout', async () => {
    const session = await loginAs('admin@peoplepay360.com');

    const logout = await api().post('/api/auth/logout').send({ refreshToken: session.refreshToken });
    expect(logout.status).toBe(200);

    const refreshed = await api()
      .post('/api/auth/refresh')
      .send({ refreshToken: session.refreshToken });
    expect(refreshed.status).toBe(401);
  });
});

describe.skipIf(!dbReady)('authentication middleware', () => {
  beforeEach(async () => {
    await resetDatabase();
    await createUser('admin@peoplepay360.com', 'ADMIN');
  });

  it('rejects a request with no token', async () => {
    const res = await api().get('/api/employees');

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('NO_TOKEN');
  });

  it('rejects a request with a garbage token', async () => {
    const res = await api().get('/api/employees').set(bearer('garbage.token.value'));

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_TOKEN');
  });

  it('accepts a request with a valid token', async () => {
    const session = await loginAs('admin@peoplepay360.com');

    const res = await api().get('/api/employees').set(bearer(session.accessToken));

    expect(res.status).toBe(200);
  });

  it('answers the health check without a token', async () => {
    const res = await api().get('/health');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  it('returns 404 in the standard envelope for an unknown route', async () => {
    const res = await api().get('/api/does-not-exist');

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});
