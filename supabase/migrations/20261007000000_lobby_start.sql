-- Lobby lifecycle: a leader can START a lobby.
--
-- A lobby used to be live (looking for players), scheduled, or closed. The
-- lobby screen also has a moment in between that matters: the leader is done
-- recruiting and the group starts playing. That is the new status 'started':
--
--   live       looking for players right now          (shown in the LFG list)
--   scheduled  begins at starts_at                    (shown in the LFG list)
--   started    the group is playing; no new members   (not listed)
--   closed     ended by the leader
--
-- start_lobby() moves live or scheduled to started, which also closes the gap
-- where a scheduled lobby never went live. A started lobby no longer accepts
-- applications or accepts pending ones, and still counts as "the one live
-- lobby" a player may be in at a time. Nothing starts a lobby automatically.
--
-- The three functions below are re-created with only those changes; the rest
-- of their bodies is identical to 20261006000000_lobbies.sql.
--
-- Never edit this file once it has run — fix with a new migration.

alter table public.lobbies drop constraint lobbies_status_check;
alter table public.lobbies add constraint lobbies_status_check
  check (status in ('live', 'started', 'scheduled', 'closed'));

create or replace function public.create_lobby(
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
  p_role_ids smallint[]
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
begin
  if v_uid is null then
    raise exception 'not_signed_in';
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
    min_rank_id, max_rank_id, cover
  ) values (
    v_uid, p_game_id, p_mode_id, btrim(p_name), nullif(btrim(p_description), ''),
    p_region, coalesce(p_languages, '{}'), coalesce(p_mic_required, false),
    coalesce(p_tags, '{}'), p_capacity, v_status, p_starts_at, p_ends_at,
    p_min_rank_id, p_max_rank_id, p_cover
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

  -- Lock the lobby so two applications can't both take the last slot.
  select * into l from public.lobbies where id = p_lobby_id for update;
  if not found then
    raise exception 'lobby_not_found';
  end if;
  if l.status = 'closed' then
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

  if l.status = 'closed' then
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
  set status = 'accepted', decided_at = now()
  where id = a.id;
end;
$$;

-- Error codes added here: lobby_started, member_busy.
create function public.start_lobby(p_lobby_id uuid)
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

  select * into l from public.lobbies where id = p_lobby_id for update;
  if not found or l.leader_id <> v_uid then
    raise exception 'not_leader';
  end if;
  if l.status = 'closed' then
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

  update public.lobbies set status = 'started' where id = l.id;
end;
$$;

revoke all on function public.start_lobby(uuid) from public, anon;
grant execute on function public.start_lobby(uuid) to authenticated;
