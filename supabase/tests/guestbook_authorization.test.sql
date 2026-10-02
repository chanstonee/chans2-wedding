-- Run only against an isolated local/test Supabase database:
--   supabase start && supabase db reset && supabase test db
-- Fixtures, role changes, and extension creation are rolled back.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select no_plan();

truncate table public.guestbook_entries;
insert into auth.users (id, email) values
  ('90000000-0000-4000-8000-000000000001', 'guestbook-admin@example.test'),
  ('90000000-0000-4000-8000-000000000002', 'guestbook-nonadmin@example.test');
insert into public.guestbook_admins (user_id)
values ('90000000-0000-4000-8000-000000000001');
insert into public.guestbook_entries (id, name, message, is_secret, is_hidden, created_at) values
  ('10000000-0000-4000-8000-000000000002', '공개 손님', '공개 축하 메시지', false, false, '2026-10-02 00:00:00+00'),
  ('10000000-0000-4000-8000-000000000003', '비밀 손님', '관리자만 볼 수 있는 원문', true, false, '2026-10-02 00:00:00+00'),
  ('10000000-0000-4000-8000-000000000004', '숨긴 손님', '공개 목록에 나오면 안 되는 글', false, true, '2026-10-02 00:00:00+00');

select ok((select relrowsecurity from pg_class where oid = 'public.guestbook_entries'::regclass), 'entries have RLS enabled');
select ok((select relrowsecurity from pg_class where oid = 'public.guestbook_admins'::regclass), 'admin registry has RLS enabled');
select ok(not has_table_privilege('anon', 'public.guestbook_entries', 'SELECT'), 'anon has no raw SELECT grant');
select ok(not has_table_privilege('anon', 'public.guestbook_entries', 'INSERT'), 'anon has no raw INSERT grant');
select ok(not has_table_privilege('authenticated', 'public.guestbook_entries', 'INSERT'), 'authenticated has no raw INSERT grant');
select ok(not has_table_privilege('authenticated', 'public.guestbook_entries', 'UPDATE'), 'authenticated has no table-wide UPDATE grant');
select ok(has_column_privilege('authenticated', 'public.guestbook_entries', 'is_hidden', 'UPDATE'), 'only visibility is updatable');
select ok(not has_column_privilege('authenticated', 'public.guestbook_entries', 'message', 'UPDATE'), 'message cannot be rewritten');
select ok(not exists (
  select 1
  from pg_proc as functions,
    lateral aclexplode(coalesce(functions.proacl, acldefault('f', functions.proowner))) as permissions
  where functions.oid in (
    'public.is_guestbook_admin()'::regprocedure,
    'public.list_guestbook_entries(integer,integer)'::regprocedure,
    'public.submit_guestbook_entry(text,text,boolean)'::regprocedure
  ) and permissions.grantee = 0 and permissions.privilege_type = 'EXECUTE'
), 'PUBLIC cannot implicitly execute any guestbook RPC');

-- Unauthenticated visitor: raw tables are inaccessible; RPC output is masked.
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
select set_config('request.jwt.claim.sub', '', true);
select throws_ok('select message from public.guestbook_entries', '42501', null, 'anon cannot fetch raw secrets');
select throws_ok('select * from public.guestbook_admins', '42501', null, 'anon cannot list administrator UUIDs');
select throws_ok($$insert into public.guestbook_entries (name, message) values ('손님', 'raw insert')$$, '42501', null, 'anon cannot insert raw rows');
select throws_ok($$update public.guestbook_entries set is_hidden = true$$, '42501', null, 'anon cannot hide rows');
select throws_ok('delete from public.guestbook_entries', '42501', null, 'anon cannot delete rows');
select throws_ok('select public.is_guestbook_admin()', '42501', null, 'anon cannot execute admin RPC');
select results_eq('select count(*) from public.list_guestbook_entries()', array[2::bigint], 'public list includes secret placeholder and excludes hidden row');
select results_eq(
  $$select name from public.list_guestbook_entries() where is_secret$$,
  array['비밀 손님'::text],
  'secret placeholder retains the guest name'
);
select results_eq(
  $$select message from public.list_guestbook_entries() where is_secret$$,
  array[null::text],
  'secret message is SQL NULL for anon'
);
select results_eq(
  $$select message from public.list_guestbook_entries() where not is_secret$$,
  array['공개 축하 메시지'::text],
  'public message is readable'
);
select results_eq(
  'select id from public.list_guestbook_entries(1, 0)',
  array['10000000-0000-4000-8000-000000000003'::uuid],
  'id breaks equal timestamp ties deterministically'
);
select results_eq(
  'select id from public.list_guestbook_entries(1, 1)',
  array['10000000-0000-4000-8000-000000000002'::uuid],
  'pagination advances past secret placeholders'
);
select throws_ok('select * from public.list_guestbook_entries(0, 0)', '22023', null, 'zero page size is rejected');
select throws_ok('select * from public.list_guestbook_entries(51, 0)', '22023', null, 'oversized page size is rejected');
select throws_ok('select * from public.list_guestbook_entries(10, -1)', '22023', null, 'negative offset is rejected');
select throws_ok('select * from public.list_guestbook_entries(null, 0)', '22023', null, 'NULL page size is rejected');
select throws_ok('select * from public.list_guestbook_entries(10, null)', '22023', null, 'NULL offset is rejected');

