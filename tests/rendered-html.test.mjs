import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const output = new URL("../out/", import.meta.url);
const basePath = (process.env.PAGES_BASE_PATH ?? "/wedding").replace(/\/$/, "");

test("exports the invitation and guestbook entry point for GitHub Pages", async () => {
  const html = await readFile(new URL("index.html", output), "utf8");
  assert.match(html, /<html[^>]*lang="ko"/);
  assert.match(html, /방명록/);
  assert.match(html, /사진첩/);
  assert.doesNotMatch(html, /감사의 마음/);
  assert.ok(html.includes(`${basePath}/_next/`));
  assert.ok(html.includes(`${basePath}/assets/themes/blue-mint/doodle-thanks.png`));
  assert.match(html, /data-theme="blue-mint"/);
  assert.match(html, /테마 변경, 현재 블루 민트/);
  assert.doesNotMatch(html, /관리자 이메일|인증 메일 보내기/);
  await access(new URL(".nojekyll", output));
});

test("exports a separate admin page without indexing or private guestbook data", async () => {
  const html = await readFile(new URL("admin/index.html", output), "utf8");
  assert.match(html, /<title>방명록 관리<\/title>/);
  assert.match(html, /name="robots" content="noindex, nofollow"/);
  assert.match(html, /name="referrer" content="no-referrer"/);
  assert.ok(html.includes(`href="${basePath}/"`));
  assert.ok(html.includes(`${basePath}/_next/`));
  assert.doesNotMatch(html, /class="guestbook-message"|class="guestbook-entry/);
  assert.match(html, /관리자 확인|연결 설정이 필요해요|로그인을 확인하는 중/);
});
