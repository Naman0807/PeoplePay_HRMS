import puppeteer from 'puppeteer';

export const WEB = process.env.E2E_WEB_URL ?? 'http://localhost:3001';
export const API = process.env.E2E_API_URL ?? 'http://localhost:4000/api';

export const ADMIN = { email: 'admin@peoplepay360.com', password: 'admin123' };

/** Unique suffix so a run never collides with the last one's data. */
export const RUN = Date.now().toString(36);

const results = [];
let current = null;

export function startCase(id, area, name) {
  current = { id, area, name, status: 'PASS', detail: '', console: [], network: [] };
  results.push(current);
  return current;
}

export function fail(detail) {
  if (!current) return;
  current.status = 'FAIL';
  current.detail = current.detail ? `${current.detail} | ${detail}` : detail;
}

export function skip(detail) {
  if (!current) return;
  current.status = 'SKIP';
  current.detail = detail;
}

export function note(detail) {
  if (!current) return;
  current.detail = current.detail ? `${current.detail} | ${detail}` : detail;
}

export function getResults() {
  return results;
}

/** Wires console and network capture onto the page, attributed to the running case. */
export function instrument(page) {
  page.on('console', (msg) => {
    if (msg.type() !== 'error') return;
    const text = msg.text();
    // React's dev-only hydration/act noise is not a product defect.
    if (/Download the React DevTools|was created by an <a>/i.test(text)) return;
    current?.console.push(text.slice(0, 300));
  });

  page.on('pageerror', (err) => {
    current?.console.push(`pageerror: ${String(err.message).slice(0, 300)}`);
  });

  page.on('requestfailed', (req) => {
    const failure = req.failure()?.errorText ?? 'failed';
    if (/ERR_ABORTED/.test(failure)) return;
    current?.network.push(`${req.method()} ${req.url()} → ${failure}`);
  });

  page.on('response', async (res) => {
    const status = res.status();
    if (status < 400) return;
    const url = res.url();
    if (!url.includes('/api/')) return;
    let code = '';
    try {
      const body = await res.json();
      code = body?.error?.code ? ` (${body.error.code})` : '';
    } catch {
      /* not json */
    }
    current?.network.push(`${res.request().method()} ${url.replace(API, '')} → ${status}${code}`);
  });
}

export async function launch() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--window-size=1440,900'],
    defaultViewport: { width: 1440, height: 900 },
  });
  return browser;
}

export async function newPage(browser) {
  const page = await browser.newPage();
  page.setDefaultTimeout(20_000);
  page.setDefaultNavigationTimeout(45_000);
  instrument(page);
  return page;
}

/**
 * A page in its own browser context, so logging in here cannot overwrite the
 * localStorage session another page is using. Always `await close()` when done.
 */
export async function newIsolatedPage(browser) {
  const context = await browser.createBrowserContext();
  const page = await context.newPage();
  page.setDefaultTimeout(20_000);
  page.setDefaultNavigationTimeout(45_000);
  instrument(page);
  return { page, close: () => context.close() };
}

export async function goto(page, path) {
  await page.goto(`${WEB}${path}`, { waitUntil: 'networkidle2' });
}

/** Logs in through the real form and waits for the dashboard. */
export async function loginUI(page, email, password) {
  await goto(page, '/login');
  await page.waitForSelector('#login-email');
  await page.$eval('#login-email', (el) => (el.value = ''));
  await page.type('#login-email', email);
  await page.$eval('#login-password', (el) => (el.value = ''));
  await page.type('#login-password', password);
  await Promise.all([
    page.waitForFunction(() => location.pathname !== '/login', { timeout: 20_000 }),
    page.click('button[type="submit"]'),
  ]);
}

/** Direct API call from inside the page, so cookies/headers behave like the app's. */
export async function apiLogin(email, password) {
  const res = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const body = await res.json();
  return { status: res.status, body };
}

export async function apiCall(path, { method = 'GET', token, body } = {}) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  let json = null;
  try {
    json = await res.json();
  } catch {
    /* empty body */
  }
  return { status: res.status, body: json };
}

export function textOf(page, selector) {
  return page.$eval(selector, (el) => el.textContent?.trim() ?? '').catch(() => null);
}

export async function hasText(page, needle) {
  return page.evaluate((n) => document.body.innerText.includes(n), needle);
}

export async function waitForText(page, needle, timeout = 15_000) {
  await page.waitForFunction((n) => document.body.innerText.includes(n), { timeout }, needle);
}

export function report() {
  const pass = results.filter((r) => r.status === 'PASS');
  const failed = results.filter((r) => r.status === 'FAIL');
  const skipped = results.filter((r) => r.status === 'SKIP');
  const noisy = results.filter((r) => r.console.length > 0 || r.network.length > 0);

  const lines = [];
  lines.push('');
  lines.push('='.repeat(78));
  lines.push(`E2E RESULTS   pass ${pass.length}   fail ${failed.length}   skip ${skipped.length}`);
  lines.push('='.repeat(78));

  let area = '';
  for (const r of results) {
    if (r.area !== area) {
      area = r.area;
      lines.push('');
      lines.push(`── ${area}`);
    }
    const mark = r.status === 'PASS' ? 'PASS' : r.status === 'FAIL' ? 'FAIL' : 'SKIP';
    lines.push(`  [${mark}] ${r.id}  ${r.name}${r.detail ? `\n         ${r.detail}` : ''}`);
  }

  if (noisy.length > 0) {
    lines.push('');
    lines.push('── console errors / failed requests');
    for (const r of noisy) {
      lines.push(`  ${r.id} ${r.name}`);
      for (const c of [...new Set(r.console)]) lines.push(`      console: ${c}`);
      for (const n of [...new Set(r.network)]) lines.push(`      network: ${n}`);
    }
  }

  lines.push('');
  return lines.join('\n');
}