select lives_ok($$select public.submit_guestbook_entry(E' \t새 손님\n ', E' \n결혼 축하해요!\r ', true)$$, 'visitor can submit a trimmed secret message');
select lives_ok($$select public.submit_guestbook_entry('기본 공개', '기본값 확인')$$, 'omitted secrecy flag defaults to public');
select lives_ok($$select public.submit_guestbook_entry(repeat('가', 30), repeat('나', 1000), false)$$, 'Korean character limits accept exact boundaries');
select throws_ok($$select public.submit_guestbook_entry(null, '축하해요', false)$$, '22023', null, 'NULL name is rejected');
select throws_ok($$select public.submit_guestbook_entry(E' \n\t ', '축하해요', false)$$, '22023', null, 'whitespace-only name is rejected');
select throws_ok($$select public.submit_guestbook_entry(U&'\00A0\3000\FEFF', '축하해요', false)$$, '22023', null, 'Unicode whitespace-only name is rejected');
select throws_ok($$select public.submit_guestbook_entry(repeat('가', 31), '축하해요', false)$$, '22023', null, 'overlong name is rejected');
select throws_ok($$select public.submit_guestbook_entry('손님', null, false)$$, '22023', null, 'NULL message is rejected');
select throws_ok($$select public.submit_guestbook_entry('손님', E' \r\n\t ', false)$$, '22023', null, 'whitespace-only message is rejected');
select throws_ok($$select public.submit_guestbook_entry('손님', repeat('나', 1001), false)$$, '22023', null, 'overlong message is rejected');
select throws_ok($$select public.submit_guestbook_entry('손님', '축하해요', null)$$, '22023', null, 'NULL secrecy flag is rejected');

-- Authenticated but not allowlisted: identity/metadata never grants admin rights.
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"90000000-0000-4000-8000-000000000002","role":"authenticated","user_metadata":{"is_admin":true}}', true);
select set_config('request.jwt.claim.sub', '90000000-0000-4000-8000-000000000002', true);
select is(public.is_guestbook_admin(), false, 'non-admin stays non-admin despite user metadata');
select results_eq('select count(*) from public.guestbook_entries', array[0::bigint], 'non-admin raw SELECT returns no rows under RLS');
select ok(not exists (select 1 from public.list_guestbook_entries() where is_secret and message is not null), 'non-admin RPC cannot expose secret content');
select results_eq(
  'update public.guestbook_entries set is_hidden = true returning id',
  array[]::uuid[],
  'non-admin cannot hide entries under RLS'
);
select results_eq('delete from public.guestbook_entries returning id', array[]::uuid[], 'non-admin cannot delete entries under RLS');
select throws_ok($$insert into public.guestbook_admins (user_id) values ('90000000-0000-4000-8000-000000000002')$$, '42501', null, 'non-admin cannot enroll itself');
select throws_ok('select * from public.guestbook_admins', '42501', null, 'non-admin cannot inspect admin registry');
select lives_ok($$select public.submit_guestbook_entry('로그인 손님', '로그인 상태의 공개 글', false)$$, 'non-admin can still use the public submit RPC');
select set_config('request.jwt.claims', '{"role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', '', true);
select is(public.is_guestbook_admin(), false, 'authenticated role without a user UUID is not admin');

