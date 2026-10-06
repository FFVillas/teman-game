-- Games slice — the reference data every later slice stands on (lobbies
-- point at a game; the recommendation engine needs ranks that can be
-- subtracted), plus what each player has set up per game (the data
-- onboarding collects but, until now, threw away).
--
-- Six games, as scoped in docs/thesis-spec.md. Only Valorant has an LFG
-- page in the UI; the other five exist here so onboarding and profiles can
-- already record them.
--
-- DIVERGENCES FROM THE PROPOSAL (see docs/thesis-spec.md):
--   * game_ranks — new table. The proposal's rank-distance penalty M_rank
--     needs ΔR, a difference between two ranks, which needs every rank to
--     have a position on a ladder. `ordinal` is that position.
--   * game_roles + user_game_roles — new tables. The proposal's
--     user_game_mapping holds ONE "favorite role" per game; onboarding lets
--     a player pick several (a Valorant player flexing Duelist/Initiator),
--     so roles are a join table instead of a column.
--   * `role` in the proposal means an account permission (user/admin). The
--     in-game kind is deliberately named game_roles so the two never blur.
--
-- Never edit this file once it has run — fix data with a new migration.
--
-- SOURCES AND OPEN QUESTIONS: every ladder and role below is researched in
-- docs/game-reference.md, with a confidence mark per game. They come from web
-- sources, not from the games themselves, and have not been checked in-game.
-- The least certain are Mobile Legends (division counts disagree between
-- sources) and Free Fire (some sources add Elite Heroic / Master / Elite
-- Master above Heroic; the ladder here follows the Vandal page, 20 ranks).
-- Counter-Strike 2 has two systems — only the 18-rank Competitive ladder is
-- modelled; the numeric Premier rating is out of scope for now.
--
-- ROLES exist only for games that define them: Valorant (agent classes),
-- League of Legends (positions) and Mobile Legends (lanes). Counter-Strike 2,
-- PUBG Mobile and Free Fire have no game-defined roles (entry fragger, IGL,
-- rusher… are community habits), so they get no rows in game_roles and the
-- app does not ask for a role there.
--
-- REGIONS are deliberately NOT modelled here yet: user_game_mapping.region is
-- plain text, the allowed values live in the app (src/data/game-regions.ts).
-- Whether they should become a game_regions table is an open decision in
-- docs/game-reference.md.

-- ── Reference tables ────────────────────────────────────────────────────
create table public.games (
  id smallint generated always as identity primary key,
  -- URL-safe and stable; the app finds a game's artwork from it.
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null unique,
  platform text not null check (platform in ('pc', 'mobile')),
  genre text not null,
  sort_order smallint not null default 0
);

create table public.game_ranks (
  id smallint generated always as identity primary key,
  game_id smallint not null references public.games (id) on delete cascade,
  -- Family used for badges and grouping ("Gold"), vs `name`, the full
  -- label a player picks ("Gold 2").
  tier text not null,
  name text not null,
  -- Position on the ladder, 0 = lowest, contiguous per game. ΔR between two
  -- ranks of the same game is simply |a.ordinal - b.ordinal|.
  ordinal smallint not null check (ordinal >= 0),
  unique (game_id, ordinal),
  unique (game_id, name),
  -- Redundant with the primary key, but a child table can only prove "this
  -- rank belongs to this game" through a foreign key onto (game_id, id).
  unique (game_id, id)
);

create table public.game_roles (
  id smallint generated always as identity primary key,
  game_id smallint not null references public.games (id) on delete cascade,
  name text not null,
  unique (game_id, name),
  unique (game_id, id)
);

