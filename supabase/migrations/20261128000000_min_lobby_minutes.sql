-- The minimum lobby length before teammates may rate each other becomes a
-- setting instead of a number in the code.
--
-- Until now `can_review` (20261116000200_reviews.sql) held '15 minutes', and
-- the app held its own copy for its messages. The user study needs a shorter
-- wait (5 minutes) so a pair can finish a round inside one session, and
-- production keeps 15.
--
-- WHY A TABLE, NOT AN ENV VARIABLE: the rule is enforced by the database
-- (so nobody can skip it by calling the API), and Postgres can't read the
-- web app's environment. So the one setting lives here, and the app reads the
-- same row for its messages. Changing it needs no code change and no
-- redeploy:
--
--   update public.app_setting set value = '5'  where key = 'min_lobby_minutes';  -- study
--   update public.app_setting set value = '15' where key = 'min_lobby_minutes';  -- production
--
-- The app re-reads it at most a minute later. Lobbies already ended are judged
-- by whatever the setting is when someone rates, not when the lobby ended.
--
-- Run it all at once. The check at the bottom must show 15.

-- ── 1. Settings ─────────────────────────────────────────────────────────
create table if not exists public.app_setting (
  key text primary key,
  value text not null,
  description text,
  updated_at timestamptz not null default now()
);

alter table public.app_setting enable row level security;

-- Public on purpose: nothing secret belongs in here, and the app needs it
-- signed out too (the lobby page). Writes only from the SQL editor.
drop policy if exists "Anyone can read app settings" on public.app_setting;
create policy "Anyone can read app settings"
  on public.app_setting for select
  to anon, authenticated
  using (true);

grant select on public.app_setting to anon, authenticated;
revoke insert, update, delete on public.app_setting from anon, authenticated;

insert into public.app_setting (key, value, description) values
  ('min_lobby_minutes', '15',
   'Minutes a lobby must run (start to end) before its players can rate each other. 15 in production, 5 during the user study.')
on conflict (key) do nothing;

-- Keep it a sane whole number of minutes, so a typo can't turn ratings off.
alter table public.app_setting drop constraint if exists app_setting_min_lobby_minutes_check;
alter table public.app_setting add constraint app_setting_min_lobby_minutes_check
  check (key <> 'min_lobby_minutes' or value ~ '^[0-9]{1,3}$');

create or replace function public.touch_app_setting()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists app_setting_touch on public.app_setting;
create trigger app_setting_touch
  before update on public.app_setting
  for each row execute function public.touch_app_setting();

-- ── 2. One place that reads it ──────────────────────────────────────────
-- Falls back to 15 if the row is ever missing, never to "no minimum".
create or replace function public.min_lobby_interval()
returns interval
language sql
stable
security definer
set search_path = public
as $$
  select make_interval(mins => coalesce(
    (select value::int from public.app_setting where key = 'min_lobby_minutes'),
    15
  ));
$$;

revoke all on function public.min_lobby_interval() from public;
grant execute on function public.min_lobby_interval() to anon, authenticated;

-- ── 3. The rule itself: same as before, with the setting ────────────────
create or replace function public.can_review(p_lobby uuid, p_rater uuid, p_ratee uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.lobby l
    where l.id = p_lobby
      and l.status = 'completed'
      -- Rule 2: they really got to play.
      and l.started_at is not null
      and l.closed_at is not null
      and l.closed_at - l.started_at >= public.min_lobby_interval()
      -- Rule 3: both stayed until the lobby started.
      and public.played_in(p_lobby, p_rater)
      and public.played_in(p_lobby, p_ratee)
  );
$$;

-- ── 4. Check ────────────────────────────────────────────────────────────
do $check$
begin
  if public.min_lobby_interval() <> interval '15 minutes' then
    raise exception 'min_lobby_interval() should start at 15 minutes, got %',
      public.min_lobby_interval();
  end if;
  raise notice 'min_lobby_minutes ready: 15 minutes.';
end
$check$;

select key, value, updated_at from public.app_setting;
