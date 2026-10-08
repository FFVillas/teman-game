-- Lobby lifecycle: completed vs closed, reopening, automatic expiry, who
-- played, and a private voice link.
--
--   live       looking for players                   (listed)
--   scheduled  begins at starts_at                   (listed)
--   started    the group is playing; no new members  (not listed)
--   completed  a started lobby that was ended        (ratings hang off this)
--   closed     cancelled before it started
--
-- * 'completed' is new. Only completed lobbies will let teammates rate and
--   report each other, so nobody can rate someone they never played with.
-- * reopen_lobby(): a started lobby goes back to recruiting (a player left and
--   the leader wants a replacement).
-- * expire_stale_lobbies(): the safety net, see below.
-- * applications.joined_at / left_at record when someone was in. A player who
--   leaves AFTER the lobby started still played, so they stay ratable; one who
--   leaves before it started never did.
-- * lobbies.discord_url is a voice link only the leader and members may read.
--   The column grant is removed for the API roles, so it never appears in a
--   normal select; lobby_voice_link() is the only way to read it.
--
-- The write functions are re-created from the applied migrations with only the
-- changes above (create_lobby also gains p_discord_url, so its old signature
-- is dropped to avoid two overloads).
--
-- Never edit this file once it has run — fix with a new migration.

alter table public.lobbies drop constraint lobbies_status_check;
alter table public.lobbies add constraint lobbies_status_check
  check (status in ('live', 'started', 'scheduled', 'completed', 'closed'));

alter table public.lobbies
  add column started_at timestamptz,
  -- When the current phase began: opened, started or reopened. The expiry
  -- limits count from here.
  add column phase_since timestamptz not null default now(),
  add column discord_url text
    check (discord_url is null
           or discord_url ~ '^https://(discord\.gg|discord\.com/invite)/[A-Za-z0-9-]{2,32}$');

alter table public.applications
  add column joined_at timestamptz,
  add column left_at timestamptz;

-- Rows that already exist: accepted ones joined when they were decided, and a
-- lobby that is already started started "about now".
update public.applications set joined_at = decided_at
  where status = 'accepted' and joined_at is null;
update public.lobbies set started_at = now() where status = 'started' and started_at is null;

-- discord_url must not be readable by everyone: take the table-wide SELECT
-- away and grant every other column back.
revoke select on public.lobbies from anon, authenticated;
grant select (
  id, leader_id, game_id, mode_id, name, description, region, languages,
  mic_required, tags, capacity, status, starts_at, ends_at, min_rank_id,
  max_rank_id, cover, created_at, closed_at, started_at, phase_since
) on public.lobbies to anon, authenticated;

-- These read whole lobby rows for everyone, which the grant above no longer
-- allows to a plain caller. They only use public information, so run them as
-- the owner.
alter function public.lobby_join_bounds(uuid) security definer;
alter function public.can_join_lobby(uuid, uuid) security definer;

-- The safety net for a leader who forgets to end a lobby. Provisional limits
-- (change them here, in one place):
--   started    6 hours after it started (or was reopened)  -> completed
--   live       6 hours after it opened (or was reopened)   -> closed
--   scheduled  when it should have ended, else 3 hours after it was due
--              to start, and nobody started it             -> closed
-- There is no scheduler: this runs at the start of every lobby function and
-- whenever the app loads a list or a lobby, so stale lobbies drop out as soon
-- as anyone looks. A pg_cron job calling it would do the same on a clock.
create function public.expire_stale_lobbies()
returns void
language sql
security definer
set search_path = public
as $$
  update public.lobbies
  set status = 'completed', closed_at = now()
  where status = 'started' and phase_since < now() - interval '6 hours';

  update public.lobbies
  set status = 'closed', closed_at = now()
  where status = 'live' and phase_since < now() - interval '6 hours';

  update public.lobbies
  set status = 'closed', closed_at = now()
  where status = 'scheduled'
    and coalesce(ends_at, starts_at + interval '3 hours') < now();
$$;