-- ── What each player has set up per game ────────────────────────────────
create table public.user_game_mapping (
  user_id uuid not null references public.profiles (id) on delete cascade,
  game_id smallint not null references public.games (id),
  -- Riot ID, MLBB ID, … — optional: someone can add a game before they know
  -- or want to share it. Public, like the rest of the profile (the profile
  -- page shows it). If it should stay private until a lobby accepts you,
  -- move it behind its own table rather than hiding a column.
  in_game_name text check (char_length(in_game_name) <= 40),
  -- Per game on purpose: servers differ by title. The vocabulary lives in
  -- the app (src/data/regions.ts), so the database only caps the length.
  region text check (char_length(region) <= 40),
  rank_id smallint,
  created_at timestamptz not null default now(),
  primary key (user_id, game_id),
  -- The rank must belong to the game it is recorded against (a null rank
  -- skips the check — MATCH SIMPLE).
  foreign key (game_id, rank_id) references public.game_ranks (game_id, id)
);

create table public.user_game_roles (
  user_id uuid not null,
  game_id smallint not null,
  role_id smallint not null,
  primary key (user_id, game_id, role_id),
  -- Removing a game from a player's list removes their roles for it.
  foreign key (user_id, game_id)
    references public.user_game_mapping (user_id, game_id) on delete cascade,
  -- The role must belong to that same game.
  foreign key (game_id, role_id) references public.game_roles (game_id, id)
);

-- ── Access ──────────────────────────────────────────────────────────────
alter table public.games enable row level security;
alter table public.game_ranks enable row level security;
alter table public.game_roles enable row level security;
alter table public.user_game_mapping enable row level security;
alter table public.user_game_roles enable row level security;

-- Reference data is public and read-only through the API. There are
-- deliberately no write policies: it changes by migration (or, later, an
-- admin policy built on is_admin() once the console can edit it).
create policy "Games are publicly readable"
  on public.games for select to anon, authenticated using (true);
create policy "Game ranks are publicly readable"
  on public.game_ranks for select to anon, authenticated using (true);
create policy "Game roles are publicly readable"
  on public.game_roles for select to anon, authenticated using (true);

-- A player's per-game setup is browsable like the rest of their profile
-- (rank and role are what lobbies are matched and browsed on); only the
-- owner can change it.
create policy "Game setups are publicly readable"
  on public.user_game_mapping for select to anon, authenticated using (true);
create policy "Users can add their own game setup"
  on public.user_game_mapping for insert to authenticated
  with check (auth.uid() = user_id);
create policy "Users can update their own game setup"
  on public.user_game_mapping for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can remove their own game setup"
  on public.user_game_mapping for delete to authenticated
  using (auth.uid() = user_id);

create policy "Game roles of players are publicly readable"
  on public.user_game_roles for select to anon, authenticated using (true);
create policy "Users can add their own game roles"
  on public.user_game_roles for insert to authenticated
  with check (auth.uid() = user_id);
create policy "Users can remove their own game roles"
  on public.user_game_roles for delete to authenticated
  using (auth.uid() = user_id);

-- "Automatically expose new tables" is off for this project, so these
-- grants are what let the API roles touch the tables at all; RLS above then
-- decides which rows.
grant select on public.games, public.game_ranks, public.game_roles
  to anon, authenticated;
grant select on public.user_game_mapping, public.user_game_roles
  to anon, authenticated;
grant insert (user_id, game_id, in_game_name, region, rank_id)
  on public.user_game_mapping to authenticated;
grant update (in_game_name, region, rank_id)
  on public.user_game_mapping to authenticated;
grant delete on public.user_game_mapping to authenticated;
grant insert (user_id, game_id, role_id)
  on public.user_game_roles to authenticated;
grant delete on public.user_game_roles to authenticated;

-- ── Seed: games ─────────────────────────────────────────────────────────
insert into public.games (slug, name, platform, genre, sort_order) values
  ('valorant', 'Valorant', 'pc', 'Tactical FPS', 1),
  ('league-of-legends', 'League of Legends', 'pc', 'MOBA', 2),
  ('counter-strike-2', 'Counter-Strike 2', 'pc', 'Tactical FPS', 3),
  ('mobile-legends', 'Mobile Legends: Bang Bang', 'mobile', 'MOBA', 4),
  ('pubg-mobile', 'PUBG Mobile', 'mobile', 'Battle Royale', 5),
  ('free-fire', 'Free Fire', 'mobile', 'Battle Royale', 6);

