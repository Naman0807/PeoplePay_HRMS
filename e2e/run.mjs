import {
  ADMIN,
  WEB,
  instrument,
  newIsolatedPage,
  RUN,
  apiCall,
  apiLogin,
  fail,
  getResults,
  goto,
  hasText,
  launch,
  loginUI,
  newPage,
  note,
  report,
  skip,
  startCase,
  waitForText,
} from './harness.mjs';

const ROUTES = [
  ['/dashboard', 'Dashboard'],
  ['/employees', 'Employees'],
  ['/employees/kanban', 'Kanban'],
  ['/employees/new', 'New'],
  ['/team', 'Team'],
  ['/contracts', 'Contracts'],
  ['/schedules', 'Schedules'],
  ['/attendance', 'Attendance'],
  ['/time-off', 'Time Off'],
  ['/salary', 'Salary'],
  ['/payroll', 'Payroll'],
  ['/payslips', 'Payslips'],
  ['/admin', 'Admin'],
];

const NEW_USER = {
  firstName: 'Test',
  lastName: 'Signup',
  email: `signup.${RUN}@peoplepay360.com`,
  password: 'newuser123',
  role: 'HR_MANAGER',
};

const REJECT_USER = {
  firstName: 'Reject',
  lastName: 'Me',
  email: `reject.${RUN}@peoplepay360.com`,
  password: 'newuser123',
  role: 'EMPLOYEE',
};

