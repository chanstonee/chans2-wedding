// Optional browser integration check. Requires Playwright and a test-configured
// Pages export; see docs/guestbook-setup.md. All Supabase requests are mocked.
import { createServer } from 'node:http';
import { readFile, stat, mkdir } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = fileURLToPath(new URL('../', import.meta.url));
const mime = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.otf': 'font/otf' };
const server = createServer(async (req, res) => {
  try {
    const relative = decodeURIComponent(new URL(req.url, 'http://localhost').pathname).replace(/^\/wedding\/?/, '');
    let path = resolve(root, 'out', relative);
    assert.ok(path.startsWith(join(root, 'out') + '/') || path === join(root, 'out'));
    if ((await stat(path)).isDirectory()) path = join(path, 'index.html');
    res.setHeader('Content-Type', mime[extname(path)] ?? 'application/octet-stream');
    res.end(await readFile(path));
  } catch { res.writeHead(404); res.end('Not found'); }
});
await new Promise((accept, reject) => { server.on('error', reject); server.listen(0, '127.0.0.1', accept); });
const base = `http://127.0.0.1:${server.address().port}/wedding`;
let browser;
try {
  browser = await chromium.launch({ headless: true, ...(process.env.BROWSER_EXECUTABLE ? { executablePath: process.env.BROWSER_EXECUTABLE } : {}) });
  const headers = { 'access-control-allow-origin': '*', 'access-control-expose-headers': 'content-range', 'content-type': 'application/json' };
  const pageErrors = [], reports = [];
  const pass = value => { reports.push(value); console.log(`PASS: ${value}`); };
  let rows = Array.from({ length: 14 }, (_, i) => ({ id: `00000000-0000-0000-0000-${String(i + 1).padStart(12, '0')}`, name: `하객 ${i + 1}`, message: i === 1 ? 'PRIVATE_MESSAGE_ONLY_ADMIN' : i === 0 ? '<img src=x onerror=alert(1)> 축하해요' : `축하 메시지 ${i + 1}`, is_secret: i === 1, is_hidden: false, created_at: new Date(Date.UTC(2026, 9, 2, 12, 14 - i)).toISOString() }));
  let rawReads = 0, adminPermission = true, failList = false, failLogout = false, delayRead = false, releaseRead, readStarted;
  const submits = [], mutations = [], otpRequests = [];
  const user = { id: '11111111-1111-1111-1111-111111111111', email: 'admin@example.com', aud: 'authenticated', role: 'authenticated', app_metadata: { provider: 'email', providers: ['email'] }, user_metadata: {}, identities: [], created_at: '2026-10-02T00:00:00Z' };
  const expiresAt = Math.floor(Date.now() / 1000) + 3600;
  const token = [Buffer.from('{"alg":"HS256","typ":"JWT"}').toString('base64url'), Buffer.from(JSON.stringify({ sub: user.id, exp: expiresAt, aud: 'authenticated', role: 'authenticated', iss: 'https://guestbook-test.supabase.co/auth/v1' })).toString('base64url'), 'signature'].join('.');
  const session = { access_token: token, refresh_token: 'mock-refresh-token', token_type: 'bearer', expires_in: 3600, expires_at: expiresAt, user };
  async function setup(context) {
    context.on('page', page => page.on('pageerror', error => pageErrors.push(error.message)));
    await context.route('https://guestbook-test.supabase.co/**', async route => {
      const req = route.request(), url = new URL(req.url()), body = req.postDataJSON();
      let response = null, status = 200;
      const responseHeaders = { ...headers };
      if (url.pathname.endsWith('/list_guestbook_entries')) {
        if (failList) { status = 400; response = { message: 'mock failure' }; }
        else response = rows.filter(r => !r.is_hidden).slice(body.p_offset, body.p_offset + body.p_limit).map(({ id, name, message, is_secret, created_at }) => ({ id, name, message: is_secret ? null : message, is_secret, created_at }));
      } else if (url.pathname.endsWith('/submit_guestbook_entry')) {
        submits.push(body); rows.unshift({ id: crypto.randomUUID(), name: body.p_name, message: body.p_message, is_secret: body.p_is_secret, is_hidden: false, created_at: new Date().toISOString() });
      } else if (url.pathname.endsWith('/is_guestbook_admin')) response = adminPermission;
      else if (url.pathname.endsWith('/guestbook_entries')) {
        if (req.method() === 'GET') {
          rawReads++;
          if (delayRead) { readStarted?.(); await new Promise(accept => { releaseRead = accept; }); }
          let selected = rows;
          for (const key of ['is_secret', 'is_hidden']) if (url.searchParams.has(key)) selected = selected.filter(row => String(row[key]) === url.searchParams.get(key).replace(/^eq\./, ''));
          const offset = Number(url.searchParams.get('offset') ?? 0), limit = Number(url.searchParams.get('limit') ?? 31);
          response = selected.slice(offset, offset + limit);
          responseHeaders['content-range'] = `${offset}-${Math.max(offset, offset + response.length - 1)}/${selected.length}`;
        } else {
          const id = url.searchParams.get('id').replace(/^eq\./, '');
          mutations.push({ method: req.method(), id, body });
          if (req.method() === 'PATCH') rows = rows.map(row => row.id === id ? { ...row, ...body } : row);
          if (req.method() === 'DELETE') rows = rows.filter(row => row.id !== id);
          response = [{ id }];
        }
      } else if (url.pathname.endsWith('/otp')) { otpRequests.push({ body, redirect: url.searchParams.get('redirect_to') }); response = {}; }
      else if (url.pathname.endsWith('/user')) response = user;
      else if (url.pathname.endsWith('/logout')) { response = failLogout ? { message: 'Mock logout failure' } : {}; status = failLogout ? 500 : 204; }
      else if (url.pathname.endsWith('/token')) response = session;
      else throw new Error(`Unhandled mock request ${req.method()} ${url.pathname}`);
      await route.fulfill({ status, headers: responseHeaders, body: status === 204 ? '' : JSON.stringify(response) });
    });
  }
  let navigation = 0;
  async function openGuestbook(page) {
    await page.goto(`${base}/?test=${++navigation}#guestbook`);
    await page.getByRole('button', { name: '청첩장 메인으로 이동' }).click();
    await page.getByRole('dialog', { name: '방명록', exact: true }).waitFor();
    await page.locator('.guestbook-entry').first().waitFor();
  }
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true });
  await setup(context);
  const page = await context.newPage();
  await openGuestbook(page);
  await page.waitForFunction(() => document.querySelectorAll('.guestbook-entry').length === 10);
  assert.equal(await page.getByText('PRIVATE_MESSAGE_ONLY_ADMIN').count(), 0);
  assert.equal(await page.locator('.guestbook-locked').count(), 1);
  assert.equal(await page.locator('.guestbook-message img').count(), 0);
  assert.equal(rawReads, 0);
  await page.getByRole('button', { name: '메시지 더 보기' }).click();
  await page.waitForFunction(() => document.querySelectorAll('.guestbook-entry').length === 14);
  await page.getByLabel('이름', { exact: true }).fill('  민지  ');
  await page.getByLabel('축하 메시지', { exact: true }).fill('  두 사람의 결혼을 축하해요!  ');
  await page.getByLabel('비밀글로 남기기', { exact: false }).check();
  await page.getByRole('button', { name: '축하 메시지 남기기' }).click();
  await page.getByText('비밀글을 남겼어요.', { exact: false }).waitFor();
  assert.deepEqual(submits[0], { p_name: '민지', p_message: '두 사람의 결혼을 축하해요!', p_is_secret: true });
  assert.equal(await page.getByText('두 사람의 결혼을 축하해요!', { exact: true }).count(), 0);
  assert.equal(await page.getByRole('dialog', { name: '방명록', exact: true }).evaluate(el => el.scrollWidth <= el.clientWidth), true);
  await mkdir(join(root, 'outputs'), { recursive: true });
  await page.locator('.panel-scroll').evaluate(el => el.scrollTop = 0);
  await page.screenshot({ path: join(root, 'outputs/guestbook-mobile.png') });
  await page.getByLabel('축하 메시지', { exact: true }).focus();
  await page.keyboard.press('Tab');
  assert.equal(await page.locator('#guestbook-secret').evaluate(el => el === document.activeElement), true);
  await page.keyboard.press('Escape');
  await page.getByRole('dialog', { name: '방명록', exact: true }).waitFor({ state: 'hidden' });
  pass('Public mobile: secret masking, text escaping, paging, trimmed submission, focus/close, no overflow');
  await openGuestbook(page);
  failList = true;
  await page.getByRole('button', { name: '새로고침', exact: true }).click();
  await page.locator('.guestbook-list-error').waitFor();
  failList = false;
  await page.getByRole('button', { name: '다시 불러오기' }).click();
  await page.locator('.guestbook-list-error').waitFor({ state: 'hidden' });
  assert.equal(await page.locator('.guestbook-entry').count(), 10);
  pass('Public list error and retry recovery');
  await page.goto(`${base}/admin/`);
  await page.getByLabel('관리자 이메일').fill('admin@example.com');
  await page.getByRole('button', { name: '인증 메일 보내기', exact: true }).click();
  await page.getByText('인증 메일을 보냈어요.', { exact: false }).waitFor();
  assert.equal(otpRequests[0].body.create_user, false);
  assert.equal(otpRequests[0].redirect, `${base}/admin/`);
  await page.screenshot({ path: join(root, 'outputs/guestbook-admin-login-mobile.png') });
  pass('Magic Link request: existing users only and /wedding/admin/ redirect');
  const admin = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await setup(admin);
  await admin.addInitScript(({ session, origin }) => { if (location.origin === origin) localStorage.setItem('wedding-guestbook-admin', JSON.stringify(session)); }, { session, origin: new URL(base).origin });
  const adminPage = await admin.newPage();
  await adminPage.goto(`${base}/admin/`);
  await adminPage.getByText('PRIVATE_MESSAGE_ONLY_ADMIN', { exact: true }).waitFor();
  await adminPage.getByRole('button', { name: '비밀글', exact: true }).click();
  await adminPage.waitForFunction(() => document.querySelectorAll('.guestbook-entry').length === 2);
  assert.equal(await adminPage.locator('.guestbook-admin-count').textContent(), '비밀글 2개');
  const secret = adminPage.locator('.guestbook-entry').filter({ hasText: 'PRIVATE_MESSAGE_ONLY_ADMIN' });
  await secret.getByRole('button', { name: '숨기기', exact: true }).click();
  await secret.getByRole('button', { name: '숨김 해제', exact: true }).waitFor();
  assert.equal(mutations.at(-1).body.is_hidden, true);
  await openGuestbook(page);
  assert.equal(await page.getByText('하객 2', { exact: true }).count(), 0);
  await secret.getByRole('button', { name: '숨김 해제', exact: true }).click();
  await secret.getByRole('button', { name: '숨기기', exact: true }).waitFor();
  await secret.getByRole('button', { name: '삭제', exact: true }).click();
  assert.equal(mutations.filter(m => m.method === 'DELETE').length, 0);
  await secret.getByRole('button', { name: '취소', exact: true }).click();
  await secret.getByRole('button', { name: '삭제', exact: true }).click();
  await secret.getByRole('button', { name: '삭제 확인', exact: true }).click();
  await secret.waitFor({ state: 'hidden' });
  assert.equal(mutations.filter(m => m.method === 'DELETE').length, 1);
  await adminPage.getByRole('button', { name: '전체', exact: true }).click();
  await adminPage.locator('.guestbook-entry').first().waitFor();
  await adminPage.screenshot({ path: join(root, 'outputs/guestbook-admin-desktop.png') });
  pass('Admin: secret reads, filters/count, hide/public exclusion, restore, delete confirm/cancel');
  async function startDelayedRead() {
    delayRead = true;
    const started = new Promise(accept => { readStarted = accept; });
    await adminPage.getByRole('button', { name: '새로고침', exact: true }).click();
    await started;
  }
  await startDelayedRead();
  failLogout = true;
  await adminPage.getByRole('button', { name: '로그아웃', exact: true }).click();
  await adminPage.getByText('로그아웃하지 못했어요.', { exact: false }).waitFor();
  const refresh = adminPage.getByRole('button', { name: '새로고침', exact: true });
  if (await refresh.count()) assert.equal(await refresh.isEnabled(), true);
  else assert.equal(await adminPage.getByLabel('관리자 이메일').isVisible(), true);
  assert.equal(await adminPage.locator('.guestbook-entry').count(), 0);
  releaseRead(); delayRead = false; failLogout = false;
  await adminPage.reload();
  await adminPage.locator('.guestbook-entry').first().waitFor();
  pass('Failed logout during loading clears private data and leaves a usable recovery screen');
  await startDelayedRead();
  await adminPage.getByRole('button', { name: '로그아웃', exact: true }).click();
  await adminPage.getByLabel('관리자 이메일').waitFor();
  releaseRead(); delayRead = false;
  await adminPage.waitForTimeout(200);
  assert.equal(await adminPage.locator('.guestbook-entry').count(), 0);
  assert.equal(await adminPage.evaluate(() => localStorage.getItem('wedding-guestbook-admin')), null);
  pass('Logout clears secrets/session and ignores a late response');
  const callback = await browser.newContext();
  await setup(callback);
  const callbackPage = await callback.newPage();
  await callbackPage.goto(`${base}/admin/#access_token=${token}&refresh_token=mock-refresh-token&expires_in=3600&token_type=bearer&type=magiclink`);
  await callbackPage.locator('.guestbook-entry').first().waitFor();
  assert.equal(new URL(callbackPage.url()).hash, '');
  pass('Magic Link callback establishes a session and removes URL tokens');
  adminPermission = false;
  const unlisted = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await setup(unlisted);
  await unlisted.addInitScript(({ session, origin }) => { if (location.origin === origin) localStorage.setItem('wedding-guestbook-admin', JSON.stringify(session)); }, { session, origin: new URL(base).origin });
  const unlistedPage = await unlisted.newPage(), beforeReads = rawReads;
  await unlistedPage.goto(`${base}/admin/`);
  await unlistedPage.getByText('관리자 권한이 없는 계정이에요', { exact: true }).waitFor();
  assert.equal(rawReads, beforeReads);
  assert.equal(await unlistedPage.locator('.guestbook-entry').count(), 0);
  pass('Authenticated non-admin cannot request raw guestbook data');
  assert.deepEqual(pageErrors, []);
  console.log(`${reports.length} browser scenarios passed; no page errors.`);
} finally {
  await browser?.close();
  await new Promise(accept => server.close(accept));
}