-- ── Seed: rank ladders ──────────────────────────────────────────────────
-- Each game lists its tiers lowest-first with the divisions inside each,
-- lowest-first; `ordinal` is the running position across the whole list. A
-- tier with no divisions uses array[''] and is shown as just the tier name.

-- Valorant: 8 tiers × 3, then Radiant → 25 ranks (ordinal 0–24).
insert into public.game_ranks (game_id, tier, name, ordinal)
select g.id, t.tier, btrim(t.tier || ' ' || d.division),
       (row_number() over (order by t.idx, d.idx) - 1)::smallint
from public.games g
cross join (values
  (1, 'Iron',      array['1','2','3']),
  (2, 'Bronze',    array['1','2','3']),
  (3, 'Silver',    array['1','2','3']),
  (4, 'Gold',      array['1','2','3']),
  (5, 'Platinum',  array['1','2','3']),
  (6, 'Diamond',   array['1','2','3']),
  (7, 'Ascendant', array['1','2','3']),
  (8, 'Immortal',  array['1','2','3']),
  (9, 'Radiant',   array[''])
) as t(idx, tier, divisions)
cross join lateral unnest(t.divisions) with ordinality as d(division, idx)
where g.slug = 'valorant';

-- League of Legends: 7 tiers × 4 (IV is lowest), then Master, Grandmaster,
-- Challenger → 31 ranks.
insert into public.game_ranks (game_id, tier, name, ordinal)
select g.id, t.tier, btrim(t.tier || ' ' || d.division),
       (row_number() over (order by t.idx, d.idx) - 1)::smallint
from public.games g
cross join (values
  (1,  'Iron',        array['IV','III','II','I']),
  (2,  'Bronze',      array['IV','III','II','I']),
  (3,  'Silver',      array['IV','III','II','I']),
  (4,  'Gold',        array['IV','III','II','I']),
  (5,  'Platinum',    array['IV','III','II','I']),
  (6,  'Emerald',     array['IV','III','II','I']),
  (7,  'Diamond',     array['IV','III','II','I']),
  (8,  'Master',      array['']),
  (9,  'Grandmaster', array['']),
  (10, 'Challenger',  array[''])
) as t(idx, tier, divisions)
cross join lateral unnest(t.divisions) with ordinality as d(division, idx)
where g.slug = 'league-of-legends';

-- Counter-Strike 2, Competitive ladder → 18 ranks.
insert into public.game_ranks (game_id, tier, name, ordinal)
select g.id, t.tier, btrim(t.tier || ' ' || d.division),
       (row_number() over (order by t.idx, d.idx) - 1)::smallint
from public.games g
cross join (values
  (1, 'Silver',                     array['I','II','III','IV','Elite','Elite Master']),
  (2, 'Gold Nova',                  array['I','II','III','Master']),
  (3, 'Master Guardian',            array['I','II','Elite']),
  (4, 'Distinguished Master Guardian', array['']),
  (5, 'Legendary Eagle',            array['','Master']),
  (6, 'Supreme Master First Class', array['']),
  (7, 'The Global Elite',           array[''])
) as t(idx, tier, divisions)
cross join lateral unnest(t.divisions) with ordinality as d(division, idx)
where g.slug = 'counter-strike-2';

-- Mobile Legends: 6 tiers with divisions, then the four Mythic bands
-- (which are star-based in game) → 30 ranks.
insert into public.game_ranks (game_id, tier, name, ordinal)
select g.id, t.tier, btrim(t.tier || ' ' || d.division),
       (row_number() over (order by t.idx, d.idx) - 1)::smallint
