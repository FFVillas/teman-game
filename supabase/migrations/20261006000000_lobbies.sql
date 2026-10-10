-- Lobby slice — lobbies, who a lobby is looking for, and applications.
-- Everything a player does here (create, apply, accept, leave, close) goes
-- through a function, not a bare INSERT/UPDATE, so the rules below hold no
-- matter who calls the API.
--
-- DIVERGENCES FROM THE PROPOSAL (also logged in docs/thesis-divergences.md):
--   * game_modes — new table. A lobby points at a mode instead of holding
--     free text, so mode names stay consistent and the party rule travels
--     with the mode. Replaces src/data/game-modes.ts.
--   * lobby_roles — new table. A lobby can look for several roles.
--   * Optional accepted rank range on `lobbies` (min_rank_id, max_rank_id,
--     both nullable) next to the leader's own rank that M_rank already uses.
--     The range is an ELIGIBILITY filter; M_rank stays the ORDERING.
--   * Party rules are data, not code: game_modes.party_* and
--     game_ranks.party_band. They replace partyRuleFor() in src/lib/ranks.ts
--     once the app reads them from here, so there is one source of truth.
--   * No lobby_members table. Members are the leader plus every accepted
--     application (view `lobby_members`).
--
-- Never edit this file once it has run — fix with a new migration.
--
-- WHAT IS NOT HERE YET: a scheduled lobby does not go live by itself, and
-- nothing expires old lobbies. Chat, invites, ratings and kicking a member
-- are later slices.

-- ── Party rules as data ─────────────────────────────────────────────────
-- Free Fire ranked parties must stay inside one band of tiers. Everything
-- else compares tiers or divisions by position, which needs no extra column.
alter table public.game_ranks add column party_band smallint;

update public.game_ranks r
set party_band = case when r.tier in ('Heroic', 'Grandmaster') then 2 else 1 end
from public.games g
where g.id = r.game_id and g.slug = 'free-fire';

