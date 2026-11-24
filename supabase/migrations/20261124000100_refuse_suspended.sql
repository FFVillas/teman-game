-- A suspended player can't DO anything through the API (TC-137, TC-140).
--
-- Until now a suspension was enforced when signing in and, in the app, on a
-- full page load. A session that was already open kept working: moving around
-- by links never reloads the page, and the database accepted everything it
-- sent, so a suspended player could still create a lobby.
--
-- This closes the database half in ONE place instead of in every function:
-- PostgREST calls `refuse_suspended()` before each API request. It looks at
-- requests that could write and refuses them with `account_suspended` (HTTP
-- 403) when the caller is under an active suspension. The app half (leaving
-- the page at once) is components/SuspensionWatcher.tsx.
--
-- Reads (GET) pass: the player still needs to be told why they were signed
-- out, and they are sent away by the app. So do the functions in the list
-- below: they only read, or keep the books, and supabase-js calls every
-- function with POST. `delete_my_account` has its own refusal.
--
-- Not covered: Storage uploads (an uploaded file can't be attached to
-- anything) and what Realtime sends to a tab until it is closed.
--
-- TO TURN IT OFF, if it ever misbehaves:
--   alter role authenticator reset pgrst.db_pre_request;
--   notify pgrst, 'reload config';
--
-- Run it all at once. Step 3 tests the function and rolls its test data back;
-- if the test fails, nothing here is applied.

-- ── 1. Looked up on every write, so it gets its own small index ─────────
create index if not exists sanction_active_suspension_idx
  on public.sanction (player_id)
  where type = 'suspension' and lifted_at is null;

-- ── 2. The check ────────────────────────────────────────────────────────
create or replace function public.refuse_suspended()
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_method text := coalesce(current_setting('request.method', true), '');
  v_path text := coalesce(current_setting('request.path', true), '');
begin
  -- Signed out, or only reading.
  if v_uid is null or v_method in ('', 'GET', 'HEAD', 'OPTIONS') then
    return;
  end if;

  if v_path ~ ('/rpc/(my_active_suspension|sanction_history|profile_age'
            || '|player_matches|tag_strengths|can_join_lobby|can_review'
            || '|lobby_join_bounds|expire_stale_lobbies|release_due_reviews'
            || '|unregister_push_token|delete_my_account)$') then
    return;
  end if;

  if exists (
    select 1
    from public.sanction s
    where s.player_id = v_uid
      and s.type = 'suspension'
      and s.lifted_at is null
      and s.issued_at <= now()
      and (s.expires_at is null or s.expires_at > now())
  ) then
    -- PTxyz is PostgREST's way of choosing the HTTP status: 403.
    raise sqlstate 'PT403' using
      message = 'account_suspended',
      hint = 'Your account is suspended.';
  end if;
end;
$$;

revoke all on function public.refuse_suspended() from public;
-- It runs as whichever role made the request.
grant execute on function public.refuse_suspended() to anon, authenticated, service_role;

-- ── 3. Test it before switching it on ───────────────────────────────────
-- Everything inside is undone by the 'undo_test' exception.
do $test$
declare
  v_admin uuid := (select user_id from public.admins order by user_id limit 1);
  v_player uuid := (
    select p.id from public.profiles p
    where not exists (select 1 from public.admins a where a.user_id = p.id)
      and not exists (select 1 from public.sanction s where s.player_id = p.id)
    order by p.id limit 1
  );

  v_refused boolean;
begin
  if v_admin is null or v_player is null then
    raise notice 'No admin or no player to test with; test skipped.';
    return;
  end if;

  begin
    perform set_config('request.jwt.claims', json_build_object('sub', v_player)::text, true);
    perform set_config('request.jwt.claim.sub', v_player::text, true);
    perform set_config('request.method', 'POST', true);
    perform set_config('request.path', '/rpc/create_lobby', true);

    -- Not suspended: passes.
    perform public.refuse_suspended();

    insert into public.sanction (player_id, type, duration_days, reason, note, issued_by, issued_at, expires_at)
    values (v_player, 'suspension', 1, 'migration test', 'migration test', v_admin, now(), now() + interval '1 day');

    v_refused := false;
    begin
      perform public.refuse_suspended();
    exception when sqlstate 'PT403' then
      v_refused := true;
    end;
    if not v_refused then
      raise exception 'refuse_suspended let a suspended player write';
    end if;

    -- The way out stays open, and so does reading.
    perform set_config('request.path', '/rpc/my_active_suspension', true);
    perform public.refuse_suspended();
    perform set_config('request.method', 'GET', true);
    perform set_config('request.path', '/profiles', true);
    perform public.refuse_suspended();

    -- Expired or lifted: passes again.
    perform set_config('request.method', 'POST', true);
    perform set_config('request.path', '/rpc/create_lobby', true);
    update public.sanction
    set issued_at = now() - interval '2 days', expires_at = now() - interval '1 day'
    where player_id = v_player and reason = 'migration test';
    perform public.refuse_suspended();

    raise exception 'undo_test';
  exception when others then
    if sqlerrm <> 'undo_test' then
      raise;
    end if;
  end;

  raise notice 'refuse_suspended: test passed';
end;
$test$;

-- ── 4. Switch it on ─────────────────────────────────────────────────────
alter role authenticator set pgrst.db_pre_request = 'public.refuse_suspended';
notify pgrst, 'reload config';

-- Check: expect one row naming public.refuse_suspended.
select unnest(rolconfig) as setting
from pg_roles
where rolname = 'authenticator' and rolconfig::text like '%db_pre_request%';
