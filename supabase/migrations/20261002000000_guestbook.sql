-- Run as postgres (Supabase SQL Editor or the Supabase migration runner).
-- All grants and policies become visible together when this transaction commits.
begin;

create table public.guestbook_entries (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  name text not null,
  message text not null,
  is_secret boolean not null default false,
  is_hidden boolean not null default false,
  created_at timestamptz not null default pg_catalog.now(),
  constraint guestbook_name_valid check (
    name = pg_catalog.btrim(name, E' \t\n\r\f\013' || U&'\00A0\1680\2000\2001\2002\2003\2004\2005\2006\2007\2008\2009\200A\2028\2029\202F\205F\3000\FEFF')
    and pg_catalog.char_length(name) between 1 and 30
  ),
  constraint guestbook_message_valid check (
    message = pg_catalog.btrim(message, E' \t\n\r\f\013' || U&'\00A0\1680\2000\2001\2002\2003\2004\2005\2006\2007\2008\2009\200A\2028\2029\202F\205F\3000\FEFF')
    and pg_catalog.char_length(message) between 1 and 1000
  )
);

create index guestbook_visible_created_at_idx
  on public.guestbook_entries (created_at desc, id desc)
  where is_hidden = false;

create table public.guestbook_admins (
  user_id uuid primary key references auth.users (id) on delete cascade
);

alter table public.guestbook_entries owner to postgres;
alter table public.guestbook_admins owner to postgres;
alter table public.guestbook_entries enable row level security;
alter table public.guestbook_admins enable row level security;

-- No browser role can inspect or change the allowlist. Only trusted SQL/admin
-- operations can enroll an administrator. The allowlist has no browser policies.
revoke all on table public.guestbook_entries from public, anon, authenticated;
revoke all on table public.guestbook_admins from public, anon, authenticated;
grant all on table public.guestbook_entries to service_role;
grant all on table public.guestbook_admins to service_role;
grant usage on schema public to anon, authenticated, service_role;

create function public.is_guestbook_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.guestbook_admins as admins
    where admins.user_id = (select auth.uid())
  );
$$;

-- The caller's auth.uid() comes from the verified JWT, even though this function
-- reads the allowlist with its owner's privileges.
alter function public.is_guestbook_admin() owner to postgres;
revoke all on function public.is_guestbook_admin() from public, anon, authenticated;
grant execute on function public.is_guestbook_admin() to authenticated, service_role;

create policy guestbook_admin_select
on public.guestbook_entries
for select to authenticated
using ((select public.is_guestbook_admin()));

create policy guestbook_admin_delete
on public.guestbook_entries
for delete to authenticated
using ((select public.is_guestbook_admin()));

create policy guestbook_admin_update_visibility
on public.guestbook_entries
for update to authenticated
using ((select public.is_guestbook_admin()))
with check ((select public.is_guestbook_admin()));

-- RLS decides which authenticated users can see or manage rows. The column
-- grant prevents even an administrator from rewriting names/messages/secrecy.
grant select, delete on table public.guestbook_entries to authenticated;
grant update (is_hidden) on table public.guestbook_entries to authenticated;

create function public.list_guestbook_entries(
  p_limit integer default 10,
  p_offset integer default 0
)
returns table (
  id uuid,
  name text,
  message text,
  is_secret boolean,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if p_limit is null or p_limit < 1 or p_limit > 50 then
    raise exception 'p_limit must be between 1 and 50' using errcode = '22023';
  end if;
  if p_offset is null or p_offset < 0 then
    raise exception 'p_offset must be nonnegative' using errcode = '22023';
  end if;

  return query
    select
      entries.id,
      entries.name,
      case when entries.is_secret then null::text else entries.message end,
      entries.is_secret,
      entries.created_at
    from public.guestbook_entries as entries
    where entries.is_hidden = false
    order by entries.created_at desc, entries.id desc
    limit p_limit
    offset p_offset;
end;
$$;

create function public.submit_guestbook_entry(
  p_name text,
  p_message text,
  p_is_secret boolean default false
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  -- Match JavaScript String.trim(), including Unicode whitespace.
  trimmed_name text := pg_catalog.btrim(p_name, E' \t\n\r\f\013' || U&'\00A0\1680\2000\2001\2002\2003\2004\2005\2006\2007\2008\2009\200A\2028\2029\202F\205F\3000\FEFF');
  trimmed_message text := pg_catalog.btrim(p_message, E' \t\n\r\f\013' || U&'\00A0\1680\2000\2001\2002\2003\2004\2005\2006\2007\2008\2009\200A\2028\2029\202F\205F\3000\FEFF');
begin
  if trimmed_name is null or pg_catalog.char_length(trimmed_name) not between 1 and 30 then
    raise exception 'name must contain between 1 and 30 characters' using errcode = '22023';
  end if;
  if trimmed_message is null or pg_catalog.char_length(trimmed_message) not between 1 and 1000 then
    raise exception 'message must contain between 1 and 1000 characters' using errcode = '22023';
  end if;
  if p_is_secret is null then
    raise exception 'is_secret must be a boolean' using errcode = '22023';
  end if;

  -- Visitors cannot supply an id, timestamp, or visibility flag, nor request a
  -- returned raw row containing a secret message.
  insert into public.guestbook_entries (name, message, is_secret)
  values (trimmed_name, trimmed_message, p_is_secret);
end;
$$;

alter function public.list_guestbook_entries(integer, integer) owner to postgres;
alter function public.submit_guestbook_entry(text, text, boolean) owner to postgres;

-- Supabase/Postgres can automatically grant new functions to PUBLIC and API
-- roles. Revoke those defaults explicitly for these functions, then opt in.
-- This migration deliberately does not change unrelated application grants.
revoke all on function public.list_guestbook_entries(integer, integer) from public, anon, authenticated;
revoke all on function public.submit_guestbook_entry(text, text, boolean) from public, anon, authenticated;
grant execute on function public.list_guestbook_entries(integer, integer) to anon, authenticated, service_role;
grant execute on function public.submit_guestbook_entry(text, text, boolean) to anon, authenticated, service_role;

comment on function public.list_guestbook_entries(integer, integer)
is 'Public guestbook listing. Secret message is always SQL NULL, including for admins; hidden rows are excluded.';
comment on table public.guestbook_admins
is 'Trusted administrator UUID allowlist. Edit only through the SQL Editor or trusted service-role tooling.';

-- Refresh REST RPC signatures after applying through the SQL Editor.
notify pgrst, 'reload schema';

commit;