drop function public.create_lobby(smallint, smallint, text, text, text, text[], boolean, text[], smallint, timestamptz, timestamptz, smallint, smallint, text, smallint[]);

create function public.create_lobby(
  p_game_id smallint,
  p_mode_id smallint,
  p_name text,
  p_description text,
  p_region text,
  p_languages text[],
  p_mic_required boolean,
  p_tags text[],
  p_capacity smallint,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_min_rank_id smallint,
  p_max_rank_id smallint,
  p_cover text,
  p_role_ids smallint[],
  p_discord_url text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_mode public.game_modes%rowtype;
  v_min integer;
  v_max integer;
  v_status text;
  v_id uuid;
  v_voice text := nullif(btrim(p_discord_url), '');
begin
  if v_uid is null then
    raise exception 'not_signed_in';
  end if;

  perform public.expire_stale_lobbies();

  if v_voice is not null and v_voice !~ '^https://(discord\.gg|discord\.com/invite)/[A-Za-z0-9-]{2,32}$' then
    raise exception 'voice_link_invalid';
  end if;

  select * into v_mode
  from public.game_modes where id = p_mode_id and game_id = p_game_id;
  if not found then
    raise exception 'game_or_mode_invalid';
  end if;

  if p_name is null or char_length(btrim(p_name)) not between 3 and 40 then
    raise exception 'name_invalid';
  end if;

  if p_capacity < 2 or p_capacity > v_mode.max_party then
    raise exception 'capacity_invalid';
  end if;

  if p_min_rank_id is not null and p_max_rank_id is not null then
    select ordinal into v_min from public.game_ranks
      where id = p_min_rank_id and game_id = p_game_id;
    select ordinal into v_max from public.game_ranks
      where id = p_max_rank_id and game_id = p_game_id;
    if v_min is null or v_max is null or v_min > v_max then
      raise exception 'rank_range_invalid';
    end if;
  end if;

  if p_starts_at is null then
    v_status := 'live';
  else
    v_status := 'scheduled';
    if p_starts_at < now() - interval '5 minutes'
       or (p_ends_at is not null and p_ends_at <= p_starts_at) then
      raise exception 'schedule_invalid';
    end if;
  end if;

  -- One live lobby at a time (leading or joined); several scheduled are fine.
  perform pg_advisory_xact_lock(hashtextextended(v_uid::text, 0));
  if v_status = 'live' and exists (
    select 1 from public.lobby_members lm
    join public.lobbies l on l.id = lm.lobby_id
    where lm.user_id = v_uid and l.status in ('live', 'started')
  ) then
    raise exception 'already_in_live_lobby';
  end if;

  insert into public.lobbies (
    leader_id, game_id, mode_id, name, description, region, languages,
    mic_required, tags, capacity, status, starts_at, ends_at,
    min_rank_id, max_rank_id, cover, discord_url
  ) values (
    v_uid, p_game_id, p_mode_id, btrim(p_name), nullif(btrim(p_description), ''),
    p_region, coalesce(p_languages, '{}'), coalesce(p_mic_required, false),
    coalesce(p_tags, '{}'), p_capacity, v_status, p_starts_at, p_ends_at,
    p_min_rank_id, p_max_rank_id, p_cover, v_voice
  ) returning id into v_id;

  if p_role_ids is not null and cardinality(p_role_ids) > 0 then
    insert into public.lobby_roles (lobby_id, game_id, role_id)
    select v_id, p_game_id, rid from unnest(p_role_ids) as rid
    on conflict do nothing;
  end if;

  return v_id;
end;
$$;

create or replace function public.apply_to_lobby(
  p_lobby_id uuid,
  p_role_id smallint default null,
  p_message text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  l public.lobbies%rowtype;
  v_taken integer;
  v_existing public.applications%rowtype;
  v_id uuid;
begin
  if v_uid is null then
    raise exception 'not_signed_in';
  end if;

  perform public.expire_stale_lobbies();

  -- Lock the lobby so two applications can't both take the last slot.
  select * into l from public.lobbies where id = p_lobby_id for update;
  if not found then
    raise exception 'lobby_not_found';
  end if;
  if l.status in ('closed', 'completed') then
    raise exception 'lobby_closed';
  end if;
  if l.status = 'started' then
    raise exception 'lobby_started';
  end if;
  if l.leader_id = v_uid then
    raise exception 'own_lobby';
  end if;

  select count(*) into v_taken from public.lobby_members where lobby_id = l.id;
  if v_taken >= l.capacity then
    raise exception 'lobby_full';
  end if;

  if p_role_id is not null and not exists (
    select 1 from public.game_roles where id = p_role_id and game_id = l.game_id
  ) then
    raise exception 'role_invalid';
  end if;

  if not public.can_join_lobby(l.id, v_uid) then
    raise exception 'rank_not_eligible';
  end if;

  select * into v_existing
  from public.applications
  where lobby_id = l.id and applicant_id = v_uid;

  if found then
    if v_existing.status in ('pending', 'accepted') then
      raise exception 'already_applied';
    elsif v_existing.status = 'declined' then
      raise exception 'application_declined';
    end if;
    -- 'left': reopen the same row.
    update public.applications
    set status = 'pending', role_id = p_role_id, message = p_message,
        decided_at = null, created_at = now()
    where id = v_existing.id
    returning id into v_id;
    return v_id;
  end if;

  insert into public.applications (lobby_id, game_id, applicant_id, role_id, message)
  values (l.id, l.game_id, v_uid, p_role_id, p_message)
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.respond_to_application(
  p_application_id uuid,
  p_accept boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  a public.applications%rowtype;
  l public.lobbies%rowtype;
  v_taken integer;
begin
  if v_uid is null then
    raise exception 'not_signed_in';
  end if;

  perform public.expire_stale_lobbies();

  select * into a from public.applications where id = p_application_id;
  if not found then
    raise exception 'not_in_lobby';
  end if;

  select * into l from public.lobbies where id = a.lobby_id for update;
  if l.leader_id <> v_uid then
    raise exception 'not_leader';
  end if;

  -- Re-read under the lock: it may have been decided a moment ago.
  select * into a from public.applications where id = p_application_id;
  if a.status <> 'pending' then
    raise exception 'not_pending';
  end if;

  if not p_accept then
    update public.applications
    set status = 'declined', decided_at = now()
    where id = a.id;
    return;
  end if;

  if l.status in ('closed', 'completed') then
    raise exception 'lobby_closed';
  end if;
  if l.status = 'started' then
    raise exception 'lobby_started';
  end if;

  select count(*) into v_taken from public.lobby_members where lobby_id = l.id;
  if v_taken >= l.capacity then
    raise exception 'lobby_full';
  end if;

  -- Who is in has changed since they applied, so check the rank again.
  if not public.can_join_lobby(l.id, a.applicant_id) then
    raise exception 'rank_not_eligible';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(a.applicant_id::text, 0));
  if l.status = 'live' and exists (
    select 1 from public.lobby_members lm
    join public.lobbies o on o.id = lm.lobby_id
    where lm.user_id = a.applicant_id and o.status in ('live', 'started') and o.id <> l.id
  ) then
    raise exception 'applicant_busy';
  end if;

  update public.applications
  set status = 'accepted', decided_at = now(), joined_at = now()
  where id = a.id;
end;
$$;

create or replace function public.leave_lobby(p_lobby_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_rows integer;
begin
  if v_uid is null then
    raise exception 'not_signed_in';
  end if;

  update public.applications
  set status = 'left', decided_at = now(), left_at = now()
  where lobby_id = p_lobby_id
    and applicant_id = v_uid
    and status in ('pending', 'accepted');
  get diagnostics v_rows = row_count;

  if v_rows = 0 then
    raise exception 'not_in_lobby';
  end if;
end;
$$;

create or replace function public.start_lobby(p_lobby_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  l public.lobbies%rowtype;
begin
  if v_uid is null then
    raise exception 'not_signed_in';
  end if;

  perform public.expire_stale_lobbies();

  select * into l from public.lobbies where id = p_lobby_id for update;
  if not found or l.leader_id <> v_uid then
    raise exception 'not_leader';
  end if;
  if l.status in ('closed', 'completed') then
    raise exception 'lobby_closed';
  end if;
  if l.status = 'started' then
    raise exception 'lobby_started';
  end if;

  -- Starting makes this the lobby everyone in it is playing in, so nobody in
  -- it may already be in another live or started lobby.
  perform pg_advisory_xact_lock(hashtextextended(v_uid::text, 0));
  if exists (
    select 1
    from public.lobby_members mine
    join public.lobby_members other on other.user_id = mine.user_id
    join public.lobbies o on o.id = other.lobby_id
    where mine.lobby_id = l.id
      and o.id <> l.id
      and o.status in ('live', 'started')
  ) then
    raise exception 'member_busy';
  end if;

  update public.lobbies
  set status = 'started',
      started_at = coalesce(started_at, now()),
      phase_since = now()
  where id = l.id;
end;
$$;

create or replace function public.close_lobby(p_lobby_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_rows integer;
begin
  if v_uid is null then
    raise exception 'not_signed_in';
  end if;

  -- Ending a lobby that was started is a finished session ('completed', which
  -- is what ratings will hang off); closing one that never started is a
  -- cancellation ('closed').
  update public.lobbies
  set status = case when status = 'started' then 'completed' else 'closed' end,
      closed_at = now()
  where id = p_lobby_id
    and leader_id = v_uid
    and status in ('live', 'scheduled', 'started');
  get diagnostics v_rows = row_count;

  if v_rows = 0 then
    raise exception 'not_leader';
  end if;
end;
$$;

-- Error code added here: not_started, voice_link_invalid.
create function public.reopen_lobby(p_lobby_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  l public.lobbies%rowtype;
  v_taken integer;
begin
  if v_uid is null then
    raise exception 'not_signed_in';
  end if;

  perform public.expire_stale_lobbies();

  select * into l from public.lobbies where id = p_lobby_id for update;
  if not found or l.leader_id <> v_uid then
    raise exception 'not_leader';
  end if;
  if l.status <> 'started' then
    raise exception 'not_started';
  end if;

  select count(*) into v_taken from public.lobby_members where lobby_id = l.id;
  if v_taken >= l.capacity then
    raise exception 'lobby_full';
  end if;

  -- Back to recruiting. The phase clock restarts so the lobby gets a fresh
  -- window before it expires.
  update public.lobbies
  set status = 'live', phase_since = now()
  where id = l.id;
end;
$$;

-- The voice link is private to the people in the lobby. The column cannot be
-- read through the API at all (see the grants below); this is the only way to
-- get it, and it answers only for the leader and accepted members.
create function public.lobby_voice_link(p_lobby_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select l.discord_url
  from public.lobbies l
  where l.id = p_lobby_id
    and auth.uid() is not null
    and (
      l.leader_id = auth.uid()
      or exists (
        select 1 from public.applications a
        where a.lobby_id = l.id
          and a.applicant_id = auth.uid()
          and a.status = 'accepted'
      )
    );
$$;

revoke all on function public.expire_stale_lobbies() from public;
grant execute on function public.expire_stale_lobbies() to anon, authenticated;
revoke all on function public.lobby_voice_link(uuid) from public, anon;
grant execute on function public.lobby_voice_link(uuid) to authenticated;
revoke all on function public.reopen_lobby(uuid) from public, anon;
grant execute on function public.reopen_lobby(uuid) to authenticated;
revoke all on function public.create_lobby(smallint, smallint, text, text, text, text[], boolean, text[], smallint, timestamptz, timestamptz, smallint, smallint, text, smallint[], text) from public, anon;
grant execute on function public.create_lobby(smallint, smallint, text, text, text, text[], boolean, text[], smallint, timestamptz, timestamptz, smallint, smallint, text, smallint[], text) to authenticated;