-- ── game_modes ──────────────────────────────────────────────────────────
create table public.game_modes (
  id smallint generated always as identity primary key,
  game_id smallint not null references public.games (id) on delete cascade,
  -- Stable key the app can rely on ('competitive', 'ranked-solo-duo').
  value text not null check (value ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  label text not null,
  kind text not null check (kind in ('ranked', 'casual', 'tournament')),
  -- Largest premade group the queue allows; caps a lobby's capacity.
  max_party smallint not null check (max_party between 1 and 5),
  -- Comes and goes with patches or events.
  rotating boolean not null default false,
  sort_order smallint not null default 0,
  -- How far apart ranks in one party may be:
  --   none  no limit
  --   tiers members at most party_max_apart tiers apart
  --   steps members at most party_max_apart divisions apart
  --   bands members must share one party_band (see game_ranks)
  party_rule text not null default 'none'
    check (party_rule in ('none', 'tiers', 'steps', 'bands')),
  party_max_apart smallint check (party_max_apart >= 0),
  -- The rule only applies to lobbies of at most this many slots (null = any
  -- size). Valorant: a full five-stack has no rank limit.
  party_rule_max_capacity smallint,
  unique (game_id, value),
  unique (game_id, id),
  check (party_rule not in ('tiers', 'steps') or party_max_apart is not null)
);

-- Seeded from src/data/game-modes.ts (group-play modes only). Rules are the
-- approximations documented in docs/game-reference.md ("Who can play
-- together"); they are guides' wording, not the games' own support pages.
insert into public.game_modes
  (game_id, value, label, kind, max_party, rotating, sort_order,
   party_rule, party_max_apart, party_rule_max_capacity)
select g.id, m.value, m.label, m.kind, m.max_party, m.rotating, m.sort_order,
       m.party_rule, m.party_max_apart, m.party_rule_max_capacity
from public.games g
join (values
  -- Valorant
  ('valorant', 'competitive', 'Competitive', 'ranked',     5, false, 1, 'tiers', 1, 4),
  ('valorant', 'premier',     'Premier',     'tournament', 5, false, 2, 'none', null, null),
  ('valorant', 'unrated',     'Unrated',     'casual',     5, false, 3, 'none', null, null),
  ('valorant', 'swiftplay',   'Swiftplay',   'casual',     5, false, 4, 'none', null, null),
  ('valorant', 'spike-rush',  'Spike Rush',  'casual',     5, false, 5, 'none', null, null),
  -- League of Legends
  ('league-of-legends', 'ranked-solo-duo', 'Ranked Solo/Duo', 'ranked',     2, false, 1, 'tiers', 1, null),
  ('league-of-legends', 'ranked-flex',     'Ranked Flex',     'ranked',     5, false, 2, 'none', null, null),
  ('league-of-legends', 'normal-draft',    'Normal Draft',    'casual',     5, false, 3, 'none', null, null),
  ('league-of-legends', 'swiftplay',       'Swiftplay',       'casual',     5, false, 4, 'none', null, null),
  ('league-of-legends', 'aram',            'ARAM',            'casual',     5, false, 5, 'none', null, null),
  ('league-of-legends', 'aram-mayhem',     'ARAM Mayhem',     'casual',     5, true,  6, 'none', null, null),
  ('league-of-legends', 'arena',           'Arena',           'casual',     2, true,  7, 'none', null, null),
  ('league-of-legends', 'urf',             'URF',             'casual',     5, true,  8, 'none', null, null),
  ('league-of-legends', 'clash',           'Clash',           'tournament', 5, true,  9, 'none', null, null),
  -- Counter-Strike 2 (the limit is a CS Rating gap, which a ladder can't express)
  ('counter-strike-2', 'premier',     'Premier',     'ranked', 5, false, 1, 'none', null, null),
  ('counter-strike-2', 'competitive', 'Competitive', 'ranked', 5, false, 2, 'none', null, null),
  ('counter-strike-2', 'wingman',     'Wingman',     'ranked', 2, false, 3, 'none', null, null),
  ('counter-strike-2', 'casual',      'Casual',      'casual', 5, false, 4, 'none', null, null),
  -- Mobile Legends
  ('mobile-legends', 'ranked', 'Ranked',            'ranked', 5, false, 1, 'tiers', 2, null),
  ('mobile-legends', 'classic', 'Classic',          'casual', 5, false, 2, 'none', null, null),
  ('mobile-legends', 'brawl',  'Brawl',             'casual', 5, false, 3, 'none', null, null),
  ('mobile-legends', 'custom', 'Custom',            'casual', 5, false, 4, 'none', null, null),
  ('mobile-legends', 'arcade', 'Arcade (rotating)', 'casual', 5, true,  5, 'none', null, null),
  -- PUBG Mobile
  ('pubg-mobile', 'ranked-squad',    'Ranked Squad',    'ranked', 4, false, 1, 'steps', 10, null),
  ('pubg-mobile', 'ranked-duo',      'Ranked Duo',      'ranked', 2, false, 2, 'steps', 10, null),
  ('pubg-mobile', 'classic-squad',   'Classic Squad',   'casual', 4, false, 3, 'none', null, null),
  ('pubg-mobile', 'classic-duo',     'Classic Duo',     'casual', 2, false, 4, 'none', null, null),
  ('pubg-mobile', 'team-deathmatch', 'Team Deathmatch', 'casual', 4, false, 5, 'none', null, null),
  ('pubg-mobile', 'ultimate-arena',  'Ultimate Arena',  'casual', 4, false, 6, 'none', null, null),
  ('pubg-mobile', 'payload',         'Payload',         'casual', 4, false, 7, 'none', null, null),
  -- Free Fire
  ('free-fire', 'br-ranked-squad',    'Battle Royale Ranked Squad', 'ranked', 4, false, 1, 'bands', null, null),
  ('free-fire', 'br-ranked-duo',      'Battle Royale Ranked Duo',   'ranked', 2, false, 2, 'bands', null, null),
  ('free-fire', 'br-squad',           'Battle Royale Squad',        'casual', 4, false, 3, 'none', null, null),
  ('free-fire', 'br-duo',             'Battle Royale Duo',          'casual', 2, false, 4, 'none', null, null),
  ('free-fire', 'clash-squad-ranked', 'Clash Squad Ranked',         'ranked', 4, false, 5, 'bands', null, null),
  ('free-fire', 'clash-squad',        'Clash Squad',                'casual', 4, false, 6, 'none', null, null),
  ('free-fire', 'lone-wolf',          'Lone Wolf',                  'casual', 2, false, 7, 'none', null, null)
) as m(slug, value, label, kind, max_party, rotating, sort_order,
       party_rule, party_max_apart, party_rule_max_capacity)
  on m.slug = g.slug;

-- ── lobbies ─────────────────────────────────────────────────────────────
create table public.lobbies (
  id uuid primary key default gen_random_uuid(),
  leader_id uuid not null references public.profiles (id) on delete cascade,
  game_id smallint not null references public.games (id),
  mode_id smallint not null,
  name text not null check (char_length(btrim(name)) between 3 and 40),
  description text check (char_length(description) <= 300),
  -- A region code from src/data/game-regions.ts ('AP'), not a label.
  region text not null check (char_length(region) between 1 and 40),
  languages text[] not null default '{}' check (cardinality(languages) <= 4),
  mic_required boolean not null default false,
  -- Vibe tags from the create form ("Competitive", "Chill"…).
  tags text[] not null default '{}' check (cardinality(tags) <= 5),
  -- Total slots including the leader.
  capacity smallint not null check (capacity between 2 and 5),
  -- live      looking for players right now
  -- scheduled starts at starts_at; several scheduled lobbies are allowed
  -- closed    ended by the leader
  status text not null default 'live'
    check (status in ('live', 'scheduled', 'closed')),
  starts_at timestamptz,
  ends_at timestamptz,
  -- Optional accepted rank range. Null on a side means no limit there; both
  -- null means "Any rank". Must belong to this game (composite keys below).
  min_rank_id smallint,
  max_rank_id smallint,
  -- A key into the app's cover list for this game, e.g. 'valorant/3'.
  cover text check (cover is null or cover ~ '^[a-z0-9-]+/[0-9]{1,2}$'),
  created_at timestamptz not null default now(),
  closed_at timestamptz,
  foreign key (game_id, mode_id) references public.game_modes (game_id, id),
  foreign key (game_id, min_rank_id) references public.game_ranks (game_id, id),
  foreign key (game_id, max_rank_id) references public.game_ranks (game_id, id),
  -- Lets child tables prove "this lobby belongs to this game".
  unique (id, game_id),
  check (status <> 'scheduled' or starts_at is not null),
  check (ends_at is null or starts_at is null or ends_at > starts_at)
);

create index lobbies_browse_idx on public.lobbies (game_id, status, created_at desc);
create index lobbies_leader_idx on public.lobbies (leader_id);

create table public.lobby_roles (
  lobby_id uuid not null,
  game_id smallint not null,
  role_id smallint not null,
  primary key (lobby_id, role_id),
  foreign key (lobby_id, game_id)
    references public.lobbies (id, game_id) on delete cascade,
  foreign key (game_id, role_id) references public.game_roles (game_id, id)
);

-- ── applications ────────────────────────────────────────────────────────
create table public.applications (
  id uuid primary key default gen_random_uuid(),
  lobby_id uuid not null,
  -- Copied from the lobby so the role below can be checked against the game.
  game_id smallint not null,
  applicant_id uuid not null references public.profiles (id) on delete cascade,
  -- The role they would play; null for games without roles.
  role_id smallint,
  message text check (char_length(message) <= 280),
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'declined', 'left')),
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  foreign key (lobby_id, game_id)
    references public.lobbies (id, game_id) on delete cascade,
  foreign key (game_id, role_id) references public.game_roles (game_id, id),
  -- One application per player per lobby; applying again after leaving
  -- reopens the same row.
  unique (lobby_id, applicant_id)
);

create index applications_applicant_idx on public.applications (applicant_id);

-- ── Members: the leader plus every accepted application ─────────────────
create view public.lobby_members
with (security_invoker = true) as
  select l.id as lobby_id, l.leader_id as user_id, true as is_leader,
         l.created_at as joined_at
  from public.lobbies l
  union all
  select a.lobby_id, a.applicant_id, false, a.decided_at
  from public.applications a
  where a.status = 'accepted';

-- ── Who may join: the one place the rule lives ──────────────────────────
-- Returns inclusive ordinal limits (null = no limit on that side). min > max
-- means nobody can join. Mirrors lobbyJoinBounds() in src/lib/ranks.ts: the
-- game's party rule applied to the people already in, intersected with the
-- range the leader chose. A member with no rank set is skipped, like the app.
create function public.lobby_join_bounds(p_lobby_id uuid)
returns table (min_ordinal integer, max_ordinal integer)
language plpgsql
stable
set search_path = public
as $$
declare
  l public.lobbies%rowtype;
  m public.game_modes%rowtype;
  v_members integer[];
  v_pmin integer;
  v_pmax integer;
  v_cmin integer;
  v_cmax integer;
  v_lo integer;
  v_hi integer;
  v_n integer;
  v_from integer;
  v_to integer;
  v_bands integer;
begin
  select * into l from public.lobbies where id = p_lobby_id;
  if not found then
    return;
  end if;
  select * into m from public.game_modes where game_id = l.game_id and id = l.mode_id;

  select coalesce(array_agg(r.ordinal::integer), '{}')
    into v_members
  from public.lobby_members lm
  join public.user_game_mapping ugm
    on ugm.user_id = lm.user_id and ugm.game_id = l.game_id
  join public.game_ranks r on r.id = ugm.rank_id
  where lm.lobby_id = p_lobby_id;

  -- 1. The game's party rule, applied to who is already in.
  if m.party_rule = 'none'
     or cardinality(v_members) = 0
     or (m.party_rule_max_capacity is not null and l.capacity > m.party_rule_max_capacity)
  then
    v_pmin := null;
    v_pmax := null;

  elsif m.party_rule = 'steps' then
    select min(o), max(o) into v_lo, v_hi from unnest(v_members) as o;
    v_pmin := v_hi - m.party_max_apart;
    v_pmax := v_lo + m.party_max_apart;

  elsif m.party_rule = 'tiers' then
    with tiers as (
      select tier,
             min(ordinal)::integer as first_o,
             max(ordinal)::integer as last_o,
             (row_number() over (order by min(ordinal)) - 1)::integer as idx
      from public.game_ranks
      where game_id = l.game_id
      group by tier
    ),
    member_tiers as (
      select t.idx
      from tiers t
      where exists (
        select 1 from unnest(v_members) as o where o between t.first_o and t.last_o
      )
    )
    select (select min(idx) from member_tiers),
           (select max(idx) from member_tiers),
           (select count(*) from tiers)
      into v_lo, v_hi, v_n;

    if v_lo is null then
      v_pmin := null;
      v_pmax := null;
    else
      v_from := greatest(0, v_hi - m.party_max_apart);
      v_to := least(v_n - 1, v_lo + m.party_max_apart);
      if v_from > v_to then
        v_pmin := 1;
        v_pmax := 0;
      else
        with tiers as (
          select min(ordinal)::integer as first_o,
                 max(ordinal)::integer as last_o,
                 (row_number() over (order by min(ordinal)) - 1)::integer as idx
          from public.game_ranks
          where game_id = l.game_id
          group by tier
        )
        select (select first_o from tiers where idx = v_from),
               (select last_o from tiers where idx = v_to)
          into v_pmin, v_pmax;
      end if;
    end if;

  else -- bands: every member in one band, and the newcomer joins that band
    select count(distinct r.party_band),
           count(*) filter (where r.party_band is null)
      into v_bands, v_n
    from public.lobby_members lm
    join public.user_game_mapping ugm
      on ugm.user_id = lm.user_id and ugm.game_id = l.game_id
    join public.game_ranks r on r.id = ugm.rank_id
    where lm.lobby_id = p_lobby_id;

    if v_bands > 1 or v_n > 0 then
      v_pmin := 1;
      v_pmax := 0;
    else
      select min(r.ordinal), max(r.ordinal)
        into v_pmin, v_pmax
      from public.game_ranks r
      where r.game_id = l.game_id
        and r.party_band = (
          select r2.party_band
          from public.lobby_members lm
          join public.user_game_mapping ugm
            on ugm.user_id = lm.user_id and ugm.game_id = l.game_id
          join public.game_ranks r2 on r2.id = ugm.rank_id
          where lm.lobby_id = p_lobby_id
          limit 1
        );
    end if;
  end if;

  -- 2. The range the leader chose.
  select min(r.ordinal)::integer into v_cmin
  from public.game_ranks r where r.id = l.min_rank_id;
  select max(r.ordinal)::integer into v_cmax
  from public.game_ranks r where r.id = l.max_rank_id;

  -- 3. Both at once.
  min_ordinal := case
    when v_pmin is null then v_cmin
    when v_cmin is null then v_pmin
    else greatest(v_pmin, v_cmin) end;
  max_ordinal := case
    when v_pmax is null then v_cmax
    when v_cmax is null then v_pmax
    else least(v_pmax, v_cmax) end;
  return next;
end;
$$;

-- Whether a player (by auth id) fits a lobby right now. A player with no rank
-- in the game fits everything, as in the app.
create function public.can_join_lobby(p_lobby_id uuid, p_user_id uuid)
returns boolean
language plpgsql
stable
set search_path = public
as $$
declare
  v_game smallint;
  v_ord integer;
  b record;
begin
  select game_id into v_game from public.lobbies where id = p_lobby_id;
  if v_game is null then
    return false;
  end if;

  select r.ordinal::integer into v_ord
  from public.user_game_mapping ugm
  join public.game_ranks r on r.id = ugm.rank_id
  where ugm.user_id = p_user_id and ugm.game_id = v_game;

  if v_ord is null then
    return true;
  end if;

  select * into b from public.lobby_join_bounds(p_lobby_id);
  return (b.min_ordinal is null or v_ord >= b.min_ordinal)
     and (b.max_ordinal is null or v_ord <= b.max_ordinal);
end;
$$;

-- ── Writes: all through functions ───────────────────────────────────────
-- Error messages are stable codes the app maps to wording:
--   not_signed_in, game_or_mode_invalid, name_invalid, capacity_invalid,
--   rank_range_invalid, schedule_invalid, already_in_live_lobby,
--   lobby_not_found, lobby_closed, own_lobby, lobby_full, role_invalid,
--   already_applied, application_declined, rank_not_eligible,
--   not_leader, not_pending, applicant_busy, not_in_lobby

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
    where lm.user_id = v_uid and l.status = 'live'
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

create function public.apply_to_lobby(
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

create function public.respond_to_application(
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
    where lm.user_id = a.applicant_id and o.status = 'live' and o.id <> l.id
  ) then
    raise exception 'applicant_busy';
  end if;

  update public.applications
  set status = 'accepted', decided_at = now()
  where id = a.id;
end;
$$;

-- An applicant withdraws, or a joined player leaves.
create function public.leave_lobby(p_lobby_id uuid)
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
  set status = 'left', decided_at = now()
  where lobby_id = p_lobby_id
    and applicant_id = v_uid
    and status in ('pending', 'accepted');
  get diagnostics v_rows = row_count;

  if v_rows = 0 then
    raise exception 'not_in_lobby';
  end if;
end;
$$;

create function public.close_lobby(p_lobby_id uuid)
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

  update public.lobbies
  set status = 'closed', closed_at = now()
  where id = p_lobby_id and leader_id = v_uid and status <> 'closed';
  get diagnostics v_rows = row_count;

  if v_rows = 0 then
    raise exception 'not_leader';
  end if;
end;
$$;

-- ── Access ──────────────────────────────────────────────────────────────
alter table public.game_modes enable row level security;
alter table public.lobbies enable row level security;
alter table public.lobby_roles enable row level security;
alter table public.applications enable row level security;

create policy "Game modes are publicly readable"
  on public.game_modes for select to anon, authenticated using (true);

-- Lobbies are discovery content, browsable without an account.
create policy "Lobbies are publicly readable"
  on public.lobbies for select to anon, authenticated using (true);
create policy "Lobby roles are publicly readable"
  on public.lobby_roles for select to anon, authenticated using (true);

-- Accepted applications are public (they are the roster shown on a card).
-- A pending or declined one is private to the applicant and the leader.
create policy "Roster and own applications are readable"
  on public.applications for select to anon, authenticated
  using (
    status = 'accepted'
    or applicant_id = auth.uid()
    or exists (
      select 1 from public.lobbies l
      where l.id = applications.lobby_id and l.leader_id = auth.uid()
    )
  );

-- No insert/update/delete policies and no write grants: clients change data
-- only through the functions above.
grant select on public.game_modes, public.lobbies, public.lobby_roles,
  public.applications, public.lobby_members to anon, authenticated;

-- Functions are callable by PUBLIC unless that is revoked first.
revoke all on function public.create_lobby(smallint, smallint, text, text, text, text[], boolean, text[], smallint, timestamptz, timestamptz, smallint, smallint, text, smallint[]) from public, anon;
revoke all on function public.apply_to_lobby(uuid, smallint, text) from public, anon;
revoke all on function public.respond_to_application(uuid, boolean) from public, anon;
revoke all on function public.leave_lobby(uuid) from public, anon;
revoke all on function public.close_lobby(uuid) from public, anon;
grant execute on function public.create_lobby(smallint, smallint, text, text, text, text[], boolean, text[], smallint, timestamptz, timestamptz, smallint, smallint, text, smallint[]) to authenticated;
grant execute on function public.apply_to_lobby(uuid, smallint, text) to authenticated;
grant execute on function public.respond_to_application(uuid, boolean) to authenticated;
grant execute on function public.leave_lobby(uuid) to authenticated;
grant execute on function public.close_lobby(uuid) to authenticated;

-- Read-only helpers the screens can call to show "can I join".
grant execute on function public.lobby_join_bounds(uuid) to anon, authenticated;
grant execute on function public.can_join_lobby(uuid, uuid) to anon, authenticated;
