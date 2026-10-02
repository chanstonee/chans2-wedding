# wedding invitaion

## GitHub Pages

Public URL: https://chanstonee.github.io/wedding/

The `.github/workflows/pages.yml` workflow builds and deploys the static site on
every push to `main`. Repository Settings → Pages → Source must be **GitHub Actions**.

```bash
npm ci
npm run build:pages
```

The export is written to `out/`, with repository-prefixed image/font paths and
`.nojekyll`. Override `PAGES_BASE_PATH` if the repository name changes (use an
empty value for a custom domain). Splash, menu navigation, gallery and modals
run entirely in the browser. The auto-filled password is an animation, not access control.

The existing `npm run dev` and `npm run build` commands still use the original
Sites/Vinext setup; GitHub Pages does not need Cloudflare, D1, or a server.

## 방명록

청첩장 메뉴의 **방명록**에서 로그인 없이 공개글 또는 비밀글을 남길 수 있습니다.
비밀글은 이름과 잠금 안내만 공개하며, 본문은 관리자에게만 전달합니다.
`/wedding/admin/`에서는 이메일 Magic Link로 로그인하여 전체 글 조회, 숨김/해제,
삭제를 할 수 있습니다. 관리자 메뉴는 방문자 화면에 노출하지 않습니다.

실제 저장을 사용하려면 [Supabase 설정 안내](docs/guestbook-setup.md)를 따라
DB 마이그레이션 실행, 관리자 계정 등록, 공개 연결 변수 설정을 완료하세요.
`.env.example`을 `.env.local`로 복사하여 로컬 연결 정보를 넣고,
GitHub Actions에는 같은 값을 Repository **Variables**에 설정합니다.
연결 정보가 없으면 방명록은 준비 중으로 표시하고 작성은 비활성화합니다.

```bash
npm run build:pages
npm run test:pages
```

## Original starter notes

A clean full-stack starter running on
[vinext](https://github.com/cloudflare/vinext), with optional Cloudflare D1 and
Drizzle support.

## Prerequisites

- Node.js `>=22.13.0`

## Quick Start

```bash
npm install
npm run dev
npm run build
```

This starter does not use `wrangler.jsonc`.

## Included Shape

- edit site code under `app/`
- `.openai/hosting.json` declares optional Sites D1 and R2 bindings
- `vite.config.ts` simulates declared bindings for local development
- `db/schema.ts` starts intentionally empty
- `examples/d1/` contains an optional D1 example surface
- `drizzle.config.ts` supports local migration generation when needed

## Workspace Auth Headers

OpenAI workspace sites can read the current user's email from
`oai-authenticated-user-email`.

SIWC-authenticated workspace sites may also receive
`oai-authenticated-user-full-name` when the user's SIWC profile has a non-empty
`name` claim. The full-name value is percent-encoded UTF-8 and is accompanied by
`oai-authenticated-user-full-name-encoding: percent-encoded-utf-8`.

Treat the full name as optional and fall back to email when it is absent:

```tsx
import { headers } from "next/headers";

export default async function Home() {
  const requestHeaders = await headers();
  const email = requestHeaders.get("oai-authenticated-user-email");
  const encodedFullName = requestHeaders.get("oai-authenticated-user-full-name");
  const fullName =
    encodedFullName &&
    requestHeaders.get("oai-authenticated-user-full-name-encoding") ===
      "percent-encoded-utf-8"
      ? decodeURIComponent(encodedFullName)
      : null;

  const displayName = fullName ?? email;
  // ...
}
```

## Optional Dispatch-Owned ChatGPT Sign-In

Import the ready-to-use helpers from `app/chatgpt-auth.ts` when the site needs
optional or required ChatGPT sign-in:

- Use `getChatGPTUser()` for optional signed-in UI.
- Use `requireChatGPTUser(returnTo)` for server-rendered pages that should send
  anonymous visitors through Sign in with ChatGPT.
- Use `chatGPTSignInPath(returnTo)` and `chatGPTSignOutPath(returnTo)` for
  browser links or actions.
- Pass a same-origin relative `returnTo` path for the destination after sign-in
  or sign-out. The helper validates and safely encodes it.
- Mark protected pages with `export const dynamic = "force-dynamic"` because
  they depend on per-request identity headers.

Dispatch owns `/signin-with-chatgpt`, `/signout-with-chatgpt`, `/callback`, the
OAuth cookies, and identity header injection. Do not implement app routes for
those reserved paths. Routes that do not import and call the helper remain
anonymous-compatible.

SIWC establishes identity only; it does not prove workspace membership. Use the
Sites hosting platform's access policy controls for workspace-wide restrictions,
or enforce explicit server-side membership or allowlist checks.

Use SIWC for account pages, user-specific dashboards, saved records, and write
actions tied to the current ChatGPT user. Leave public content anonymous.

## Useful Commands

- `npm run dev`: start local development
- `npm run build`: verify the vinext build output
- `npm test`: build the GitHub Pages export and verify the invitation/admin pages
- `npm run db:generate`: generate Drizzle migrations after schema changes

## Learn More

- [vinext Documentation](https://github.com/cloudflare/vinext)
- [Drizzle D1 Guide](https://orm.drizzle.team/docs/get-started/d1-new)
