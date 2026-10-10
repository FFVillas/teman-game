-- Editing a lobby, and removing a member.
--
-- * update_lobby(): the leader edits a lobby. Name, description, region,
--   languages, mic, tags and the voice link can change any time the lobby is
--   not over. While it is only recruiting (live or scheduled) the group size,
--   accepted rank range, wanted roles and schedule can change too; once it
--   has started they are locked. The game and mode never change (they decide
--   which party rule applies). The group size can't drop below the people
--   already in. Members are never removed by a change of range.
-- * remove_member(): the leader removes a member. It is recorded like leaving
--   (status 'left' with left_at), so a player removed after the lobby started
--   still counts as having played. They may apply again; that reopens the
--   same application, as it does for anyone who left.
--
-- Never edit this file once it has run — fix with a new migration.

create function public.update_lobby(
  p_lobby_id uuid,
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
  p_role_ids smallint[],
  p_discord_url text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  l public.lobbies%rowtype;
  v_mode public.game_modes%rowtype;
  v_voice text := nullif(btrim(p_discord_url), '');
  v_taken integer;
  v_min integer;
  v_max integer;
  v_status text;
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

  if p_name is null or char_length(btrim(p_name)) not between 3 and 40 then
    raise exception 'name_invalid';
  end if;
  if v_voice is not null and v_voice !~ '^https://(discord\.gg|discord\.com/invite)/[A-Za-z0-9-]{2,32}$' then
    raise exception 'voice_link_invalid';
  end if;

  -- Editable in every state a lobby can be edited in.
  update public.lobbies
  set name = btrim(p_name),
      description = nullif(btrim(p_description), ''),
      region = p_region,
      languages = coalesce(p_languages, '{}'),
      mic_required = coalesce(p_mic_required, false),
      tags = coalesce(p_tags, '{}'),
      discord_url = v_voice
  where id = l.id;

  -- While the group is playing, the rest is locked.
  if l.status = 'started' then
    return;
  end if;

  select * into v_mode
  from public.game_modes where id = l.mode_id and game_id = l.game_id;
  select count(*) into v_taken from public.lobby_members where lobby_id = l.id;

  if p_capacity < 2 or p_capacity > v_mode.max_party or p_capacity < v_taken then
    raise exception 'capacity_invalid';
  end if;

  if p_min_rank_id is not null and p_max_rank_id is not null then
    select ordinal into v_min from public.game_ranks
      where id = p_min_rank_id and game_id = l.game_id;
    select ordinal into v_max from public.game_ranks
      where id = p_max_rank_id and game_id = l.game_id;
    if v_min is null or v_max is null or v_min > v_max then
      raise exception 'rank_range_invalid';
    end if;
  end if;

  if p_starts_at is null then
    v_status := 'live';
  else
    v_status := 'scheduled';
    -- Saving a lobby whose start has just passed, without touching the time,
    -- must not fail.
    if (p_starts_at < now() - interval '5 minutes'
        and p_starts_at is distinct from l.starts_at)
       or (p_ends_at is not null and p_ends_at <= p_starts_at) then
      raise exception 'schedule_invalid';
    end if;
  end if;

  -- Moving a scheduled lobby to "looking now" makes it a live one.
  if v_status = 'live' and l.status = 'scheduled' then
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
  end if;

  update public.lobbies
  set capacity = p_capacity,
      min_rank_id = p_min_rank_id,
      max_rank_id = p_max_rank_id,
      starts_at = p_starts_at,
      ends_at = p_ends_at,
      status = v_status,
      phase_since = case when v_status <> l.status then now() else phase_since end
  where id = l.id;

  delete from public.lobby_roles where lobby_id = l.id;
  if p_role_ids is not null and cardinality(p_role_ids) > 0 then
    insert into public.lobby_roles (lobby_id, game_id, role_id)
    select l.id, l.game_id, rid from unnest(p_role_ids) as rid
    on conflict do nothing;
  end if;
end;
$$;

create function public.remove_member(p_lobby_id uuid, p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  l public.lobbies%rowtype;
  v_rows integer;
begin
  if v_uid is null then
    raise exception 'not_signed_in';
  end if;

  select * into l from public.lobbies where id = p_lobby_id for update;
  if not found or l.leader_id <> v_uid then
    raise exception 'not_leader';
  end if;
  if l.status in ('closed', 'completed') then
    raise exception 'lobby_closed';
  end if;

  update public.applications
  set status = 'left', decided_at = now(), left_at = now()
  where lobby_id = p_lobby_id
    and applicant_id = p_user_id
    and status = 'accepted';
  get diagnostics v_rows = row_count;

  if v_rows = 0 then
    raise exception 'not_in_lobby';
  end if;
end;
$$;

revoke all on function public.update_lobby(uuid, text, text, text, text[], boolean, text[], smallint, timestamptz, timestamptz, smallint, smallint, smallint[], text) from public, anon;
grant execute on function public.update_lobby(uuid, text, text, text, text[], boolean, text[], smallint, timestamptz, timestamptz, smallint, smallint, smallint[], text) to authenticated;
revoke all on function public.remove_member(uuid, uuid) from public, anon;
grant execute on function public.remove_member(uuid, uuid) to authenticated;