from public.games g
cross join (values
  (1,  'Warrior',          array['III','II','I']),
  (2,  'Elite',            array['IV','III','II','I']),
  (3,  'Master',           array['IV','III','II','I']),
  (4,  'Grandmaster',      array['V','IV','III','II','I']),
  (5,  'Epic',             array['V','IV','III','II','I']),
  (6,  'Legend',           array['V','IV','III','II','I']),
  (7,  'Mythic',           array['']),
  (8,  'Mythical Honor',   array['']),
  (9,  'Mythical Glory',   array['']),
  (10, 'Mythical Immortal', array[''])
) as t(idx, tier, divisions)
cross join lateral unnest(t.divisions) with ordinality as d(division, idx)
where g.slug = 'mobile-legends';

-- PUBG Mobile: 6 tiers × 5 (V is lowest), then Ace, Ace Master, Ace
-- Dominator, Conqueror → 34 ranks.
insert into public.game_ranks (game_id, tier, name, ordinal)
select g.id, t.tier, btrim(t.tier || ' ' || d.division),
       (row_number() over (order by t.idx, d.idx) - 1)::smallint
from public.games g
cross join (values
  (1, 'Bronze',        array['V','IV','III','II','I']),
  (2, 'Silver',        array['V','IV','III','II','I']),
  (3, 'Gold',          array['V','IV','III','II','I']),
  (4, 'Platinum',      array['V','IV','III','II','I']),
  (5, 'Diamond',       array['V','IV','III','II','I']),
  (6, 'Crown',         array['V','IV','III','II','I']),
  (7, 'Ace',           array['']),
  (8, 'Ace Master',    array['']),
  (9, 'Ace Dominator', array['']),
  (10, 'Conqueror',    array[''])
) as t(idx, tier, divisions)
cross join lateral unnest(t.divisions) with ordinality as d(division, idx)
where g.slug = 'pubg-mobile';

-- Free Fire (Battle Royale ranked) → 20 ranks.
insert into public.game_ranks (game_id, tier, name, ordinal)
select g.id, t.tier, btrim(t.tier || ' ' || d.division),
       (row_number() over (order by t.idx, d.idx) - 1)::smallint
from public.games g
cross join (values
  (1, 'Bronze',      array['I','II','III']),
  (2, 'Silver',      array['I','II','III']),
  (3, 'Gold',        array['I','II','III','IV']),
  (4, 'Platinum',    array['I','II','III','IV']),
  (5, 'Diamond',     array['I','II','III','IV']),
  (6, 'Heroic',      array['']),
  (7, 'Grandmaster', array[''])
) as t(idx, tier, divisions)
cross join lateral unnest(t.divisions) with ordinality as d(division, idx)
where g.slug = 'free-fire';

-- ── Seed: roles ─────────────────────────────────────────────────────────
insert into public.game_roles (game_id, name)
select g.id, r.name
from public.games g
join (values
  ('valorant',          'Duelist'),
  ('valorant',          'Initiator'),
  ('valorant',          'Controller'),
  ('valorant',          'Sentinel'),
  ('league-of-legends', 'Top'),
  ('league-of-legends', 'Jungle'),
  ('league-of-legends', 'Mid'),
  ('league-of-legends', 'Bot (ADC)'),
  ('league-of-legends', 'Support'),
  ('mobile-legends',    'Gold Lane'),
  ('mobile-legends',    'EXP Lane'),
  ('mobile-legends',    'Mid Lane'),
  ('mobile-legends',    'Jungle'),
  ('mobile-legends',    'Roam')
) as r(slug, name) on r.slug = g.slug;

-- After running, this should return: Valorant 25, League of Legends 31,
-- Counter-Strike 2 18, Mobile Legends 30, PUBG Mobile 34, Free Fire 20.
--   select g.name, count(*) as ranks, max(r.ordinal) as top_ordinal
--   from games g join game_ranks r on r.game_id = g.id
--   group by g.name, g.sort_order order by g.sort_order;
-- top_ordinal should always be ranks - 1 (the ladder has no gaps).
--
-- And roles (only three games have any):
--   select g.name, count(r.id) as roles
--   from games g left join game_roles r on r.game_id = g.id
--   group by g.name, g.sort_order order by g.sort_order;
-- Valorant 4, League of Legends 5, Mobile Legends 5, the other three 0.
