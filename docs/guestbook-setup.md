# 방명록 연결하기

청첩장은 GitHub Pages에서 실행되고 방명록은 Supabase에 저장됩니다. 방문자는 로그인 없이 글을 남깁니다. 공개 목록에는 이름과 작성일이 보이며, 비밀글의 본문은 데이터베이스에서 `NULL`로 바뀌어 전달됩니다. 관리자만 `/wedding/admin/`에서 이메일 Magic Link로 로그인해 전체 본문을 읽고 글을 숨기거나 삭제할 수 있습니다.

아래 설정은 Supabase 프로젝트 소유자가 한 번 진행하면 됩니다. 프로젝트 URL과 공개 API 키를 등록하고 다시 빌드해야 실제 저장이 연결됩니다.

## 1. Supabase 프로젝트와 테이블 만들기

1. [Supabase Dashboard](https://supabase.com/dashboard)에서 방명록용 프로젝트를 만듭니다.
2. 프로젝트의 **SQL Editor → New query**를 엽니다.
3. [`supabase/migrations/20261002000000_guestbook.sql`](../supabase/migrations/20261002000000_guestbook.sql)의 전체 내용을 붙여 넣고 실행합니다. 처음 한 번만 실행하는 마이그레이션입니다.
4. Table Editor에서 `guestbook_entries`와 `guestbook_admins`가 생성되었는지 확인합니다.

마이그레이션은 RLS를 켜고 API 권한을 명시적으로 설정합니다. 공개 작성·조회는 정해진 RPC만 사용하고, 원본 테이블의 조회·삭제·숨김 변경은 관리자 UUID를 데이터베이스에서 검사합니다. `guestbook_admins`는 브라우저에서 읽거나 수정할 수 없습니다. SQL Editor/Table Editor는 프로젝트 운영자 권한으로 전체 내용을 볼 수 있습니다. [Supabase의 RLS와 권한 설명](https://supabase.com/docs/guides/database/postgres/row-level-security), [함수 권한과 `security definer` 설명](https://supabase.com/docs/guides/database/functions)

Supabase CLI로 프로젝트를 이미 관리하고 있다면 이 마이그레이션을 기존 연결 프로젝트에 적용할 수도 있습니다. SQL Editor로 적용한 후 같은 마이그레이션을 CLI에서 다시 적용하지 마세요.

## 2. 관리자 계정 등록하기

1. Supabase의 **Authentication → Users**에서 본인의 이메일로 사용자를 만듭니다. Dashboard의 **Add user/Create user**를 이용하고 이메일이 확인된 계정으로 생성합니다.
2. 생성된 사용자의 **User UID**를 복사합니다. 이메일 주소 대신 이 UUID를 관리자 목록에 등록합니다.
3. SQL Editor에서 아래 `본인-사용자-UUID`를 실제 UUID로 바꿔 실행합니다.

```sql
insert into public.guestbook_admins (user_id)
values ('본인-사용자-UUID'::uuid)
on conflict (user_id) do nothing;
```

두 번째 관리자도 같은 방법으로 추가합니다. 권한을 회수하려면 다음 SQL을 실행합니다.

```sql
delete from public.guestbook_admins
where user_id = '회수할-사용자-UUID'::uuid;
```

계정 이메일, 사용자 메타데이터, 관리자 페이지 주소를 알고 있다는 사실은 관리자 권한을 부여하지 않습니다. 로그인한 계정의 `auth.uid()`가 이 목록에 있어야 합니다. 일반 `authenticated` 계정은 원본 방명록을 조회해도 RLS에 따라 빈 결과를 받습니다.

## 3. 이메일 로그인과 이동 주소 설정하기

Supabase **Authentication**에서 다음을 설정합니다. Dashboard의 메뉴 이름은 버전에 따라 조금 다를 수 있습니다.

- **Sign In / Providers → Email**: 이메일 로그인 활성화.
- **User Signups / General Configuration**: 신규 사용자 가입 허용 끄기. 이 사이트에는 방문자 회원가입이 필요하지 않습니다.
- **Anonymous Sign-Ins**: 끄기. 공개 방명록은 로그인 세션 없이 `anon` API 역할로 작성합니다.
- **URL Configuration → Site URL**: `https://chanstonee.github.io/wedding/admin/`
- **URL Configuration → Redirect URLs**: `https://chanstonee.github.io/wedding/admin/` 추가.
- 개발 확인이 필요하면 사용 중인 정확한 주소도 추가: `http://localhost:3000/admin/`, `http://localhost:5173/admin/` 또는 `http://127.0.0.1:3000/admin/`.

운영 주소는 마지막 `/`까지 맞춰 등록합니다. `PAGES_BASE_PATH`나 도메인이 바뀌면 관리자 이동 주소도 함께 바꿉니다. 실제 로그인 요청은 현재 사이트의 `/admin/` 주소를 `emailRedirectTo`로 보내며 `shouldCreateUser: false`를 사용합니다. 사전에 만든 관리자 계정에 로그인하고 새 계정을 자동 생성하지 않습니다. [Magic Link 설정](https://supabase.com/docs/guides/auth/auth-email-passwordless), [Redirect URL 설정](https://supabase.com/docs/guides/auth/redirect-urls)

**메일 수신도 확인하세요.** Supabase의 기본 메일 서버는 프로젝트 조직 멤버의 이메일 주소로만 발송합니다. 관리자 이메일이 조직 멤버가 아니거나 안정적인 운영 발송이 필요하면 **Authentication → SMTP Settings**에서 본인의 메일 발송 서비스를 연결하세요. 메일 템플릿은 기본 Magic Link의 `{{ .ConfirmationURL }}` 링크를 유지합니다. 이 사이트는 정적 브라우저 로그인 흐름을 사용하므로 서버 `/auth/confirm` 주소로 바꿀 필요가 없습니다. [Supabase SMTP 제한과 설정](https://supabase.com/docs/guides/auth/auth-smtp)

## 4. 공개 연결 값 등록하기

Supabase 프로젝트의 연결 화면/설정에서 다음 값을 확인합니다.

| 환경 변수 | 값 |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://프로젝트-ID.supabase.co` 형식의 Project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_...` 형식의 Publishable key |

이 두 값은 브라우저 번들에 포함됩니다. 공개 키를 알고 있어도 RLS와 SQL 권한이 비밀글을 보호합니다. `service_role`, `sb_secret_...`, 데이터베이스 비밀번호를 이 변수나 사이트 코드에 넣지 마세요. [Supabase API 키 구분](https://supabase.com/docs/guides/getting-started/api-keys)

기존 프로젝트의 legacy `anon` 키도 지원합니다. 이 경우 `NEXT_PUBLIC_SUPABASE_ANON_KEY`에 등록할 수 있고 Publishable key가 있으면 그 값을 우선합니다. GitHub Pages에서는 legacy `anon` 값을 `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` 변수에 넣어도 됩니다.

### GitHub Pages

1. 저장소 **Settings → Secrets and variables → Actions → Variables**로 이동합니다.
2. **Repository variables**에 `NEXT_PUBLIC_SUPABASE_URL`과 `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`를 추가합니다.
3. **Actions**에서 Pages 배포 워크플로를 다시 실행하거나 `main`에 변경 사항을 반영해 새 빌드를 실행합니다.

정적 페이지의 값은 빌드 시점에 정해집니다. GitHub 변수만 바꾼 뒤 재빌드하지 않으면 배포 페이지에는 반영되지 않습니다.

### 로컬 앱

저장소 루트의 `.env.local`에 다음을 등록한 뒤 개발 서버를 재시작합니다. 실제 값이 들어 있는 `.env.local`은 커밋하지 않습니다.

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://프로젝트-ID.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_본인프로젝트공개키
```

## 5. 실제 동작 확인하기

1. 청첩장 방명록에서 공개글과 비밀글을 한 개씩 남깁니다.
2. 로그아웃한 브라우저에서 공개글 본문이 보이고 비밀글에는 잠금 안내만 표시되는지 확인합니다.
3. 브라우저 Network에서 `list_guestbook_entries`의 비밀글 `message`가 `null`인지 확인합니다.
4. [관리자 화면](https://chanstonee.github.io/wedding/admin/)에서 등록한 이메일로 링크를 받고 로그인합니다.
5. 비밀글 본문을 읽고 공개글을 숨깁니다. 청첩장을 새로 열어 숨긴 글이 보이지 않는지 확인한 뒤 관리 화면에서 복원합니다.
6. 테스트 글을 삭제하고 관리자 화면에서 로그아웃합니다.

관리자로 로그인한 같은 브라우저에서 청첩장을 열어도 공개 목록 RPC는 비밀 본문을 항상 `NULL`로 반환합니다. 본문은 관리자 화면의 원본 조회에서만 전달됩니다.

## 데이터베이스 권한 테스트

[`supabase/tests/guestbook_authorization.test.sql`](../supabase/tests/guestbook_authorization.test.sql)은 익명 방문자, 일반 로그인 사용자, 관리자, `service_role`의 권한을 검사합니다. 원본 비밀글 접근 차단, 관리자 목록 자가 등록 차단, 관리자 세션에서 공개 RPC 마스킹, 숨김·복원·삭제, 입력 제약과 페이지 순서를 포함합니다.

Docker와 [Supabase CLI](https://supabase.com/docs/guides/local-development/cli/getting-started)가 있는 환경에서 **로컬 테스트 데이터베이스**에 실행하세요. `supabase db reset`은 로컬 데이터를 지우므로 운영 프로젝트 대신 테스트 환경을 사용합니다.

```bash
supabase start
supabase db reset
supabase test db
```

테스트 자체는 트랜잭션 안에서 실행하고 마지막에 롤백합니다. `supabase/config.toml`은 로컬 Supabase의 가입 차단과 관리자 리다이렉트를 설정하며 호스팅 프로젝트 설정은 별도로 Dashboard에서 적용해야 합니다. [Supabase 데이터베이스 테스트 안내](https://supabase.com/docs/guides/local-development/testing/overview)

## 운영 시 알아둘 점

### 로컬 브라우저 검증 (선택)

`npm test`는 정적 페이지 내보내기와 공개 키 검증을 실행합니다. `tests/guestbook-browser.mjs`는 모바일 작성·비밀글 표시·목록 복구·관리자 숨김/삭제·로그아웃·Magic Link 콜백을 Chrome에서 검증합니다. Supabase 요청은 테스트 응답으로 바꾸며 실제 메일 발송이나 원격 DB 변경을 하지 않습니다.

Playwright가 설치된 개발 환경에서 아래와 같이 실행합니다. 테스트 연결 값은 `.env.local`이나 GitHub 변수에 저장하지 마세요.

```bash
npm install --no-save --package-lock=false playwright
npx playwright install chromium
NEXT_PUBLIC_SUPABASE_URL=https://guestbook-test.supabase.co NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_local_ui_test npm run build:pages
npm run test:browser
npm run build:pages
```

마지막 빌드는 실제 환경 설정으로 산출물을 복원합니다. 검증 화면은 `outputs/`에 저장합니다. 이미 설치된 브라우저를 사용할 때는 `BROWSER_EXECUTABLE`에 실행 파일 경로를 지정할 수 있습니다. 자동화 환경의 Playwright 모듈 위치가 다르면 `PLAYWRIGHT_MODULE`로 지정할 수 있습니다.

### 운영 메모

- 이름은 최대 30자, 메시지는 최대 1,000자이며 앞뒤 공백을 제거한 뒤 저장합니다. 비밀글에서도 이름과 작성일은 공개 목록에 표시됩니다.
- 공개 조회는 한 번에 1~50개를 받고 `created_at DESC, id DESC` 순서로 정렬합니다. 숨김 글은 공개 목록에서 제외합니다.
- 숨기기는 복원할 수 있지만 삭제한 글은 이 관리 화면에서 복원할 수 없습니다.
- 작성 RPC는 로그인이 없어도 호출할 수 있습니다. 브라우저의 입력 제어만으로 자동 스팸 호출을 차단할 수 없으므로 필요하면 CAPTCHA 검증과 서버/Edge Function의 요청 제한을 추가해야 합니다.
- 연결 실패 시 Project URL, 공개 키, 마이그레이션 실행 여부를 확인합니다. 관리자 권한 오류는 로그인 계정 UID와 `guestbook_admins`의 UUID가 같은지 확인합니다. 로그인 메일 오류는 SMTP 제한과 Redirect URL을 확인합니다.