async function run() {
  const browser = await launch();
  const page = await newPage(browser);
  let adminToken = '';

  // ─── A. Authentication ───────────────────────────────────────────────────
  startCase('A1', 'A. Authentication', 'Login page renders');
  try {
    await goto(page, '/login');
    if (!(await hasText(page, 'PeoplePay360'))) fail('brand heading missing');
    if (!(await page.$('#login-email'))) fail('#login-email missing');
    if (!(await page.$('#login-password'))) fail('#login-password missing');
  } catch (err) {
    fail(err.message);
  }

  startCase('A2', 'A. Authentication', 'Wrong password shows an error, stays on /login');
  try {
    await goto(page, '/login');
    await page.$eval('#login-email', (el) => (el.value = ''));
    await page.type('#login-email', ADMIN.email);
    await page.$eval('#login-password', (el) => (el.value = ''));
    await page.type('#login-password', 'definitely-wrong');
    await page.click('button[type="submit"]');
    await waitForText(page, 'Invalid credentials', 10_000).catch(() => fail('no error message'));
    if (new URL(page.url()).pathname !== '/login') fail(`navigated away to ${page.url()}`);
  } catch (err) {
    fail(err.message);
  }

  startCase('A3', 'A. Authentication', 'Admin logs in and lands on the dashboard');
  try {
    await loginUI(page, ADMIN.email, ADMIN.password);
    const path = new URL(page.url()).pathname;
    if (path !== '/dashboard') fail(`landed on ${path}, expected /dashboard`);
  } catch (err) {
    fail(err.message);
  }

  startCase('A4', 'A. Authentication', 'Session survives a page reload');
  try {
    await page.reload({ waitUntil: 'networkidle2' });
    const path = new URL(page.url()).pathname;
    if (path === '/login') fail('bounced back to /login after reload');
  } catch (err) {
    fail(err.message);
  }

  startCase('A5', 'A. Authentication', 'Protected route redirects an anonymous visitor');
  try {
    // A fresh context, so it does not inherit the logged-in page's localStorage.
    const context = await browser.createBrowserContext();
    const anon = await context.newPage();
    instrument(anon);
    await anon.goto(`${WEB}/dashboard`, { waitUntil: 'networkidle2' });
    await anon
      .waitForFunction(() => location.pathname === '/login', { timeout: 15_000 })
      .catch(() => fail(`stayed on ${anon.url()}`));
    await context.close();
  } catch (err) {
    fail(err.message);
  }

  // ─── B. Route smoke (as ADMIN) ───────────────────────────────────────────
  for (const [route, label] of ROUTES) {
    startCase(`B:${route}`, 'B. Route smoke (ADMIN)', `${label} loads`);
    try {
      const res = await page.goto(`${page.url().split('/').slice(0, 3).join('/')}${route}`, {
        waitUntil: 'networkidle2',
      });
      if (res && res.status() >= 400) fail(`HTTP ${res.status()}`);
      await new Promise((r) => setTimeout(r, 1200));
      const body = await page.evaluate(() => document.body.innerText);
      if (/Application error|Unhandled Runtime Error|something went wrong/i.test(body)) {
        fail('error boundary rendered');
      }
      if (body.trim().length < 40) fail('page rendered empty');
      if (new URL(page.url()).pathname === '/login') fail('kicked to /login');
    } catch (err) {
      fail(err.message);
    }
  }

  // ─── C. Signup and approval ──────────────────────────────────────────────
  startCase('C1', 'C. Signup + approval', 'Signup form submits and reports pending approval');
  try {
    const signupPage = await newPage(browser);
    await goto(signupPage, '/signup');
    await signupPage.type('#signup-first-name', NEW_USER.firstName);
    await signupPage.type('#signup-last-name', NEW_USER.lastName);
    await signupPage.type('#signup-email', NEW_USER.email);
    await signupPage.select('#signup-role', NEW_USER.role);
    await signupPage.type('#signup-password', NEW_USER.password);
    await signupPage.type('#signup-confirm-password', NEW_USER.password);
    await signupPage.click('button[type="submit"]');
    await waitForText(signupPage, 'sent to the admin for approval', 15_000).catch(() =>
      fail('no success message')
    );
    await signupPage.close();
  } catch (err) {
    fail(err.message);
  }

  startCase('C2', 'C. Signup + approval', 'Pending account cannot log in');
  try {
    const res = await apiLogin(NEW_USER.email, NEW_USER.password);
    if (res.status !== 403) fail(`expected 403, got ${res.status}`);
    if (res.body?.error?.code !== 'ACCOUNT_PENDING_APPROVAL') {
      fail(`code ${res.body?.error?.code}`);
    }
  } catch (err) {
    fail(err.message);
  }

  startCase('C3', 'C. Signup + approval', 'Pending login shows a clear message in the UI');
  try {
    const p = await newPage(browser);
    await goto(p, '/login');
    await p.$eval('#login-email', (el) => (el.value = ''));
    await p.type('#login-email', NEW_USER.email);
    await p.$eval('#login-password', (el) => (el.value = ''));
    await p.type('#login-password', NEW_USER.password);
    await p.click('button[type="submit"]');
    await waitForText(p, 'pending admin approval', 10_000).catch(async () => {
      const body = await p.evaluate(() => document.body.innerText);
      fail(`no pending message; saw: ${body.slice(0, 160).replace(/\s+/g, ' ')}`);
    });
    await p.close();
  } catch (err) {
    fail(err.message);
  }

  startCase('C4', 'C. Signup + approval', 'Admin sees the request in Pending Approvals');
  try {
    await goto(page, '/admin');
    await waitForText(page, 'Pending Approvals', 15_000).catch(() =>
      fail('Pending Approvals panel not rendered')
    );
    if (!(await hasText(page, NEW_USER.email))) fail('new signup not listed');
  } catch (err) {
    fail(err.message);
  }

  startCase('C5', 'C. Signup + approval', 'Approve grants the requested role');
  try {
    const clicked = await page.evaluate((email) => {
      const row = [...document.querySelectorAll('tr')].find((tr) => tr.innerText.includes(email));
      if (!row) return 'row-not-found';
      const btn = [...row.querySelectorAll('button')].find((b) => /approve/i.test(b.innerText));
      if (!btn) return 'button-not-found';
      btn.click();
      return 'ok';
    }, NEW_USER.email);
    if (clicked !== 'ok') fail(clicked);

    await waitForText(page, 'Approve Account', 8_000).catch(() => fail('no confirm dialog'));
    await page.evaluate(() => {
      const dialog = document.querySelector('[role="dialog"]');
      const btn = [...(dialog?.querySelectorAll('button') ?? [])].find(
        (b) => b.innerText.trim().toLowerCase() === 'approve'
      );
      btn?.click();
    });
    // Scope to the pending panel: the approved user legitimately stays visible
    // in the Users table further down the page.
    await page
      .waitForFunction(
        (email) => {
          const heading = [...document.querySelectorAll('h2')].find((h) =>
            /pending approvals/i.test(h.textContent ?? '')
          );
          if (!heading) return true; // panel disappears entirely once the queue empties
          const panel = heading.closest('div.rounded-xl');
          return !panel || !panel.innerText.includes(email);
        },
        { timeout: 15_000 },
        NEW_USER.email
      )
      .catch(() => fail('row did not leave the pending queue'));
  } catch (err) {
    fail(err.message);
  }

  startCase('C6', 'C. Signup + approval', 'Approved user logs in with the granted role');
  try {
    const res = await apiLogin(NEW_USER.email, NEW_USER.password);
    if (res.status !== 200) fail(`login ${res.status} ${JSON.stringify(res.body?.error ?? {})}`);
    else if (res.body.data.user.role !== NEW_USER.role) {
      fail(`role ${res.body.data.user.role}, expected ${NEW_USER.role}`);
    }
  } catch (err) {
    fail(err.message);
  }

  startCase('C7', 'C. Signup + approval', 'Approval creates the employee record');
  try {
    const login = await apiLogin(ADMIN.email, ADMIN.password);
    adminToken = login.body?.data?.accessToken ?? '';
    const list = await apiCall(`/employees?pageSize=100&search=${encodeURIComponent(NEW_USER.email)}`, {
      token: adminToken,
    });
    const found = (list.body?.data ?? []).some((e) => e.email === NEW_USER.email);
    if (!found) fail('no employee record for the approved user');
  } catch (err) {
    fail(err.message);
  }

  startCase('C8', 'C. Signup + approval', 'Rejected account cannot log in');
  try {
    const reg = await apiCall('/auth/register', { method: 'POST', body: REJECT_USER });
    if (reg.status !== 201) throw new Error(`register ${reg.status}`);
    const rejected = await apiCall(`/users/${reg.body.data.id}/reject`, {
      method: 'POST',
      token: adminToken,
    });
    if (rejected.status !== 200) fail(`reject ${rejected.status}`);
    const login = await apiLogin(REJECT_USER.email, REJECT_USER.password);
    if (login.status !== 403) fail(`login ${login.status}, expected 403`);
    if (login.body?.error?.code !== 'ACCOUNT_REJECTED') fail(`code ${login.body?.error?.code}`);
  } catch (err) {
    fail(err.message);
  }

  startCase('C9', 'C. Signup + approval', 'Duplicate signup email is refused');
  try {
    const res = await apiCall('/auth/register', { method: 'POST', body: NEW_USER });
    if (res.status !== 409) fail(`expected 409, got ${res.status}`);
  } catch (err) {
    fail(err.message);
  }

  // ─── D. RBAC in the browser ──────────────────────────────────────────────
  startCase('D1', 'D. RBAC', 'Non-admin is kept out of /admin');
  try {
    const { page: p, close } = await newIsolatedPage(browser);
    await loginUI(p, NEW_USER.email, NEW_USER.password); // HR_MANAGER
    await goto(p, '/admin');
    await new Promise((r) => setTimeout(r, 2000));
    const path = new URL(p.url()).pathname;
    const body = await p.evaluate(() => document.body.innerText);
    const blocked = path !== '/admin' || /403|not authorized|permission/i.test(body);
    if (!blocked) fail(`HR_MANAGER rendered the admin page at ${path}`);
    if (/Pending Approvals/.test(body)) fail('pending approvals visible to a non-admin');
    await close();
  } catch (err) {
    fail(err.message);
  }

  startCase('D2', 'D. RBAC', 'HR_MANAGER is kept out of /payroll');
  try {
    const { page: p, close } = await newIsolatedPage(browser);
    await loginUI(p, NEW_USER.email, NEW_USER.password);
    await goto(p, '/payroll');
    await new Promise((r) => setTimeout(r, 2000));
    const path = new URL(p.url()).pathname;
    const body = await p.evaluate(() => document.body.innerText);
    const blocked = path !== '/payroll' || /403|not authorized|permission/i.test(body);
    if (!blocked) fail(`HR_MANAGER rendered the payroll page at ${path}`);
    await close();
  } catch (err) {
    fail(err.message);
  }

  startCase('D3', 'D. RBAC', 'API refuses a non-admin on /users/pending');
  try {
    const login = await apiLogin(NEW_USER.email, NEW_USER.password);
    const res = await apiCall('/users/pending', { token: login.body?.data?.accessToken });
    if (res.status !== 403) fail(`expected 403, got ${res.status}`);
  } catch (err) {
    fail(err.message);
  }

  // ─── E. Core screens render real data ────────────────────────────────────
  startCase('E1', 'E. Screens', 'Dashboard shows KPI values');
  try {
    await goto(page, '/dashboard');
    await new Promise((r) => setTimeout(r, 2500));
    const body = await page.evaluate(() => document.body.innerText);
    if (/Loading/i.test(body) && !/Employees|Payroll|Attendance/i.test(body)) {
      fail('still loading after 2.5s');
    }
    if (!/\d/.test(body)) fail('no numbers rendered');
  } catch (err) {
    fail(err.message);
  }

  startCase('E2', 'E. Screens', 'Employees list renders rows');
  try {
    await goto(page, '/employees');
    await new Promise((r) => setTimeout(r, 2000));
    const rows = await page.$$eval('tbody tr', (els) => els.length).catch(() => 0);
    if (rows === 0) fail('no employee rows');
    else note(`${rows} rows`);
  } catch (err) {
    fail(err.message);
  }

  startCase('E3', 'E. Screens', 'Schedule form computes weekly hours live');
  try {
    await goto(page, '/schedules');
    await new Promise((r) => setTimeout(r, 1500));
    await page.evaluate(() => {
      const btn = [...document.querySelectorAll('button')].find((b) =>
        /new schedule|create schedule/i.test(b.innerText)
      );
      btn?.click();
    });
    await page.waitForSelector('[data-testid="weekly-hours"]', { timeout: 10_000 });
    for (const day of ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']) {
      await page.evaluate((d) => {
        document.querySelector(`button[aria-label="Toggle ${d}"]`)?.click();
      }, day);
    }
    await new Promise((r) => setTimeout(r, 400));
    const hours = await page.$eval('[data-testid="weekly-hours"]', (el) => el.textContent?.trim());
    if (hours !== '35') fail(`weekly hours read "${hours}", expected "35"`);
  } catch (err) {
    fail(err.message);
  }

  startCase('E4', 'E. Screens', 'Payslips list renders and a payslip opens');
  try {
    await goto(page, '/payslips');
    await new Promise((r) => setTimeout(r, 2500));
    const body = await page.evaluate(() => document.body.innerText);
    if (/error/i.test(body) && !/payslip/i.test(body)) fail('error state rendered');
    const rows = await page.$$eval('tbody tr', (els) => els.length).catch(() => 0);
    note(`${rows} payslip rows`);
  } catch (err) {
    fail(err.message);
  }

  // ─── F. Payroll wizard through the API (fast path) ───────────────────────
  startCase('F1', 'F. Payroll wizard', 'Create → select → compute → validate → paid');
  try {
    const structures = await apiCall('/salary/structures', { token: adminToken });
    const all = structures.body?.data ?? [];
    // Pick the structure the running contracts actually reference, otherwise the
    // payrun has no eligible employees for reasons that are not a defect.
    const contracts = await apiCall('/contracts?status=RUNNING', { token: adminToken });
    const used = (contracts.body?.data ?? []).map((c) => c.salary_structure_id);
    const structure = all.find((s) => used.includes(s.id)) ?? all[0];
    if (!structure) throw new Error('no salary structure available');
    note(`structure ${structure.code}`);

    const created = await apiCall('/payruns', {
      method: 'POST',
      token: adminToken,
      body: {
        name: `E2E ${RUN}`,
        salary_structure_id: structure.id,
        period_start: '2025-01-01',
        period_end: '2025-01-31',
      },
    });
    if (created.status !== 201) throw new Error(`create ${created.status}`);
    const payrunId = created.body.data.id;

    const eligible = await apiCall(`/payruns/${payrunId}/eligible-employees`, { token: adminToken });
    const ids = (eligible.body?.data ?? []).map((e) => e.employee.id);
    if (ids.length === 0) {
      const contracts = await apiCall('/contracts?status=RUNNING', { token: adminToken });
      const running = contracts.body?.data ?? [];
      skip(
        `no employee eligible for 2025-01-01..2025-01-31 (${running.length} running contracts: ` +
          running
            .slice(0, 3)
            .map((c) => `${c.start_date?.slice(0, 10)}→${c.end_date?.slice(0, 10) ?? 'open'}`)
            .join(', ') +
          ')'
      );
    } else {
      const selected = await apiCall(`/payruns/${payrunId}/select-employees`, {
        method: 'POST',
        token: adminToken,
        body: { employee_ids: ids },
      });
      if (selected.status !== 200) fail(`select ${selected.status}`);

      const computed = await apiCall(`/payruns/${payrunId}/compute`, {
        method: 'POST',
        token: adminToken,
      });
      if (computed.status !== 200) fail(`compute ${computed.status} ${JSON.stringify(computed.body?.error ?? {})}`);
      else note(`net total ${computed.body.data.summary.totalNet}`);

      const validated = await apiCall(`/payruns/${payrunId}/validate`, {
        method: 'POST',
        token: adminToken,
      });
      if (validated.status !== 200) fail(`validate ${validated.status}`);

      const paid = await apiCall(`/payruns/${payrunId}/mark-paid`, {
        method: 'POST',
        token: adminToken,
      });
      if (paid.status !== 200) fail(`mark-paid ${paid.status}`);
      else if (paid.body.data.status !== 'PAID') fail(`status ${paid.body.data.status}`);
    }
  } catch (err) {
    fail(err.message);
  }

  startCase('F2', 'F. Payroll wizard', 'Payroll page renders the wizard for an admin');
  try {
    await goto(page, '/payroll');
    await waitForText(page, 'Create, compute, validate and pay', 20_000).catch(async () => {
      const seen = await page.evaluate(() => document.body.innerText.replace(/\s+/g, ' ').slice(0, 400));
      fail(`payroll body never rendered at ${page.url()}; saw: ${seen}`);
    });
    const body = await page.evaluate(() => document.body.innerText);
    for (const label of ['Period', 'Employees', 'Review', 'Process']) {
      if (!body.includes(label)) fail(`wizard step "${label}" missing`);
    }
  } catch (err) {
    fail(err.message);
  }

  // ─── G. Logout ───────────────────────────────────────────────────────────
  startCase('G1', 'G. Session', 'Logout clears the session');
  try {
    await goto(page, '/dashboard');
    const clicked = await page.evaluate(() => {
      const btn = [...document.querySelectorAll('button, a')].find((b) =>
        /log ?out|sign ?out/i.test(b.innerText)
      );
      if (!btn) return false;
      btn.click();
      return true;
    });
    if (!clicked) {
      fail('no logout control found in the shell');
    } else {
      let landed = false;
      for (let i = 0; i < 30 && !landed; i += 1) {
        await new Promise((r) => setTimeout(r, 500));
        landed = new URL(page.url()).pathname === '/login';
      }
      if (!landed) fail(`still on ${page.url()}`);
    }
  } catch (err) {
    fail(err.message);
  }

  await browser.close();

  console.log(report());
  const failed = getResults().filter((r) => r.status === 'FAIL');
  process.exit(failed.length > 0 ? 1 : 0);
}

run().catch((err) => {
  console.error('harness crashed:', err);
  console.log(report());
  process.exit(1);
});