-- Allowlisted administrator: raw content is readable, public RPC is still masked.
select set_config('request.jwt.claims', '{"sub":"90000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', '90000000-0000-4000-8000-000000000001', true);
select is(public.is_guestbook_admin(), true, 'allowlisted UUID is admin');
select results_eq(
  $$select message from public.guestbook_entries where id = '10000000-0000-4000-8000-000000000003'$$,
  array['관리자만 볼 수 있는 원문'::text],
  'admin can read secret content directly'
);
select results_eq(
  $$select message from public.guestbook_entries where name = '새 손님'$$,
  array['결혼 축하해요!'::text],
  'submit RPC trims both fields before storing'
);
select results_eq(
  $$select is_secret from public.guestbook_entries where name = '기본 공개'$$,
  array[false],
  'submit RPC stores public by default'
);
select ok(exists (select 1 from public.guestbook_entries where is_hidden), 'admin can read hidden entries');
select ok(not exists (select 1 from public.list_guestbook_entries() where is_secret and message is not null), 'public RPC masks secrets even for admin');
select throws_ok($$update public.guestbook_entries set message = '수정'$$, '42501', null, 'admin cannot rewrite messages');
select throws_ok($$update public.guestbook_entries set name = '수정'$$, '42501', null, 'admin cannot rewrite guest names');
select throws_ok('update public.guestbook_entries set is_secret = false', '42501', null, 'admin cannot turn secret rows public');
select throws_ok($$insert into public.guestbook_entries (name, message) values ('관리자', 'raw insert')$$, '42501', null, 'admin cannot bypass submit constraints with raw insertion');
select throws_ok($$insert into public.guestbook_admins (user_id) values ('90000000-0000-4000-8000-000000000002')$$, '42501', null, 'browser admin cannot enroll another administrator');
select results_eq(
  $$update public.guestbook_entries set is_hidden = true where id = '10000000-0000-4000-8000-000000000002' returning id$$,
  array['10000000-0000-4000-8000-000000000002'::uuid],
  'admin can hide a row'
);
select ok(not exists (select 1 from public.list_guestbook_entries(50) where id = '10000000-0000-4000-8000-000000000002'), 'hidden row vanishes from public RPC');
select results_eq(
  $$update public.guestbook_entries set is_hidden = false where id = '10000000-0000-4000-8000-000000000002' returning id$$,
  array['10000000-0000-4000-8000-000000000002'::uuid],
  'admin can restore a row'
);
select ok(exists (select 1 from public.list_guestbook_entries(50) where id = '10000000-0000-4000-8000-000000000002'), 'restored row reappears in public RPC');
select results_eq(
  $$delete from public.guestbook_entries where id = '10000000-0000-4000-8000-000000000003' returning id$$,
  array['10000000-0000-4000-8000-000000000003'::uuid],
  'admin can delete a secret row'
);

-- Trusted service-role operations retain access after the explicit revocations.
reset role;
set local role service_role;
select set_config('request.jwt.claims', '{"role":"service_role"}', true);
select set_config('request.jwt.claim.sub', '', true);
select results_eq(
  $$select message from public.guestbook_entries where name = '새 손님'$$,
  array['결혼 축하해요!'::text],
  'service_role retains raw secret access'
);
select lives_ok($$insert into public.guestbook_admins (user_id) values ('90000000-0000-4000-8000-000000000002')$$, 'trusted service_role can manage the allowlist');
select lives_ok($$select public.submit_guestbook_entry('서버', 'trusted submission', true)$$, 'service_role retains submit RPC access');
select ok(not exists (select 1 from public.list_guestbook_entries(50) where is_secret and message is not null), 'public RPC masks secrets even for service_role');

reset role;
-- Constraints also reject invalid values from trusted raw writes.
select throws_ok($$insert into public.guestbook_entries (name, message) values (' ', '축하해요')$$, '23514', null, 'table constraint rejects blank names');
select throws_ok($$insert into public.guestbook_entries (name, message) values ('손님', repeat('가', 1001))$$, '23514', null, 'table constraint rejects oversized messages');
select throws_ok($$insert into public.guestbook_entries (name, message) values (' 손님 ', '축하해요')$$, '23514', null, 'table constraint requires canonical trimmed fields');

select * from finish();
rollback;
