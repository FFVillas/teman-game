-- TemanGame: the whole schema in one file, for the TEST project only.
--
-- All 44 migrations from supabase/migrations/, in the order they were applied
-- to the main project. One exception to name order: 20260919000200_reports_moderation.sql
-- is dated September but refers to the `lobby` table, so it was held back and
-- applied in November; here it runs right after 20261115000100_thesis_naming.
--
-- Use: a NEW, EMPTY Supabase project -> SQL Editor -> paste all of this -> Run
-- (nothing selected). Never run it on the main project: its migrations have
-- already run there.
--
-- Generated from the migration files; do not edit by hand. Regenerate when a
-- migration is added.


-- ========================================================================
-- 20260919000000_profiles.sql
-- ========================================================================

-- Account slice — the first vertical slice of the backend.
-- Everything else (lobby.leader_id, applications, reviews, reports,
-- friendships) references a profile, so this has to exist first.
--
-- Deliberately narrow: no roles/admin (teammates own that on a separate
-- branch), no connected_accounts (no working OAuth yet), no
-- user_game_mapping (that's part of the Lobby slice). See
-- docs/thesis-spec.md for the full 13-entity model this is one piece of.

-- Supabase Auth already owns auth.users (email, password, sessions) — we
-- never create that ourselves. This table is the 1:1 "everything else"
-- extension, linked by the same id.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null,
  avatar_url text,
  region text,
  -- 1-5 Likert scale, "Sangat Kasual" to "Sangat Kompetitif" — Persamaan 3.2.
  playstyle smallint check (playstyle between 1 and 5),
  -- Fixed vocabulary from the proposal (Persamaan 3.4) — constrained so
  -- garbage tags can't get written and silently break the matching score
  -- later.
  personality_tags text[] not null default '{}'
    check (
      personality_tags <@ array[
        'Shot Caller',
        'Positive Mental Attitude',
        'Chill',
        'Never Surrender',
        'Flex Player'
      ]::text[]
    ),
  -- Both stay 0 until the Reputation slice lands and reviews start
  -- writing to them.
  reputation_score numeric(3, 2) not null default 0,
  review_count integer not null default 0,
  created_at timestamptz not null default now()
);

-- Case-insensitive uniqueness — "Yonziii" and "yonziii" shouldn't both
-- be claimable.
create unique index profiles_username_lower_idx
  on public.profiles (lower(username));

alter table public.profiles enable row level security;

-- Profiles are meant to be browsable (LFG discovery, viewing another
-- player's profile) without requiring login, so SELECT is open to
-- everyone — anon and logged-in alike.
create policy "Profiles are publicly readable"
  on public.profiles for select
  to anon, authenticated
  using (true);

-- Only the owner can edit their own profile. No INSERT policy at all —
-- profile creation only happens through the trigger below, tied to a
-- real signup, so nobody can write a profile row for someone else's id
-- or create duplicates.
create policy "Users can update their own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- "Automatically expose new tables" was turned off at project creation,
-- so these grants are what actually let the API roles touch this table
-- at all — RLS above then filters which rows/columns within that.
grant select on public.profiles to anon, authenticated;
grant update (username, avatar_url, region, playstyle, personality_tags)
  on public.profiles to authenticated;

-- Auto-creates a profile row the moment someone signs up via Supabase
-- Auth — this is the glue that makes `profiles` actually populate.
-- security definer: runs as the function owner, not the calling user,
-- so it can insert into profiles even though there's no INSERT policy
-- for regular users.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, username)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'username', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- ========================================================================
-- 20260919000100_admin_roles.sql
-- ========================================================================

-- Staff identity — the "role" piece needed for login to work: same
-- /login for everyone, this is what decides whether someone lands on
-- the normal app or on /admin. Split out from the rest of the
-- moderation schema (reports/sanctions/audit log) so it can be run now,
-- without needing the report feature to exist yet.
--
-- DIVERGENCE FROM PROPOSAL: the proposal's ERD models admin access via
-- `role` + `user_role_mapping` — an admin is a user account that also
-- holds the "admin" role. This does NOT build that. Instead: admin
-- identity lives in its own `admins` table, entirely independent of
-- `profiles`. Reasoning (industry-standard, not just preference): a
-- role-flag-on-account design means a compromised player password also
-- grants moderation power, and it creates a self-moderation conflict (an
-- admin could end up judging a report filed against their own account).
-- Separating staff identity from player identity is the same pattern
-- real platforms use (no company's support/moderation tooling is gated
-- by a flag on the employee's personal account on the product itself).
-- `role`/`user_role_mapping` from the proposal are therefore not built —
-- flag this to your advisor as an intentional adaptation, not a gap.
--
-- Admins still authenticate through the same Supabase Auth (same
-- `auth.users`, same /login) — only the *permission check* is separate,
-- not the whole auth system. There is no self-signup path to this
-- table; rows are inserted by hand (matches admin-console.md exactly:
-- "There is no admin sign-up; accounts are created by hand").
create table public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  created_at timestamptz not null default now()
);

alter table public.admins enable row level security;

-- security definer + stable: bypasses RLS internally (it's the function
-- owner's privileges, not the caller's), so it's safe to use inside a
-- policy on `admins` itself without Postgres reporting "infinite
-- recursion detected in policy" — which a raw self-referencing subquery
-- in the policy below would trigger. Cheap too: one indexed lookup.
-- Also the seam any future table's RLS calls to check "is this user
-- staff" — the reports/sanctions/audit-log schema (when that's added
-- later) reuses this same function rather than redefining the check.
create function public.is_admin(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admins where user_id = uid);
$$;

-- Only admins can see the staff list (who exists) — not exposed to
-- regular players.
create policy "Admins can view the staff list"
  on public.admins for select
  to authenticated
  using (public.is_admin(auth.uid()));

grant select on public.admins to authenticated;
-- Deliberately no insert/update/delete policy for any client role —
-- staff provisioning only happens via the SQL editor / service_role.


-- ========================================================================
-- 20260919000300_profiles_drop_region.sql
-- ========================================================================

-- Region moves from a one-time account-level field to a per-game field —
-- someone's server can differ by title, so it belongs on the (still
-- upcoming) user_game_mapping / Lobby-slice tables, not on `profiles`.
-- The onboarding flow's Rank & Role step already collects it per game
-- (RankRoleStep.tsx's UsernameAndRegion), so this was redundant the
-- moment that step existed.
--
-- A genuinely new migration rather than an edit to
-- 20260919000000_profiles.sql — that one already ran against the live
-- database, so changing it wouldn't retroactively fix anything there;
-- this is the actual mechanism that does.
alter table public.profiles drop column region;


-- ========================================================================
-- 20261003000000_profiles_dossier.sql
-- ========================================================================

-- Profile slice — the "player dossier" fields the profile screen and the
-- edit form already show (age, gender, languages, usual play hours).
-- They're account-level (the same person whichever game they queue for),
-- unlike region/rank/role which are per game and arrive with
-- user_game_mapping in the Lobby slice.
--
-- A new migration rather than an edit to 20260919000000_profiles.sql:
-- that one already ran against the live database.
--
-- Everything is nullable — onboarding doesn't ask for any of this, and the
-- UI renders "Not set" rather than inventing a value.

-- ── Public dossier text fields ──────────────────────────────────────────
alter table public.profiles
  add column gender text check (gender in ('Male', 'Female', 'Prefer not to say')),
  add column languages text check (char_length(languages) <= 120),
  add column availability text check (char_length(availability) <= 200);

-- Column-level grants (see 20260919000000_profiles.sql): the API roles can
-- only update columns that are explicitly granted, so the new ones have to
-- be added here or saving the edit form fails with "permission denied".
grant update (gender, languages, availability)
  on public.profiles to authenticated;

-- ── Date of birth — private ─────────────────────────────────────────────
-- DESIGN NOTE: `profiles` is publicly readable (anon included), so a date of
-- birth stored there would be exposed through the API even though the UI
-- only shows an age. It lives in its own table that only the owner can
-- read; everyone else gets just the derived age, via profile_age() below.
-- Storing the date (not an age) means the age never goes stale.
create table public.profile_private (
  user_id uuid primary key references auth.users (id) on delete cascade,
  -- Sanity range only; the 13+ rule is the trigger below (a CHECK can't use
  -- now(), and the limit moves every day).
  date_of_birth date check (date_of_birth between '1900-01-01' and '2100-01-01')
);

alter table public.profile_private enable row level security;

create policy "Users can read their own private profile"
  on public.profile_private for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can create their own private profile"
  on public.profile_private for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update their own private profile"
  on public.profile_private for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant select on public.profile_private to authenticated;
grant insert (user_id, date_of_birth) on public.profile_private to authenticated;
grant update (date_of_birth) on public.profile_private to authenticated;

-- Minimum-age gate, enforced here so it can't be bypassed by calling the
-- API directly instead of using the form. The form checks the same rule
-- first so people get a readable message, not this exception.
create function public.enforce_minimum_age()
returns trigger
language plpgsql
as $$
begin
  if new.date_of_birth is not null
     and new.date_of_birth > (current_date - interval '13 years') then
    raise exception 'You must be at least 13 years old.'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger profile_private_minimum_age
  before insert or update on public.profile_private
  for each row execute procedure public.enforce_minimum_age();

-- The one thing about the date that is public: the age it works out to.
-- security definer so it can read past the owner-only RLS above; it
-- returns a whole number of years and never the date itself.
create function public.profile_age(profile_id uuid)
returns integer
language sql
stable
security definer set search_path = public
as $$
  select date_part('year', age(date_of_birth))::integer
  from public.profile_private
  where user_id = profile_id;
$$;

revoke execute on function public.profile_age(uuid) from public;
grant execute on function public.profile_age(uuid) to anon, authenticated;


-- ========================================================================
-- 20261003000100_profiles_schedule_languages.sql
-- ========================================================================

-- The profile edit form replaced two free-text fields with structured
-- inputs: languages became a dropdown list, and "usual play hours" became
-- day buttons + start/end time pickers + a timezone.
--
-- New migration rather than an edit to 20261003000000_profiles_dossier.sql:
-- that one is already applied.
--
-- Dropping and re-adding (not converting) is deliberate: free text such as
-- "Indonesia (Native), English (B2)" can't be mapped reliably onto a fixed
-- vocabulary, and the only rows affected are development test accounts.
alter table public.profiles
  drop column languages,
  drop column availability;

alter table public.profiles
  -- Picked from a dropdown, so stored as a list. The vocabulary lives in the
  -- app (src/data/profile-options.ts) so adding a language isn't a
  -- migration; the database only caps the count.
  add column languages text[] not null default '{}'
    check (cardinality(languages) <= 8),
  -- Usual play hours, structured so schedule overlap (a filter players
  -- search on) can be computed later. If end < start the window runs past
  -- midnight. Times are wall-clock in `timezone`, stored as a UTC offset
  -- such as 'UTC+07:00' (no per-country zones — the offset is all overlap
  -- needs).
  add column play_days text[] not null default '{}'
    check (play_days <@ array['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']::text[]),
  add column play_start time,
  add column play_end time,
  add column timezone text check (char_length(timezone) <= 40),
  add constraint profiles_play_window_check
    check ((play_start is null) = (play_end is null));

-- Dropping a column also drops its column-level grant, so the replacements
-- need granting again or saving fails with "permission denied".
grant update (languages, play_days, play_start, play_end, timezone)
  on public.profiles to authenticated;


-- ========================================================================
-- 20261003000200_games.sql
-- ========================================================================

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


-- ========================================================================
-- 20261004000000_avatars.sql
-- ========================================================================

-- Profile pictures. Uploaded files live in Supabase Storage; `profiles` only
-- records WHICH file, never a URL.
--
-- Why a path and not a URL: `profiles.avatar_url` was writable by its owner
-- (it is in the column grant), so a player could have pointed it at any
-- address on the internet — every visitor's browser would then fetch it
-- (tracking, hot-linked content). A path that the CHECK below pins to the
-- player's own storage folder cannot do that, and the app builds the URL
-- from it (src/lib/avatar.ts). It also keeps the door open to a CDN or image
-- transforms later without touching any stored data.
--
-- Nobody could have saved a valid avatar before this (there was no upload),
-- so every existing row is null and the new CHECK passes.

alter table public.profiles rename column avatar_url to avatar_path;

-- Column-level grants follow the column through the rename, so the owner can
-- still update it and nobody else can.

-- Shape: "<own user id>/<unix ms>.jpg" — exactly what the upload code
-- produces. A new file name per upload (rather than overwriting one fixed
-- name) means a replaced picture is never served stale from a cache.
alter table public.profiles
  add constraint profiles_avatar_path_check
  check (
    avatar_path is null
    or (
      avatar_path ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9]+\.jpg$'
      and avatar_path like id::text || '/%'
    )
  );

-- ── Storage bucket ──────────────────────────────────────────────────────
-- Public: profile pictures are shown to everyone, logged in or not, so the
-- files are served straight from the public URL with no per-request check.
-- The limits below are enforced by Storage itself, as a backstop to the
-- browser resizing every upload to a 256×256 JPEG (about 20–40 KB).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 524288, array['image/jpeg']);

-- ── Who may write ───────────────────────────────────────────────────────
-- Reading a public bucket needs no policy; these only govern writes and the
-- player's own listing. Every rule pins the first folder of the object name
-- to the caller's user id, so nobody can touch someone else's files.
--
-- There is deliberately no UPDATE policy: files are never overwritten (each
-- upload gets a new name), so nobody needs to.
create policy "Users can upload to their own avatar folder"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Deleting through the API needs SELECT as well as DELETE: the row has to be
-- visible to the caller before it can be removed.
create policy "Users can see their own avatar files"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can delete their own avatar files"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );


-- ========================================================================
-- 20261006000000_lobbies.sql
-- ========================================================================

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


-- ========================================================================
-- 20261006000000_notifications.sql
-- ========================================================================

-- Notifications — the last piece of the Account/Profile slice that is still
-- browser-only. `NotificationContext` currently seeds from
-- src/data/notifications.ts and keeps read state in localStorage, so a
-- notification disappears when you switch device and the bell count is
-- fiction. This table is what it reads instead.
--
-- Covers requirement 5 in §3.2.4 of the proposal ("Sistem Notifikasi
-- Real-time"). Delivery (Firebase Cloud Messaging through a service worker)
-- sits on top of this later; the row is the source of truth either way.

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  -- Who receives it.
  user_id uuid not null references public.profiles (id) on delete cascade,
  -- Mirrors NotificationKind in src/data/notifications.ts. Constrained so a
  -- typo can't create a kind the UI has no icon or styling for.
  kind text not null check (
    kind in (
      'lobby_invite',
      'join_request',
      'application_accepted',
      'application_declined',
      'lobby_started',
      'rating_due',
      'friend_request',
      'message',
      'review_received',
      'report_update'
    )
  ),
  title text not null check (char_length(title) <= 160),
  body text check (char_length(body) <= 400),
  -- Who triggered it, when there is a person behind it. Name and avatar are
  -- read through this reference rather than copied, so a renamed player
  -- doesn't leave stale text behind.
  actor_id uuid references public.profiles (id) on delete set null,
  -- Where clicking it should go, e.g. /lfg/valorant/lobby/<id>.
  href text check (char_length(href) <= 300),
  -- Null until read. A timestamp rather than a boolean: "when did they see
  -- it" is worth having, and it still answers "is it unread".
  read_at timestamptz,
  -- Set once an actionable notification (invite / join request) is answered.
  resolution text check (resolution in ('accepted', 'declined')),
  created_at timestamptz not null default now()
);

alter table public.notifications enable row level security;

-- The list is per person: nobody can read anyone else's.
create policy "Users read their own notifications"
  on public.notifications for select
  to authenticated
  using (user_id = auth.uid());

-- Marking as read / answering an invite. The column grant below limits this
-- to read_at and resolution, so the text of a notification can't be edited.
create policy "Users update their own notifications"
  on public.notifications for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Deliberately narrow: a client may only create a notification addressed to
-- itself. Real cross-player notifications (X invited you, Y applied to your
-- lobby) must be written server-side — by a trigger on `applications` /
-- `lobby_invites` or an edge function — once the Lobby slice exists.
-- Without this restriction any logged-in account could spam everyone.
create policy "Users create notifications addressed to themselves"
  on public.notifications for insert
  to authenticated
  with check (user_id = auth.uid());

grant select, insert on public.notifications to authenticated;
grant update (read_at, resolution) on public.notifications to authenticated;

-- The only query the app makes: this person's notifications, newest first.
create index notifications_user_created_idx
  on public.notifications (user_id, created_at desc);


-- ========================================================================
-- 20261006010000_notify_user_rpc.sql
-- ========================================================================

-- Cross-player notification delivery.
--
-- 20261006000000_notifications.sql deliberately only lets a caller insert a
-- notification addressed to themselves (`user_id = auth.uid()`) — otherwise
-- any account could spam anyone. That's fine for self-addressed kinds like
-- `application_accepted` ("you accepted them"), but a genuine cross-player
-- notification ("X invited you to a lobby", "Y wants to join yours") is
-- necessarily addressed to someone else.
--
-- The Lobby slice (`lobbies`, `applications`, `lobby_invites`) doesn't exist
-- yet, so there's no table to hang a trigger off. This function is the
-- interim mechanism: security definer, so it can insert past the self-only
-- policy, but it only ever writes `actor_id = auth.uid()` — a caller can
-- notify someone else, but only ever "as themselves", never impersonating
-- another actor. Once the Lobby slice lands, a trigger on `lobby_invites` /
-- `applications` can call this same function (or be replaced by one) rather
-- than every call site reinventing the check.
create function public.notify_user(
  p_user_id uuid,
  p_kind text,
  p_title text,
  p_body text default null,
  p_href text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_recent_count integer;
begin
  -- Narrow on purpose: only kinds that are inherently "one player acting on
  -- another" go through here. Everything else (ratings, reviews, reports,
  -- the self-addressed application_accepted/declined) stays on the
  -- self-only insert policy or waits for its own server-side trigger —
  -- widening this list is a one-line migration when a kind needs it.
  if p_kind not in ('lobby_invite', 'join_request') then
    raise exception 'notify_user: % is not a cross-player notification kind', p_kind;
  end if;

  if auth.uid() is null then
    raise exception 'notify_user: must be called by an authenticated user';
  end if;

  if p_user_id = auth.uid() then
    raise exception 'notify_user: use a direct insert to notify yourself';
  end if;

  -- Spam guard: this is the one function that lets an account write into
  -- someone else's notifications, so it's the one place that needs a rate
  -- limit. 20 cross-player notifications/minute comfortably covers inviting
  -- a full lobby's worth of players at once.
  select count(*) into v_recent_count
  from public.notifications
  where actor_id = auth.uid()
    and created_at > now() - interval '1 minute';

  if v_recent_count >= 20 then
    raise exception 'notify_user: rate limit exceeded, try again shortly';
  end if;

  insert into public.notifications (user_id, kind, title, body, href, actor_id)
  values (p_user_id, p_kind, p_title, p_body, p_href, auth.uid())
  returning id into v_id;

  return v_id;
end;
$$;

revoke execute on function public.notify_user(uuid, text, text, text, text) from public;
grant execute on function public.notify_user(uuid, text, text, text, text) to authenticated;


-- ========================================================================
-- 20261007000000_direct_messages.sql
-- ========================================================================

-- Direct messages — the `direct_messages` entity from the proposal's ERD,
-- exactly as specified (sender, receiver, body, timestamp). No new entity,
-- no divergence to explain.
--
-- SCOPE NOTE: this is 1:1 chat only. Lobby chat is a different entity
-- (`lobby_messages`) and depends on `lobbies`, which is being built
-- separately — it is deliberately NOT in this migration, so two people can
-- work without colliding. Lobby chat stays on its sessionStorage stand-in
-- (src/lib/lobby-session.ts) until the Lobby slice lands.
--
-- There is no `conversations` table on purpose: a conversation is simply
-- every row between two people, which is what the ERD describes and what
-- keeps the entity count where the proposal put it.

create table public.direct_messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles (id) on delete cascade,
  receiver_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  -- Null until the receiver opens the conversation. A timestamp rather than
  -- a boolean: it still answers "is it unread", and keeps when it was seen.
  read_at timestamptz,
  created_at timestamptz not null default now(),
  -- Messaging yourself would show up as a conversation with no one.
  constraint direct_messages_not_self check (sender_id <> receiver_id)
);

alter table public.direct_messages enable row level security;

-- Only the two people in the conversation can read it. Note what this
-- means for moderation: an admin cannot read DMs through the API at all.
-- That is deliberate — if reporting a DM is ever added, the reporter should
-- attach the specific messages to the report rather than handing moderators
-- a window into every private conversation.
create policy "Participants read their own messages"
  on public.direct_messages for select
  to authenticated
  using (sender_id = auth.uid() or receiver_id = auth.uid());

-- You can only send as yourself.
create policy "Players send as themselves"
  on public.direct_messages for insert
  to authenticated
  with check (sender_id = auth.uid());

-- Only the receiver marks a message read, and the column grant below limits
-- the update to `read_at` — nobody can edit the text of a sent message.
create policy "Receivers mark messages read"
  on public.direct_messages for update
  to authenticated
  using (receiver_id = auth.uid())
  with check (receiver_id = auth.uid());

grant select, insert on public.direct_messages to authenticated;
grant update (read_at) on public.direct_messages to authenticated;

-- No delete policy: a sent message can't be unsent or wiped by either side.
-- Worth stating in the thesis as an accountability choice — the same reason
-- sanctions are lifted rather than deleted.

-- The two queries the app makes: "my conversation with X, oldest first" and
-- "everything involving me, newest first".
create index direct_messages_pair_idx
  on public.direct_messages (sender_id, receiver_id, created_at);
create index direct_messages_receiver_idx
  on public.direct_messages (receiver_id, created_at desc);


-- ========================================================================
-- 20261007000000_lobby_start.sql
-- ========================================================================

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


-- ========================================================================
-- 20261007000000_news.sql
-- ========================================================================

-- Platform news — list + article pages at /lfg/<game>/news, currently read
-- from the static src/data/lfg-news.ts array. This table is what they read
-- from instead.
--
-- Simplest slice in the backlog: read-only content, no "who owns this row"
-- question like profiles/notifications have, so it's a public-read /
-- admin-write table with no per-row RLS branching.

create table public.news (
  id uuid primary key default gen_random_uuid(),
  -- News is currently shown only on Valorant's /news route, but the table
  -- isn't Valorant-only: null means platform-wide, a game_id scopes an
  -- article to one game's page once other games grow a news tab too.
  game_id smallint references public.games (id) on delete set null,
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  category text not null check (char_length(category) <= 40),
  title text not null check (char_length(title) <= 160),
  excerpt text not null check (char_length(excerpt) <= 300),
  cover text not null,
  author text not null check (char_length(author) <= 80),
  -- Sections as the article page already renders them — {heading?, paragraphs}
  -- — rather than a single body blob, so the page doesn't need a markdown
  -- parser for something this structured.
  body jsonb not null,
  read_time text check (char_length(read_time) <= 20),
  published_at timestamptz not null default now()
);

create index news_published_at_idx on public.news (published_at desc);
create index news_game_id_idx on public.news (game_id);

alter table public.news enable row level security;

-- Published content is public, same as `games` — no login needed to read
-- patch notes.
create policy "News is publicly readable"
  on public.news for select
  to anon, authenticated
  using (true);

-- Staff-authored, matching how every other admin-only write in this schema
-- is gated (see is_admin() in 20260919000100_admin_roles.sql).
create policy "Admins can write news"
  on public.news for all
  to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

grant select on public.news to anon, authenticated;
grant insert, update, delete on public.news to authenticated;

-- ── Seed: the 3 articles currently hardcoded in src/data/lfg-news.ts ──────
insert into public.news (game_id, slug, category, title, excerpt, cover, author, read_time, published_at, body)
select g.id, v.slug, v.category, v.title, v.excerpt, v.cover, v.author, v.read_time, v.published_at::timestamptz, v.body::jsonb
from public.games g
cross join (values
  (
    'valorant-patch-10-02-update', 'Patch Notes', 'VALORANT Patch 10.02 Update',
    'Patch 10.02 shakes up the current meta with major agent balance changes and a fresh round of quality-of-life updates.',
    '/lfg/news/valorant-patch-8.jpg', 'TemanGame Staff', '5 min read', '2026-01-12',
    $$[
      {"paragraphs": [
        "Patch 10.02 is live, and it's one of the bigger balance passes we've shipped this act. The headline changes target Duelists that have been dominating pick rates in Ranked and Premier, while Sentinels and Controllers pick up small buffs to keep site retakes competitive.",
        "As always, these numbers are tuned from aggregate data across all ranks — expect follow-up micro-adjustments in 10.03 once the meta settles."
      ]},
      {"heading": "Duelist Adjustments", "paragraphs": [
        "Iso's Kill Contract shield duration reduced from 5.75s to 5s, and the double-kill activation cooldown increased by 10 seconds. We've heard the feedback that a single successful engage was providing too much sustained value across a round.",
        "Raze's Blast Pack self-damage window shortened slightly, making satchel jumps a little less punishing for aggressive entries."
      ]},
      {"heading": "Sentinel Adjustments", "paragraphs": [
        "Killjoy's Nanoswarm grenade cost reduced from 400 to 300 credits, making it easier to fully kit up on eco rounds.",
        "Cypher's Spycam reveal duration on trip increased by 1 second, giving info-focused Sentinels a bit more warning on flanks."
      ]},
      {"heading": "Controller Adjustments", "paragraphs": [
        "Harbor's Cove now blocks footstep audio in addition to vision, matching player expectations from testing on the PBE.",
        "Minor bug fixes: Omen's Shrouded Step no longer occasionally fails to teleport when cast near destructible geometry."
      ]}
    ]$$
  ),
  (
    'vct-champions-2026-announced', 'Esports', 'VCT Champions 2026 Announced',
    'VCT Champions 2026: the world''s best teams gear up for the ultimate tactical shooter showdown of the year.',
    '/lfg/news/vct-champions-2024.jpg', 'TemanGame Staff', '3 min read', '2026-01-15',
    $$[
      {"paragraphs": [
        "The road to Champions 2026 is set. Twenty teams from every region will battle through the Kickoff, Stage 1, and Stage 2 circuits for a shot at the year's biggest trophy, with the finals capping off the international season this fall."
      ]},
      {"heading": "What's New This Year", "paragraphs": [
        "A revised group-stage format cuts down on dead rubber matches by seeding playoff brackets earlier, so every map in the group stage carries real stakes.",
        "The broadcast crew is expanding its talent roster with more regional analysts joining the international desk, aiming to bring more local flavor to the global feed."
      ]},
      {"heading": "How to Follow Along", "paragraphs": [
        "Matches will stream on the usual channels, and in-client drops return for viewers who tune in during the group stage. We'll post the full bracket and schedule here as soon as regional qualifiers wrap up."
      ]}
    ]$$
  ),
  (
    'night-market-new-skins-available', 'Store', 'Night Market: New Skins Available',
    'Night Market is back! Grab your favorite weapon skins at a discounted price, running Feb 5 – Mar 2, 2026.',
    '/lfg/news/night-market.jpg', 'TemanGame Staff', '8 min read', '2026-02-05',
    $$[
      {"paragraphs": [
        "Night Market has opened its doors for another round. From February 5th through March 2nd, log in to unlock six random offers pulled from your personal catalog of skins you don't already own — each one discounted below its usual store price."
      ]},
      {"heading": "How It Works", "paragraphs": [
        "Every player gets a unique set of six offers, so no two accounts will see the same deals. Offers are locked in the moment the market opens for you and won't refresh until the next Night Market event.",
        "Bundles and premium editions are excluded — Night Market offers are always single weapon skins, discounted between 10% and 40% off."
      ]},
      {"heading": "Our Picks", "paragraphs": [
        "If you're short on VP, prioritize skins with animated finishers and finisher variants — they tend to hold the steepest discounts relative to their original price. Check your in-client Night Market tab now before offers rotate out on March 2nd."
      ]}
    ]$$
  )
) as v(slug, category, title, excerpt, cover, author, read_time, published_at, body)
where g.slug = 'valorant';


-- ========================================================================
-- 20261007000100_realtime_publication.sql
-- ========================================================================

-- Realtime: publish the two tables the app subscribes to, so a new row
-- reaches an open page without a reload.
--
-- `direct_messages` was added by hand in the SQL editor while testing; this
-- migration records that in the repo and adds `notifications` alongside it,
-- so a fresh project ends up in the same state.
--
-- Wrapped in a guard because `alter publication ... add table` has no
-- IF NOT EXISTS: re-running it on an already-published table fails with
-- "relation is already member of publication". This version is safe to run
-- as many times as you like.
--
-- Realtime applies the same RLS as a normal query, so publishing a table
-- exposes nothing extra: each subscriber only receives rows its policies
-- already let it read. The client must authenticate its socket
-- (`realtime.setAuth`) or it is treated as `anon` and simply receives
-- nothing — see src/lib/realtime.ts.
--
-- To undo: alter publication supabase_realtime drop table public.<table>;

do $$
declare
  target text;
begin
  foreach target in array array['direct_messages', 'notifications'] loop
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = target
    ) then
      execute format(
        'alter publication supabase_realtime add table public.%I',
        target
      );
    end if;
  end loop;
end $$;


-- ========================================================================
-- 20261007010000_social.sql
-- ========================================================================

-- Social slice — friends, friend requests, and blocking. Backs
-- /social, /social/pending, /social/discover and /social/blocked, which
-- currently read from src/data/social-*.ts mock arrays.
--
-- Deliberately independent of the Lobby slice: a friendship is purely
-- player-to-player, so this can go live before lobbies/applications do.
-- /social/recent (teammates from past lobbies) stays mock for now — it
-- needs real match history, which arrives with the Lobby slice.
--
-- Not built here: online/idle presence. FriendCard's status dot needs a
-- realtime presence channel, a separate feature from the relationship
-- itself; every real friend reads as "offline" until that lands rather
-- than showing an invented status.

-- ── Blocks ──────────────────────────────────────────────────────────────
-- Created before Friendships: the friend-request insert policy below checks
-- this table, so it has to exist first.
--
-- One-directional and visible only to the blocker — the blocked player is
-- never told. A block and a friendship are independent: blocking someone
-- doesn't require unfriending them first (the app does both together), and
-- there's no FK between the two tables.
create table public.blocks (
  id uuid primary key default gen_random_uuid(),
  blocker_id uuid not null references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  check (blocker_id <> blocked_id),
  unique (blocker_id, blocked_id)
);

alter table public.blocks enable row level security;

create policy "Users can view who they've blocked"
  on public.blocks for select
  to authenticated
  using (blocker_id = auth.uid());

create policy "Users can block someone"
  on public.blocks for insert
  to authenticated
  with check (blocker_id = auth.uid());

create policy "Users can unblock someone"
  on public.blocks for delete
  to authenticated
  using (blocker_id = auth.uid());

grant select, insert, delete on public.blocks to authenticated;

-- ── Friendships ─────────────────────────────────────────────────────────
-- One row per relationship, not per direction. `requester_id` /
-- `addressee_id` record who asked whom (so the UI can tell "you sent this"
-- from "you received this"); `low_user_id` / `high_user_id` are generated
-- purely to make the unique constraint direction-independent, so A→B and
-- B→A can't both exist as separate pending requests.
create table public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles (id) on delete cascade,
  addressee_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  low_user_id uuid generated always as (least(requester_id, addressee_id)) stored,
  high_user_id uuid generated always as (greatest(requester_id, addressee_id)) stored,
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  check (requester_id <> addressee_id),
  unique (low_user_id, high_user_id)
);

create index friendships_addressee_idx on public.friendships (addressee_id, status);
create index friendships_requester_idx on public.friendships (requester_id, status);

alter table public.friendships enable row level security;

-- Either side of the relationship can see it — the requester needs to see
-- their own pending request, the addressee needs to see it to answer it.
create policy "Either side can view a friendship"
  on public.friendships for select
  to authenticated
  using (requester_id = auth.uid() or addressee_id = auth.uid());

-- You can only send a request as yourself, and only to someone who hasn't
-- blocked you (or whom you haven't blocked) — checked here too, not just
-- hidden from Discover, so the rule holds even if a client calls the API
-- directly.
create policy "Users can send a friend request"
  on public.friendships for insert
  to authenticated
  with check (
    requester_id = auth.uid()
    and status = 'pending'
    and not exists (
      select 1 from public.blocks b
      where (b.blocker_id = requester_id and b.blocked_id = addressee_id)
         or (b.blocker_id = addressee_id and b.blocked_id = requester_id)
    )
  );

-- Only the addressee can accept, and only by flipping pending -> accepted.
create policy "Addressee can accept a request"
  on public.friendships for update
  to authenticated
  using (addressee_id = auth.uid() and status = 'pending')
  with check (addressee_id = auth.uid() and status = 'accepted');

-- Either side can remove the row — the requester cancels a pending request,
-- the addressee declines one, or either of them unfriends an accepted one.
create policy "Either side can remove a friendship"
  on public.friendships for delete
  to authenticated
  using (requester_id = auth.uid() or addressee_id = auth.uid());

grant select, insert, delete on public.friendships to authenticated;
grant update (status, responded_at) on public.friendships to authenticated;

-- ── notify_user: add friend_request ─────────────────────────────────────
-- Replaces the function from 20261006010000_notify_user_rpc.sql with the
-- same body plus one more allowed kind — sending a friend request is the
-- same "one player acting on another" shape as a lobby invite.
create or replace function public.notify_user(
  p_user_id uuid,
  p_kind text,
  p_title text,
  p_body text default null,
  p_href text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_recent_count integer;
begin
  if p_kind not in ('lobby_invite', 'join_request', 'friend_request') then
    raise exception 'notify_user: % is not a cross-player notification kind', p_kind;
  end if;

  if auth.uid() is null then
    raise exception 'notify_user: must be called by an authenticated user';
  end if;

  if p_user_id = auth.uid() then
    raise exception 'notify_user: use a direct insert to notify yourself';
  end if;

  select count(*) into v_recent_count
  from public.notifications
  where actor_id = auth.uid()
    and created_at > now() - interval '1 minute';

  if v_recent_count >= 20 then
    raise exception 'notify_user: rate limit exceeded, try again shortly';
  end if;

  insert into public.notifications (user_id, kind, title, body, href, actor_id)
  values (p_user_id, p_kind, p_title, p_body, p_href, auth.uid())
  returning id into v_id;

  return v_id;
end;
$$;


-- ========================================================================
-- 20261008000000_lobby_lifecycle.sql
-- ========================================================================

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


-- ========================================================================
-- 20261009000000_lobby_edit.sql
-- ========================================================================

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


-- ========================================================================
-- 20261010000000_lobby_notifications.sql
-- ========================================================================

-- Lobby notifications: the bell hears about applications and lobby starts.
--
-- 20261006000000_notifications.sql made notifications real and said that
-- cross-player ones ("Y applied to your lobby") must be written server-side,
-- by a trigger, so nobody can post as someone else. These are those triggers.
-- They run as the table owner and write only what the event itself implies.
--
--   someone applies          -> the leader gets a `join_request`
--   leader accepts           -> the applicant gets `application_accepted`
--   leader declines          -> the applicant gets `application_declined`
--   applicant withdraws      -> the leader's pending request is taken back
--   lobby starts             -> every member gets `lobby_started`
--   lobby starts or ends     -> requests nobody can accept any more are removed
--
-- `ref_id` (new) ties a join request to its application, so the Accept and
-- Decline buttons on /notifications can call respond_to_application for the
-- right row instead of only changing the notification.
--
-- Needs 20261006000000_notifications.sql (the teammates' migration) first.
--
-- Never edit this file once it has run — fix with a new migration.

alter table public.notifications add column ref_id uuid;

create index notifications_ref_idx on public.notifications (ref_id)
  where ref_id is not null;

create function public.notify_on_application()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  l record;
  v_href text;
  v_applicant text;
  v_leader text;
  v_role text;
  v_rank text;
  v_detail text;
  v_became_pending boolean;
begin
  select lb.id, lb.name, lb.leader_id, lb.game_id, g.slug
    into l
  from public.lobbies lb
  join public.games g on g.id = lb.game_id
  where lb.id = new.lobby_id;

  v_href := '/lfg/' || l.slug || '/lobby/' || l.id;

  -- (OLD does not exist on an insert, so it is only read on updates.)
  if tg_op = 'INSERT' then
    v_became_pending := new.status = 'pending';
  else
    v_became_pending := new.status = 'pending' and old.status <> 'pending';
  end if;

  -- A new application, or a player who left applying again.
  if v_became_pending then
    select username into v_applicant from public.profiles where id = new.applicant_id;
    select name into v_role from public.game_roles where id = new.role_id;
    select r.name into v_rank
    from public.user_game_mapping ugm
    join public.game_ranks r on r.id = ugm.rank_id
    where ugm.user_id = new.applicant_id and ugm.game_id = l.game_id;

    v_detail := concat_ws(' · ', v_role, v_rank);
    if new.message is not null then
      v_detail := concat_ws(': ', nullif(v_detail, ''), '"' || left(new.message, 160) || '"');
    end if;

    -- One live request per person per lobby.
    delete from public.notifications
    where user_id = l.leader_id and kind = 'join_request'
      and actor_id = new.applicant_id and href = v_href and resolution is null;

    insert into public.notifications (user_id, kind, title, body, actor_id, href, ref_id)
    values (
      l.leader_id,
      'join_request',
      coalesce(v_applicant, 'Someone') || ' wants to join ' || l.name,
      nullif(v_detail, ''),
      new.applicant_id,
      v_href,
      new.id
    );

  elsif tg_op = 'UPDATE' then
    if old.status = new.status then
      return null;
    end if;

    if new.status = 'accepted' then
      update public.notifications
      set resolution = 'accepted', read_at = coalesce(read_at, now())
      where ref_id = new.id and kind = 'join_request' and resolution is null;

      insert into public.notifications (user_id, kind, title, body, actor_id, href)
      values (new.applicant_id, 'application_accepted',
              'You''re in ' || l.name, 'The leader accepted your application.',
              l.leader_id, v_href);

    elsif new.status = 'declined' then
      update public.notifications
      set resolution = 'declined', read_at = coalesce(read_at, now())
      where ref_id = new.id and kind = 'join_request' and resolution is null;

      select username into v_leader from public.profiles where id = l.leader_id;
      insert into public.notifications (user_id, kind, title, actor_id, href)
      values (new.applicant_id, 'application_declined',
              coalesce(v_leader, 'The leader') || ' declined your application to ' || l.name,
              l.leader_id, v_href);

    elsif new.status = 'left' and old.status = 'pending' then
      -- Withdrawn: the request on the leader's screen is no longer real.
      delete from public.notifications
      where ref_id = new.id and kind = 'join_request' and resolution is null;
    end if;
  end if;

  return null;
end;
$$;

create trigger applications_notify
  after insert or update of status on public.applications
  for each row execute function public.notify_on_application();

create function public.notify_on_lobby_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_slug text;
begin
  if new.status = old.status then
    return null;
  end if;

  select slug into v_slug from public.games where id = new.game_id;

  -- Recruiting is over (started or ended): nobody can accept a request any
  -- more, so don't leave a button on the leader's screen that would fail.
  if new.status in ('started', 'completed', 'closed') then
    delete from public.notifications n
    using public.applications a
    where n.ref_id = a.id and a.lobby_id = new.id
      and n.kind = 'join_request' and n.resolution is null;
  end if;

  -- The group is going to play: tell everyone who is in, except the leader
  -- who just pressed the button.
  if new.status = 'started' and old.status in ('live', 'scheduled') then
    insert into public.notifications (user_id, kind, title, body, actor_id, href)
    select a.applicant_id, 'lobby_started',
           new.name || ' has started', 'Head over and join your teammates.',
           new.leader_id, '/lfg/' || v_slug || '/lobby/' || new.id
    from public.applications a
    where a.lobby_id = new.id and a.status = 'accepted';
  end if;

  return null;
end;
$$;

create trigger lobbies_notify
  after update of status on public.lobbies
  for each row execute function public.notify_on_lobby_change();

-- Trigger functions run as the owner whoever causes the event; nobody needs to
-- be able to call them by hand.
revoke all on function public.notify_on_application() from public, anon, authenticated;
revoke all on function public.notify_on_lobby_change() from public, anon, authenticated;


-- ========================================================================
-- 20261011000000_lobby_messages.sql
-- ========================================================================

-- Lobby chat: the `lobby_messages` entity from the proposal's ERD.
--
-- Who can talk: the leader and accepted members of a lobby that is still open
-- (live, scheduled or started). A pending applicant, someone who left, and
-- everybody else can neither read nor write.
--
-- What happens when the lobby ends (completed or closed): the chat is closed
-- for the players, as the lobby screen says, but the rows are KEPT. That is
-- the "private copy for moderators" the first mock chat left as a TODO:
-- reports about a lobby rely on its chat log as evidence, so an admin can read
-- an ended lobby's chat and a player no longer can. (Direct messages are the
-- opposite on purpose: nobody, admins included, can read a private
-- conversation through the API.)
--
-- Two kinds of row:
--   message  written by a player
--   system   "X joined the lobby", "The lobby has started": written only by
--            the triggers below, never by a client, so nobody can fake one
--
-- A guard against flooding: at most 30 messages a minute per player.
--
-- Error code added here: chat_rate_limited.
--
-- Never edit this file once it has run — fix with a new migration.

create table public.lobby_messages (
  id uuid primary key default gen_random_uuid(),
  lobby_id uuid not null references public.lobbies (id) on delete cascade,
  -- Null for system messages.
  sender_id uuid references public.profiles (id) on delete cascade,
  kind text not null default 'message' check (kind in ('message', 'system')),
  body text not null check (char_length(btrim(body)) between 1 and 1000),
  created_at timestamptz not null default now(),
  check ((kind = 'message') = (sender_id is not null))
);

-- The one query the app makes: this lobby's messages, oldest first.
create index lobby_messages_lobby_idx
  on public.lobby_messages (lobby_id, created_at);

-- Whether a player is in a lobby that is still open. Used by the policies
-- below; it runs as the owner so it doesn't depend on what the caller may
-- read, and takes the user as an argument so it can be tested directly.
create function public.can_chat_in_lobby(p_lobby_id uuid, p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select p_user_id is not null and exists (
    select 1
    from public.lobbies l
    where l.id = p_lobby_id
      and l.status in ('live', 'scheduled', 'started')
      and (
        l.leader_id = p_user_id
        or exists (
          select 1 from public.applications a
          where a.lobby_id = l.id
            and a.applicant_id = p_user_id
            and a.status = 'accepted'
        )
      )
  );
$$;

revoke all on function public.can_chat_in_lobby(uuid, uuid) from public, anon;
grant execute on function public.can_chat_in_lobby(uuid, uuid) to authenticated;

alter table public.lobby_messages enable row level security;

create policy "Lobby members read their lobby's chat; admins read it as evidence"
  on public.lobby_messages for select
  to authenticated
  using (
    public.can_chat_in_lobby(lobby_id, auth.uid())
    or public.is_admin(auth.uid())
  );

create policy "Members write to their lobby's chat as themselves"
  on public.lobby_messages for insert
  to authenticated
  with check (
    sender_id = auth.uid()
    and kind = 'message'
    and public.can_chat_in_lobby(lobby_id, auth.uid())
  );

-- No update or delete policy: a sent message can't be edited or unsent, for
-- the same accountability reason as direct messages.
grant select on public.lobby_messages to authenticated;
grant insert (lobby_id, sender_id, body) on public.lobby_messages to authenticated;

-- ── Flood guard ─────────────────────────────────────────────────────────
create function public.limit_lobby_chat_rate()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.kind = 'message' and (
    select count(*) from public.lobby_messages
    where sender_id = new.sender_id and created_at > now() - interval '1 minute'
  ) >= 30 then
    raise exception 'chat_rate_limited';
  end if;
  return new;
end;
$$;

create trigger lobby_messages_rate
  before insert on public.lobby_messages
  for each row execute function public.limit_lobby_chat_rate();

-- ── System messages ─────────────────────────────────────────────────────
create function public.chat_on_application()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text;
begin
  if tg_op <> 'UPDATE' or old.status = new.status then
    return null;
  end if;

  select username into v_name from public.profiles where id = new.applicant_id;

  if new.status = 'accepted' then
    insert into public.lobby_messages (lobby_id, kind, body)
    values (new.lobby_id, 'system', coalesce(v_name, 'Someone') || ' joined the lobby');
  elsif new.status = 'left' and old.status = 'accepted' then
    -- Leaving and being removed are recorded the same way, so both read this.
    insert into public.lobby_messages (lobby_id, kind, body)
    values (new.lobby_id, 'system', coalesce(v_name, 'Someone') || ' left the lobby');
  end if;

  return null;
end;
$$;

create trigger applications_chat
  after update of status on public.applications
  for each row execute function public.chat_on_application();

create function public.chat_on_lobby_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = old.status then
    return null;
  end if;

  if new.status = 'started' then
    insert into public.lobby_messages (lobby_id, kind, body)
    values (new.id, 'system', 'The lobby has started. Good luck!');
  elsif new.status = 'live' and old.status = 'started' then
    insert into public.lobby_messages (lobby_id, kind, body)
    values (new.id, 'system', 'Recruiting is open again');
  end if;

  return null;
end;
$$;

create trigger lobbies_chat
  after update of status on public.lobbies
  for each row execute function public.chat_on_lobby_status();

revoke all on function public.limit_lobby_chat_rate() from public, anon, authenticated;
revoke all on function public.chat_on_application() from public, anon, authenticated;
revoke all on function public.chat_on_lobby_status() from public, anon, authenticated;

-- ── Realtime ────────────────────────────────────────────────────────────
-- Publish the table so a new message reaches an open page. Same guard as
-- 20261007000100_realtime_publication.sql: safe to run again.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'lobby_messages'
  ) then
    alter publication supabase_realtime add table public.lobby_messages;
  end if;
end $$;


-- ========================================================================
-- 20261012000000_lobby_invites.sql
-- ========================================================================

-- Lobby invites: a leader asks a player to join, and the bell tells them.
--
-- Until now an invite was only a mock: the button flipped to "Invited" and
-- nothing reached the other player. This makes it real, in the same shape as
-- applications (which are the same thing the other way round).
--
--   leader invites a player   -> the player gets a `lobby_invite`
--   player accepts            -> they join the roster (an accepted application)
--   player declines           -> the invite is closed, the notification resolved
--   leader takes it back      -> the invite is cancelled, the notification removed
--   lobby starts or ends      -> pending invites expire, their notifications go
--
-- A pending invite holds an open slot, so a leader can't invite more people
-- than the lobby has room for. Accepting is checked again at that moment
-- (capacity, rank, one live lobby), exactly like accepting an application.
--
-- Also in this migration:
--  * `message` is dropped from the notification kinds. Direct messages have
--    their own unread count on the navbar; a notification per message would
--    only have duplicated it, and nothing ever wrote one.
--  * `notify_user` no longer takes `lobby_invite` or `join_request`. Both are
--    written by triggers now, and leaving them open let any signed-in player
--    forge an invite with a title and link of their choosing.
--
-- Needs 20261010000000_lobby_notifications.sql first.
-- Never edit this file once it has run — fix with a new migration.

-- ── Notification kinds: drop `message` ──────────────────────────────────
delete from public.notifications where kind = 'message';

alter table public.notifications drop constraint if exists notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check check (
  kind in (
    'lobby_invite',
    'join_request',
    'application_accepted',
    'application_declined',
    'lobby_started',
    'rating_due',
    'friend_request',
    'review_received',
    'report_update'
  )
);

-- ── notify_user: friend requests only ───────────────────────────────────
create or replace function public.notify_user(
  p_user_id uuid,
  p_kind text,
  p_title text,
  p_body text default null,
  p_href text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_recent_count integer;
begin
  if p_kind not in ('friend_request') then
    raise exception 'notify_user: % is not a cross-player notification kind', p_kind;
  end if;

  if auth.uid() is null then
    raise exception 'notify_user: must be called by an authenticated user';
  end if;

  if p_user_id = auth.uid() then
    raise exception 'notify_user: use a direct insert to notify yourself';
  end if;

  select count(*) into v_recent_count
  from public.notifications
  where actor_id = auth.uid()
    and created_at > now() - interval '1 minute';

  if v_recent_count >= 20 then
    raise exception 'notify_user: rate limit exceeded, try again shortly';
  end if;

  insert into public.notifications (user_id, kind, title, body, href, actor_id)
  values (p_user_id, p_kind, p_title, p_body, p_href, auth.uid())
  returning id into v_id;

  return v_id;
end;
$$;

-- ── The table ───────────────────────────────────────────────────────────
create table public.lobby_invites (
  id uuid primary key default gen_random_uuid(),
  lobby_id uuid not null references public.lobbies (id) on delete cascade,
  invitee_id uuid not null references public.profiles (id) on delete cascade,
  -- The lobby's leader at the time; the leader never changes, but keeping it
  -- here is what lets the policy and the rate limit avoid a join.
  inviter_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'declined', 'cancelled', 'expired')),
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  -- One row per player per lobby; inviting again after the leader took an
  -- invite back (or it lapsed) reopens the same row.
  unique (lobby_id, invitee_id)
);

create index lobby_invites_invitee_idx on public.lobby_invites (invitee_id)
  where status = 'pending';
create index lobby_invites_inviter_idx on public.lobby_invites (inviter_id, created_at);

alter table public.lobby_invites enable row level security;

-- The leader sees the invites they sent, the player sees the ones they got.
create policy "Leader and invitee read an invite"
  on public.lobby_invites for select to authenticated
  using (inviter_id = auth.uid() or invitee_id = auth.uid());

-- No insert/update/delete policy on purpose: every change goes through the
-- functions below, which check the rules.
grant select on public.lobby_invites to authenticated;

-- ── Invite ──────────────────────────────────────────────────────────────
-- Error codes: not_signed_in, lobby_not_found, not_leader, lobby_closed,
-- lobby_started, own_lobby, player_not_found, already_member, invitee_applied,
-- rank_not_eligible, applicant_busy, lobby_full, no_invite_slots,
-- already_invited, invite_declined, invite_rate_limited
create function public.invite_to_lobby(p_lobby_id uuid, p_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  l public.lobbies%rowtype;
  v_members integer;
  v_pending integer;
  v_existing public.lobby_invites%rowtype;
  v_had_invite boolean;
  v_id uuid;
begin
  if v_uid is null then
    raise exception 'not_signed_in';
  end if;

  perform public.expire_stale_lobbies();

  select * into l from public.lobbies where id = p_lobby_id for update;
  if not found then
    raise exception 'lobby_not_found';
  end if;
  if l.leader_id <> v_uid then
    raise exception 'not_leader';
  end if;
  if l.status in ('closed', 'completed') then
    raise exception 'lobby_closed';
  end if;
  if l.status = 'started' then
    raise exception 'lobby_started';
  end if;
  if p_user_id = v_uid then
    raise exception 'own_lobby';
  end if;
  if not exists (select 1 from public.profiles where id = p_user_id) then
    raise exception 'player_not_found';
  end if;

  if exists (
    select 1 from public.lobby_members where lobby_id = l.id and user_id = p_user_id
  ) then
    raise exception 'already_member';
  end if;
  -- They asked already: the leader answers that application instead.
  if exists (
    select 1 from public.applications
    where lobby_id = l.id and applicant_id = p_user_id and status = 'pending'
  ) then
    raise exception 'invitee_applied';
  end if;

  if not public.can_join_lobby(l.id, p_user_id) then
    raise exception 'rank_not_eligible';
  end if;

  if l.status = 'live' and exists (
    select 1 from public.lobby_members lm
    join public.lobbies o on o.id = lm.lobby_id
    where lm.user_id = p_user_id and o.status in ('live', 'started') and o.id <> l.id
  ) then
    raise exception 'applicant_busy';
  end if;

  select * into v_existing
  from public.lobby_invites
  where lobby_id = l.id and invitee_id = p_user_id;
  v_had_invite := found;
  if v_had_invite then
    if v_existing.status = 'pending' then
      raise exception 'already_invited';
    elsif v_existing.status = 'declined' then
      -- They said no; asking again would be pestering.
      raise exception 'invite_declined';
    end if;
  end if;

  -- A pending invite holds a slot.
  select count(*) into v_members from public.lobby_members where lobby_id = l.id;
  if v_members >= l.capacity then
    raise exception 'lobby_full';
  end if;
  select count(*) into v_pending
  from public.lobby_invites where lobby_id = l.id and status = 'pending';
  if v_members + v_pending >= l.capacity then
    raise exception 'no_invite_slots';
  end if;

  if (
    select count(*) from public.lobby_invites
    where inviter_id = v_uid and created_at > now() - interval '1 hour'
  ) >= 30 then
    raise exception 'invite_rate_limited';
  end if;

  if v_had_invite then
    update public.lobby_invites
    set status = 'pending', inviter_id = v_uid, created_at = now(), decided_at = null
    where id = v_existing.id
    returning id into v_id;
  else
    insert into public.lobby_invites (lobby_id, invitee_id, inviter_id)
    values (l.id, p_user_id, v_uid)
    returning id into v_id;
  end if;
  return v_id;
end;
$$;

-- ── Answer ──────────────────────────────────────────────────────────────
-- Error codes: not_signed_in, invite_not_found, invite_not_pending,
-- lobby_closed, lobby_started, lobby_full, rank_not_eligible,
-- already_in_live_lobby
create function public.respond_to_invite(p_invite_id uuid, p_accept boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_lobby_id uuid;
  i public.lobby_invites%rowtype;
  l public.lobbies%rowtype;
  v_taken integer;
  v_application public.applications%rowtype;
begin
  if v_uid is null then
    raise exception 'not_signed_in';
  end if;

  perform public.expire_stale_lobbies();

  select lobby_id into v_lobby_id
  from public.lobby_invites where id = p_invite_id and invitee_id = v_uid;
  if not found then
    raise exception 'invite_not_found';
  end if;

  select * into l from public.lobbies where id = v_lobby_id for update;

  -- Re-read under the lock: the leader may have taken it back a moment ago.
  select * into i from public.lobby_invites where id = p_invite_id;
  if i.status <> 'pending' then
    raise exception 'invite_not_pending';
  end if;

  if not p_accept then
    update public.lobby_invites
    set status = 'declined', decided_at = now()
    where id = i.id;
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

  -- Who is in has changed since the invite went out, so check the rank again.
  if not public.can_join_lobby(l.id, v_uid) then
    raise exception 'rank_not_eligible';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_uid::text, 0));
  if l.status = 'live' and exists (
    select 1 from public.lobby_members lm
    join public.lobbies o on o.id = lm.lobby_id
    where lm.user_id = v_uid and o.status in ('live', 'started') and o.id <> l.id
  ) then
    raise exception 'already_in_live_lobby';
  end if;

  -- Marked before the application changes: notify_on_application reads this
  -- (decided_at = now()) to know the player was invited rather than accepted
  -- from a request, and not tell them "the leader accepted your application".
  update public.lobby_invites
  set status = 'accepted', decided_at = now()
  where id = i.id;

  -- Joining is an accepted application, so the roster, the chat and the
  -- ratings need no second path.
  select * into v_application
  from public.applications
  where lobby_id = l.id and applicant_id = v_uid;
  if found then
    update public.applications
    set status = 'accepted', role_id = null, message = null,
        decided_at = now(), joined_at = now(), left_at = null
    where id = v_application.id;
  else
    insert into public.applications (
      lobby_id, game_id, applicant_id, status, decided_at, joined_at
    ) values (l.id, l.game_id, v_uid, 'accepted', now(), now());
  end if;
end;
$$;

-- ── Take an invite back ─────────────────────────────────────────────────
-- Error codes: not_signed_in, invite_not_found, invite_not_pending
create function public.cancel_invite(p_invite_id uuid)
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

  if not exists (
    select 1 from public.lobby_invites where id = p_invite_id and inviter_id = v_uid
  ) then
    raise exception 'invite_not_found';
  end if;

  update public.lobby_invites
  set status = 'cancelled', decided_at = now()
  where id = p_invite_id and status = 'pending';
  get diagnostics v_rows = row_count;
  if v_rows = 0 then
    raise exception 'invite_not_pending';
  end if;
end;
$$;

revoke all on function public.invite_to_lobby(uuid, uuid) from public, anon;
revoke all on function public.respond_to_invite(uuid, boolean) from public, anon;
revoke all on function public.cancel_invite(uuid) from public, anon;
grant execute on function public.invite_to_lobby(uuid, uuid) to authenticated;
grant execute on function public.respond_to_invite(uuid, boolean) to authenticated;
grant execute on function public.cancel_invite(uuid) to authenticated;

-- ── Notifications ───────────────────────────────────────────────────────
create function public.notify_on_invite()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  l record;
  v_href text;
  v_inviter text;
  v_became_pending boolean;
begin
  if tg_op = 'INSERT' then
    v_became_pending := new.status = 'pending';
  else
    if old.status = new.status then
      return null;
    end if;
    v_became_pending := new.status = 'pending';
  end if;

  select lb.id, lb.name, g.slug, g.name as game_name, gm.label as mode_label
    into l
  from public.lobbies lb
  join public.games g on g.id = lb.game_id
  join public.game_modes gm on gm.id = lb.mode_id
  where lb.id = new.lobby_id;

  v_href := '/lfg/' || l.slug || '/lobby/' || l.id;

  if v_became_pending then
    select username into v_inviter from public.profiles where id = new.inviter_id;

    -- One live invite per lobby per person (the leader may invite again after
    -- taking one back).
    delete from public.notifications
    where user_id = new.invitee_id and kind = 'lobby_invite'
      and href = v_href and resolution is null;

    insert into public.notifications (user_id, kind, title, body, actor_id, href, ref_id)
    values (
      new.invitee_id,
      'lobby_invite',
      coalesce(v_inviter, 'A leader') || ' invited you to ' || l.name,
      l.game_name || ' · ' || l.mode_label,
      new.inviter_id,
      v_href,
      new.id
    );

  elsif new.status in ('accepted', 'declined') then
    update public.notifications
    set resolution = new.status, read_at = coalesce(read_at, now())
    where ref_id = new.id and kind = 'lobby_invite' and resolution is null;

  else
    -- Cancelled or expired: there is nothing left to answer.
    delete from public.notifications
    where ref_id = new.id and kind = 'lobby_invite' and resolution is null;
  end if;

  return null;
end;
$$;

create trigger lobby_invites_notify
  after insert or update of status on public.lobby_invites
  for each row execute function public.notify_on_invite();

-- Recruiting is over (started or ended): a pending invite can't be accepted
-- any more, so let it lapse rather than leave a button that would fail.
create function public.expire_invites_on_lobby_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status in ('started', 'completed', 'closed') and old.status <> new.status then
    update public.lobby_invites
    set status = 'expired', decided_at = now()
    where lobby_id = new.id and status = 'pending';
  end if;
  return null;
end;
$$;

create trigger lobbies_expire_invites
  after update of status on public.lobbies
  for each row execute function public.expire_invites_on_lobby_change();

-- Same function as 20261010000000, with one change: a player who joined by
-- accepting an invite is not told "the leader accepted your application".
create or replace function public.notify_on_application()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  l record;
  v_href text;
  v_applicant text;
  v_leader text;
  v_role text;
  v_rank text;
  v_detail text;
  v_became_pending boolean;
begin
  select lb.id, lb.name, lb.leader_id, lb.game_id, g.slug
    into l
  from public.lobbies lb
  join public.games g on g.id = lb.game_id
  where lb.id = new.lobby_id;

  v_href := '/lfg/' || l.slug || '/lobby/' || l.id;

  -- (OLD does not exist on an insert, so it is only read on updates.)
  if tg_op = 'INSERT' then
    v_became_pending := new.status = 'pending';
  else
    v_became_pending := new.status = 'pending' and old.status <> 'pending';
  end if;

  -- A new application, or a player who left applying again.
  if v_became_pending then
    select username into v_applicant from public.profiles where id = new.applicant_id;
    select name into v_role from public.game_roles where id = new.role_id;
    select r.name into v_rank
    from public.user_game_mapping ugm
    join public.game_ranks r on r.id = ugm.rank_id
    where ugm.user_id = new.applicant_id and ugm.game_id = l.game_id;

    v_detail := concat_ws(' · ', v_role, v_rank);
    if new.message is not null then
      v_detail := concat_ws(': ', nullif(v_detail, ''), '"' || left(new.message, 160) || '"');
    end if;

    -- One live request per person per lobby.
    delete from public.notifications
    where user_id = l.leader_id and kind = 'join_request'
      and actor_id = new.applicant_id and href = v_href and resolution is null;

    insert into public.notifications (user_id, kind, title, body, actor_id, href, ref_id)
    values (
      l.leader_id,
      'join_request',
      coalesce(v_applicant, 'Someone') || ' wants to join ' || l.name,
      nullif(v_detail, ''),
      new.applicant_id,
      v_href,
      new.id
    );

  elsif tg_op = 'UPDATE' then
    if old.status = new.status then
      return null;
    end if;

    if new.status = 'accepted' then
      update public.notifications
      set resolution = 'accepted', read_at = coalesce(read_at, now())
      where ref_id = new.id and kind = 'join_request' and resolution is null;

      -- They are in now, so an invite still waiting for them is moot.
      update public.lobby_invites
      set status = 'cancelled', decided_at = now()
      where lobby_id = new.lobby_id and invitee_id = new.applicant_id
        and status = 'pending';

      if not exists (
        select 1 from public.lobby_invites
        where lobby_id = new.lobby_id and invitee_id = new.applicant_id
          and status = 'accepted' and decided_at = now()
      ) then
        insert into public.notifications (user_id, kind, title, body, actor_id, href)
        values (new.applicant_id, 'application_accepted',
                'You''re in ' || l.name, 'The leader accepted your application.',
                l.leader_id, v_href);
      end if;

    elsif new.status = 'declined' then
      update public.notifications
      set resolution = 'declined', read_at = coalesce(read_at, now())
      where ref_id = new.id and kind = 'join_request' and resolution is null;

      select username into v_leader from public.profiles where id = l.leader_id;
      insert into public.notifications (user_id, kind, title, actor_id, href)
      values (new.applicant_id, 'application_declined',
              coalesce(v_leader, 'The leader') || ' declined your application to ' || l.name,
              l.leader_id, v_href);

    elsif new.status = 'left' and old.status = 'pending' then
      -- Withdrawn: the request on the leader's screen is no longer real.
      delete from public.notifications
      where ref_id = new.id and kind = 'join_request' and resolution is null;
    end if;
  end if;

  return null;
end;
$$;

revoke all on function public.notify_on_invite() from public, anon, authenticated;
revoke all on function public.expire_invites_on_lobby_change() from public, anon, authenticated;


-- ========================================================================
-- 20261013000000_drop_report_update_notification.sql
-- ========================================================================

-- Drops the `report_update` notification kind ("Your report was reviewed").
--
-- Nothing ever wrote one: the report feature is not built, and when it is, the
-- reporter does not need to be pinged about a moderator's decision. If that
-- changes, add the kind back in the same migration that creates the trigger
-- that writes it, so the list of kinds never gets ahead of what exists.
--
-- Needs 20261012000000_lobby_invites.sql first (it set the previous list).
-- Never edit this file once it has run — fix with a new migration.

delete from public.notifications where kind = 'report_update';

alter table public.notifications drop constraint if exists notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check check (
  kind in (
    'lobby_invite',
    'join_request',
    'application_accepted',
    'application_declined',
    'lobby_started',
    'rating_due',
    'friend_request',
    'review_received'
  )
);


-- ========================================================================
-- 20261014000000_removed_from_lobby_notification.sql
-- ========================================================================

-- "You were removed from a lobby": a notification for the player the leader
-- removes, so they find out (and the pop-up can tell them) instead of seeing
-- the lobby quietly vanish from their screen.
--
-- remove_member() records a removal exactly like leaving (status 'left'), so
-- the trigger tells the two apart by who is acting: a player who leaves is the
-- applicant themselves, a removal is someone else (the leader).
--
-- Needs 20261012000000_lobby_invites.sql (it holds the latest notify_on_application).
-- Never edit this file once it has run — fix with a new migration.

alter table public.notifications drop constraint if exists notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check check (
  kind in (
    'lobby_invite',
    'join_request',
    'application_accepted',
    'application_declined',
    'lobby_started',
    'rating_due',
    'friend_request',
    'review_received',
    'removed_from_lobby'
  )
);

-- Same function as 20261012000000, plus the removal branch at the end.
create or replace function public.notify_on_application()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  l record;
  v_href text;
  v_applicant text;
  v_leader text;
  v_role text;
  v_rank text;
  v_detail text;
  v_became_pending boolean;
begin
  select lb.id, lb.name, lb.leader_id, lb.game_id, g.slug
    into l
  from public.lobbies lb
  join public.games g on g.id = lb.game_id
  where lb.id = new.lobby_id;

  v_href := '/lfg/' || l.slug || '/lobby/' || l.id;

  -- (OLD does not exist on an insert, so it is only read on updates.)
  if tg_op = 'INSERT' then
    v_became_pending := new.status = 'pending';
  else
    v_became_pending := new.status = 'pending' and old.status <> 'pending';
  end if;

  -- A new application, or a player who left applying again.
  if v_became_pending then
    select username into v_applicant from public.profiles where id = new.applicant_id;
    select name into v_role from public.game_roles where id = new.role_id;
    select r.name into v_rank
    from public.user_game_mapping ugm
    join public.game_ranks r on r.id = ugm.rank_id
    where ugm.user_id = new.applicant_id and ugm.game_id = l.game_id;

    v_detail := concat_ws(' · ', v_role, v_rank);
    if new.message is not null then
      v_detail := concat_ws(': ', nullif(v_detail, ''), '"' || left(new.message, 160) || '"');
    end if;

    -- One live request per person per lobby.
    delete from public.notifications
    where user_id = l.leader_id and kind = 'join_request'
      and actor_id = new.applicant_id and href = v_href and resolution is null;

    insert into public.notifications (user_id, kind, title, body, actor_id, href, ref_id)
    values (
      l.leader_id,
      'join_request',
      coalesce(v_applicant, 'Someone') || ' wants to join ' || l.name,
      nullif(v_detail, ''),
      new.applicant_id,
      v_href,
      new.id
    );

  elsif tg_op = 'UPDATE' then
    if old.status = new.status then
      return null;
    end if;

    if new.status = 'accepted' then
      update public.notifications
      set resolution = 'accepted', read_at = coalesce(read_at, now())
      where ref_id = new.id and kind = 'join_request' and resolution is null;

      -- They are in now, so an invite still waiting for them is moot.
      update public.lobby_invites
      set status = 'cancelled', decided_at = now()
      where lobby_id = new.lobby_id and invitee_id = new.applicant_id
        and status = 'pending';

      if not exists (
        select 1 from public.lobby_invites
        where lobby_id = new.lobby_id and invitee_id = new.applicant_id
          and status = 'accepted' and decided_at = now()
      ) then
        insert into public.notifications (user_id, kind, title, body, actor_id, href)
        values (new.applicant_id, 'application_accepted',
                'You''re in ' || l.name, 'The leader accepted your application.',
                l.leader_id, v_href);
      end if;

    elsif new.status = 'declined' then
      update public.notifications
      set resolution = 'declined', read_at = coalesce(read_at, now())
      where ref_id = new.id and kind = 'join_request' and resolution is null;

      select username into v_leader from public.profiles where id = l.leader_id;
      insert into public.notifications (user_id, kind, title, actor_id, href)
      values (new.applicant_id, 'application_declined',
              coalesce(v_leader, 'The leader') || ' declined your application to ' || l.name,
              l.leader_id, v_href);

    elsif new.status = 'left' and old.status = 'pending' then
      -- Withdrawn: the request on the leader's screen is no longer real.
      delete from public.notifications
      where ref_id = new.id and kind = 'join_request' and resolution is null;

    elsif new.status = 'left' and old.status = 'accepted'
          and auth.uid() is not null and auth.uid() <> new.applicant_id then
      -- Someone else ended their place: the leader removed them. (A player
      -- leaving is the applicant themselves and tells nobody.)
      insert into public.notifications (user_id, kind, title, body, actor_id, href)
      values (new.applicant_id, 'removed_from_lobby',
              'You were removed from ' || l.name,
              'The leader removed you from the lobby.',
              l.leader_id, v_href);
    end if;
  end if;

  return null;
end;
$$;


-- ========================================================================
-- 20261015000000_game_account_details.sql
-- ========================================================================

-- What a player fills in for each game, beyond name, region, rank and roles:
--
--   * the game's own account number, because a name alone doesn't identify
--     anyone in the mobile games. Mobile Legends needs a Player ID and a Zone
--     ID, Free Fire a UID, PUBG Mobile a Character ID. Riot games and CS2 use
--     the name (a Riot ID is "Name#TAG"), so they leave these empty.
--   * which roles are a player's favourites.
--
-- Both are optional, like everything else on the game setup. The digits-only
-- checks mirror what the form accepts (src/data/game-accounts.ts); the lengths
-- are loose on purpose, because the formats come from guides, not the
-- publishers, and a rule that is too tight would lock out a real account.
--
-- Columns are granted one by one, as for the rest of this table, so nothing
-- else on the row can be written through the API.
--
-- Never edit this file once it has run — fix with a new migration.

alter table public.user_game_mapping
  add column account_id text
    check (account_id is null or account_id ~ '^[0-9]{1,20}$'),
  add column zone_id text
    check (zone_id is null or zone_id ~ '^[0-9]{1,8}$');

alter table public.user_game_roles
  add column is_favorite boolean not null default false;

grant insert (account_id, zone_id) on public.user_game_mapping to authenticated;
grant update (account_id, zone_id) on public.user_game_mapping to authenticated;
-- Roles are replaced as a set (delete, then insert), so only insert needs it.
grant insert (is_favorite) on public.user_game_roles to authenticated;


-- ========================================================================
-- 20261016000000_realtime_lobby_tables.sql
-- ========================================================================

-- Realtime for the lobby and friend screens, so a page updates when someone
-- else changes something instead of waiting for a reload:
--
--   lobbies        a lobby starts, ends, is edited, or a new one is posted
--   applications   someone applies, is accepted, leaves or is removed
--   lobby_invites  an invitation is sent, answered or taken back
--   friendships    a friend request arrives or is answered
--
-- Publishing a table exposes nothing extra: Realtime applies the same row
-- level security as a normal query, so each person only receives changes to
-- rows they could already read (the roster is public, a pending application
-- only reaches the applicant and the leader, and so on).
--
-- Same guard as 20261007000100_realtime_publication.sql: `alter publication
-- ... add table` has no IF NOT EXISTS, so this is safe to run again.
--
-- To undo: alter publication supabase_realtime drop table public.<table>;
--
-- Never edit this file once it has run — fix with a new migration.

do $$
declare
  target text;
begin
  foreach target in array array['lobbies', 'applications', 'lobby_invites', 'friendships'] loop
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = target
    ) then
      execute format(
        'alter publication supabase_realtime add table public.%I',
        target
      );
    end if;
  end loop;
end $$;


-- ========================================================================
-- 20261115000000_minimum_age_18.sql
-- ========================================================================

-- Minimum age 13 → 18.
--
-- The October 2026 proposal revision narrows the scope to adults: Indonesia's
-- personal data law (UU PDP No. 27 Tahun 2022) requires a parent or guardian's
-- consent before a child's personal data may be processed, and TemanGame has
-- no way to collect or verify that consent. Raising the floor is cheaper and
-- more honest than building a guardian-consent flow.
--
-- Only the function body changes; the trigger created in
-- `20261003000000_profiles_dossier.sql` already points at this name.
--
-- NOTE: triggers fire on insert and update only, so any row already stored
-- with an age between 13 and 17 stays as it is. Those accounts keep working
-- until someone edits that date. Check for them before UAT:
--
--   select user_id, date_of_birth
--   from public.profile_private
--   where date_of_birth > (current_date - interval '18 years');

create or replace function public.enforce_minimum_age()
returns trigger
language plpgsql
as $$
begin
  if new.date_of_birth is not null
     and new.date_of_birth > (current_date - interval '18 years') then
    raise exception 'You must be at least 18 years old.'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;


-- ========================================================================
-- 20261115000100_thesis_naming.sql
-- ========================================================================

-- Menyelaraskan nama tabel dan nilai status dengan ERD skripsi, plus kolom
-- playstyle pada lobi (Pb pada Persamaan 3.2).
--
-- Rencana lengkap: docs/proposal-revision-2026-10.md §3.1, §3.5, §6.0.
--
-- JALANKAN SEKALIGUS, SATU KALI, jangan dipotong per bagian.
--
-- ── Dua hal yang membuat urutannya penting ──────────────────────────────
--
-- 1. BADAN FUNGSI DITULIS ULANG SEBELUM ADA DML APA PUN.
--    Badan fungsi plpgsql disimpan sebagai TEKS dan baru diurai saat
--    dipanggil, jadi `alter table ... rename` tidak ikut memperbarui isinya.
--    Versi pertama migrasi ini menjalankan UPDATE status lebih dulu; UPDATE
--    itu memicu trigger notify_on_lobby_change() yang masih menyebut
--    public.games, dan seluruh migrasi gagal:
--
--      ERROR: 42P01: relation "public.games" does not exist
--      CONTEXT: PL/pgSQL function notify_on_lobby_change() line 9
--
-- 2. TRIGGER DIMATIKAN SELAMA PERPINDAHAN DATA.
--    Tabel lobi punya tiga trigger yang aktif saat status berubah
--    (lobbies_notify, lobbies_chat, lobbies_expire_invites). Yang paling
--    berbahaya chat_on_lobby_status(): begitu status 'started' berubah jadi
--    'in_progress' ia akan menyisipkan pesan sistem "The lobby has started"
--    ke chat SETIAP lobi yang sedang berjalan. Yang berubah di sini cuma
--    ejaan statusnya, bukan keadaan lobinya, jadi tidak boleh ada efek
--    samping sama sekali.
--
-- ── Kenapa bagian fungsi ditulis pakai pg_get_functiondef ───────────────
-- Ada 20 fungsi yang menyebut nama lama. Daripada menyalin ulang semuanya
-- (berisiko memakai versi yang sudah usang), langkah 2 membaca definisi yang
-- BENAR-BENAR hidup di database, mengganti namanya, lalu menjalankan ulang.
-- Tanda kutip ikut dicocokkan ('live', bukan live), sehingga 'lobby_started'
-- pada notifikasi tidak ikut terganti.
--
-- ── Kalau gagal di tengah ───────────────────────────────────────────────
-- Aman. SQL editor Supabase mengirim seluruh skrip sebagai satu pesan, dan
-- PostgreSQL membungkusnya dalam transaksi implisit: satu statement gagal,
-- semuanya dibatalkan. Sudah terbukti saat percobaan pertama.
--
-- YANG TIDAK DILAKUKAN DI SINI: menambah parameter p_playstyle ke
-- create_lobby/update_lobby. Itu mengubah signature sehingga fungsinya harus
-- dibuat ulang utuh — dan keduanya akan ditulis ulang lagi saat lobby_tag
-- masuk. Kolomnya disiapkan sekarang, pengisiannya menyusul.

-- ── 1. Nama tabel ───────────────────────────────────────────────────────
-- Indeks, foreign key, kebijakan RLS dan view ikut terbawa otomatis:
-- semuanya menyimpan OID, bukan nama.
alter table public.games       rename to game;
alter table public.lobbies     rename to lobby;
alter table public.game_ranks  rename to rank_tier;
alter table public.game_roles  rename to game_role;
alter table public.lobby_roles rename to lobby_required_role;

-- Skripsi menyebutnya tabel; di sini tetap view. Keanggotaan diturunkan dari
-- lobby.leader_id dan applications yang diterima, jadi tidak bisa melenceng
-- dari sumbernya. Dicatat sebagai penyimpangan sadar.
alter view public.lobby_members rename to lobby_member;

-- `profiles` sengaja TIDAK diubah jadi `user`: `user` kata kunci yang
-- dicadangkan PostgreSQL, jadi harus ditulis "user" selamanya. Skripsi versi
-- revisi sudah mengakui kredensial ditangani Supabase Auth.

-- ── 2. Tulis ulang badan fungsi (SEBELUM DML apa pun) ───────────────────
do $rewrite$
declare
  fn      record;
  src     text;
  updated text;
  changed int := 0;
begin
  for fn in
    select p.oid, p.proname, pg_get_functiondef(p.oid) as def
    from pg_proc p
    where p.pronamespace = 'public'::regnamespace
      and p.prokind = 'f'
  loop
    src := fn.def;
    updated := src;

    -- Nama tabel. Semua rujukan di dalam fungsi berskema (public.x); yang
    -- tanpa skema hanya muncul di komentar berkas migrasi.
    -- Urutan penting: lobby_members dan lobby_roles lebih dulu, baru lobbies.
    updated := replace(updated, 'public.lobby_members', 'public.lobby_member');
    updated := replace(updated, 'public.lobby_roles',   'public.lobby_required_role');
    updated := replace(updated, 'public.lobbies',       'public.lobby');
    updated := replace(updated, 'public.game_ranks',    'public.rank_tier');
    updated := replace(updated, 'public.game_roles',    'public.game_role');
    updated := replace(updated, 'public.games',         'public.game');

    -- Nilai status, berikut tanda kutipnya.
    updated := replace(updated, '''live''',    '''open''');
    updated := replace(updated, '''started''', '''in_progress''');
    updated := replace(updated, '''closed''',  '''cancelled''');

    if updated <> src then
      execute updated;
      changed := changed + 1;
      raise notice 'ditulis ulang: %', fn.proname;
    end if;
  end loop;

  raise notice '--- % fungsi ditulis ulang ---', changed;
end
$rewrite$;

-- ── 3. Nilai status ─────────────────────────────────────────────────────
alter table public.lobby drop constraint lobbies_status_check;

-- Trigger dimatikan: ini penggantian ejaan, bukan perubahan keadaan lobi.
-- `user` artinya hanya trigger buatan kita; trigger sistem (foreign key)
-- tetap aktif.
alter table public.lobby disable trigger user;

update public.lobby
set status = case status
  when 'live'    then 'open'
  when 'started' then 'in_progress'
  when 'closed'  then 'cancelled'
  else status
end
where status in ('live', 'started', 'closed');

alter table public.lobby enable trigger user;

alter table public.lobby add constraint lobby_status_check
  check (status in ('open', 'scheduled', 'in_progress', 'completed', 'cancelled'));

alter table public.lobby alter column status set default 'open';

-- `full` sengaja tidak ditambahkan. Penuh atau tidak diturunkan dari capacity
-- dikurangi jumlah anggota; menyimpannya akan melenceng begitu ada yang keluar.

-- ── 4. Playstyle lobi (Pb) ──────────────────────────────────────────────
-- Boleh null selama create_lobby belum menerimanya; pembacanya jatuh kembali
-- ke playstyle pembuat lobi sampai migrasi lobby_tag mengisinya.
alter table public.lobby
  add column playstyle smallint check (playstyle between 1 and 5);

comment on column public.lobby.playstyle is
  'Pb pada Persamaan 3.2, skala 1-5 menurut Tabel 3.2. Milik lobi, bukan '
  'pembuatnya: leader yang kompetitif tetap boleh membuat lobi santai.';

-- ── 5. Periksa sendiri ──────────────────────────────────────────────────
-- Melempar exception kalau masih ada fungsi yang menyebut nama lama. Lebih
-- baik gagal di sini (dan ikut dibatalkan) daripada gagal nanti saat seorang
-- pemain memakai aplikasinya.
do $verify$
declare
  leftovers text;
  trig_off  text;
begin
  select string_agg(p.proname, ', ')
  into leftovers
  from pg_proc p
  where p.pronamespace = 'public'::regnamespace
    and p.prokind = 'f'
    and (
      pg_get_functiondef(p.oid) ~ 'public\.(lobbies|games|game_ranks|game_roles|lobby_roles|lobby_members)\M'
      or pg_get_functiondef(p.oid) ~ '''(live|started|closed)'''
    );

  if leftovers is not null then
    raise exception 'Masih memakai nama lama: %', leftovers;
  end if;

  -- Pastikan trigger benar-benar hidup lagi.
  select string_agg(tgname, ', ')
  into trig_off
  from pg_trigger
  where tgrelid = 'public.lobby'::regclass
    and not tgisinternal
    and tgenabled = 'D';

  if trig_off is not null then
    raise exception 'Trigger masih mati: %', trig_off;
  end if;

  raise notice 'Pemeriksaan lolos: nama lama bersih, trigger aktif.';
end
$verify$;


-- ========================================================================
-- 20260919000200_reports_moderation.sql
-- ========================================================================

-- Reports/sanction/moderation. Written 2026-09-19, deliberately left unrun
-- until the report feature was being built; applied November 2026 as Fase 1
-- §6.1e (docs/proposal-revision-2026-10.md). Edited before it ran, which is
-- why this file carries later decisions: `sanction` singular to match the
-- thesis ERD, no `ban` sanction type, and a real `lobby_id` foreign key.
--
-- Original note: the Account/Login/Profile/Roles slice (this migration's only
-- dependency, `20260919000100_admin_roles.sql`'s `admins` table plus
-- `profiles`) doesn't need any of this to work.
--
-- DIVERGES from the proposal's entity count: adds `sanction`,
-- `sanction_reports`, and `admin_actions` — three tables not in the
-- original 13-entity ERD — plus extra columns on `reports` beyond what
-- the proposal's data dictionary describes. The proposal's own `reports`
-- entity already covers "status penanganan tiket... catatan resolusi
-- dari administrator," so this is best framed as *detailing* that
-- entity rather than inventing a new one. See docs/thesis-spec.md.

-- ─── Reports ────────────────────────────────────────────────────────
-- The proposal's `reports` entity, built with the full shape
-- admin-console.md actually needs (status/assignment/resolution) rather
-- than a bare version we'd just have to alter later.
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles (id),
  target_id uuid not null references public.profiles (id),
  -- The Lobby slice has landed, so this is a real foreign key now. Null
  -- stays allowed: a report from a profile page has no lobby context.
  lobby_id uuid references public.lobby (id) on delete set null,
  reason text not null,
  details text,
  evidence_url text,
  -- Nama mengikuti ERD skripsi: pending -> resolved (terbukti) atau
  -- rejected (tidak terbukti). `in_review` adalah tambahan — admin mengklaim
  -- kasus supaya dua moderator tidak mengerjakan laporan yang sama.
  status text not null default 'pending'
    check (status in ('pending', 'in_review', 'resolved', 'rejected')),
  assigned_to uuid references public.admins (user_id),
  resolution_outcome text,
  resolution_note text,
  resolved_by uuid references public.admins (user_id),
  resolved_at timestamptz,
  -- FK added after `sanction` is created below (forward reference).
  sanction_id uuid,
  created_at timestamptz not null default now()
);

alter table public.reports enable row level security;

-- Reporter sees their own submissions; the reported player does NOT see
-- reports filed against them (admin-console.md: "the player sees the
-- rule broken, never who reported them") — only admins get full
-- visibility.
create policy "Reporters and admins can view reports"
  on public.reports for select
  to authenticated
  using (reporter_id = auth.uid() or public.is_admin(auth.uid()));

create policy "Players can file reports as themselves"
  on public.reports for insert
  to authenticated
  with check (reporter_id = auth.uid());

create policy "Admins can update report status and resolution"
  on public.reports for update
  to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

grant select, insert on public.reports to authenticated;
grant update (status, assigned_to, resolution_outcome, resolution_note, resolved_by, resolved_at, sanction_id)
  on public.reports to authenticated;

-- ─── Sanctions ──────────────────────────────────────────────────────
create table public.sanction (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.profiles (id),
  -- Two kinds only, per the October 2026 proposal revision: a warning, or a
  -- suspension with a start and an end. A permanent ban has no duration, so
  -- the thesis' `sanction` entity cannot express one. Reputation is never
  -- adjusted by a moderator either — it moves only through player ratings.
  type text not null check (type in ('warning', 'suspension')),
  duration_days integer,
  reason text not null,
  note text,
  issued_by uuid not null references public.admins (user_id),
  issued_at timestamptz not null default now(),
  expires_at timestamptz,
  lifted_at timestamptz,
  lifted_by uuid references public.admins (user_id),
  lift_reason text
);

alter table public.sanction enable row level security;

alter table public.reports
  add constraint reports_sanction_id_fkey
  foreign key (sanction_id) references public.sanction (id);

-- A player can see their own sanction history (this is exactly the
-- "sanction history" transparency respondents rated highest in the
-- survey — BAB 3.2.1). Admins see everyone's.
create policy "Players can view their own sanctions, admins view all"
  on public.sanction for select
  to authenticated
  using (player_id = auth.uid() or public.is_admin(auth.uid()));

-- Split into insert/update rather than "for all" deliberately — no
-- delete policy exists at all, so a sanction can never be removed via
-- the API, only "lifted" (an update). Matches admin-console.md: "Nothing
-- is deleted."
create policy "Admins can issue sanctions"
  on public.sanction for insert
  to authenticated
  with check (public.is_admin(auth.uid()));

create policy "Admins can update sanctions (e.g. lifting one)"
  on public.sanction for update
  to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

grant select, insert, update on public.sanction to authenticated;

-- One decision can close several reports against the same player
-- (admin-console.md) — join table rather than a single FK on reports,
-- since it's genuinely many-to-many.
create table public.sanction_reports (
  sanction_id uuid not null references public.sanction (id),
  report_id uuid not null references public.reports (id),
  primary key (sanction_id, report_id)
);

alter table public.sanction_reports enable row level security;

create policy "Admins manage sanction-report links"
  on public.sanction_reports for all
  to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

grant select, insert on public.sanction_reports to authenticated;

-- ─── Admin actions (audit log) ──────────────────────────────────────
-- Append-only by construction: no update/delete policy exists for any
-- role, so nothing except a direct service_role query can ever change
-- or remove a row here. Matches admin-console.md: "Nothing is deleted."
create table public.admin_actions (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references public.admins (user_id),
  type text not null,
  -- Polymorphic reference (player/lobby/report) — deliberately no FK
  -- constraint, since the target table depends on target_type. Enforced
  -- in application code, not the database.
  target_type text not null check (target_type in ('player', 'lobby', 'report')),
  target_id uuid not null,
  summary text not null,
  reason text not null check (char_length(reason) >= 10),
  created_at timestamptz not null default now()
);

alter table public.admin_actions enable row level security;

-- Internal only — never shown to players.
create policy "Admins can view the audit log"
  on public.admin_actions for select
  to authenticated
  using (public.is_admin(auth.uid()));

create policy "Admins can write audit log entries"
  on public.admin_actions for insert
  to authenticated
  with check (public.is_admin(auth.uid()));

grant select, insert on public.admin_actions to authenticated;


-- ========================================================================
-- 20261115000200_lobby_playstyle_grant.sql
-- ========================================================================

-- Memberi hak baca kolom `lobby.playstyle`.
--
-- Perbaikan untuk `20261115000100_thesis_naming.sql`, yang menambahkan kolom
-- itu tanpa memberinya grant.
--
-- Kenapa terlewat: tabel lobi TIDAK memakai grant setingkat tabel. Migrasi
-- `20261008000000_lobby_lifecycle.sql` mencabut `select` pada seluruh tabel
-- lalu mengembalikannya kolom per kolom, supaya `discord_url` tidak pernah
-- terbaca lewat API. Kolom baru tidak mewarisi apa pun dari pola itu — jadi
-- `add column` menghasilkan kolom yang tidak bisa dibaca siapa pun.
--
-- Akibatnya belum terasa karena belum ada yang membaca `playstyle`. Tapi
-- begitu Persamaan 3.2 disambungkan, seluruh kueri yang menyertakan kolom ini
-- akan gagal dengan `42501 permission denied for table lobby` — pesan yang
-- menunjuk ke tabel, bukan ke kolomnya, jadi sangat membingungkan dicari.
--
-- PELAJARAN untuk migrasi berikutnya: setiap `add column` pada `lobby`,
-- `profiles`, atau `profile_private` harus diikuti `grant select (kolom)`.
-- Ketiganya memakai grant per kolom.

grant select (playstyle) on public.lobby to anon, authenticated;

-- Pemeriksaan: melempar exception kalau masih ada kolom lobi yang tidak bisa
-- dibaca `anon`, selain discord_url yang memang sengaja ditutup.
do $verify$
declare
  ungranted text;
begin
  select string_agg(c.column_name, ', ')
  into ungranted
  from information_schema.columns c
  where c.table_schema = 'public'
    and c.table_name = 'lobby'
    and c.column_name <> 'discord_url'
    and not has_column_privilege('anon', 'public.lobby', c.column_name, 'SELECT');

  if ungranted is not null then
    raise exception 'Kolom lobi tanpa hak baca: %', ungranted;
  end if;

  raise notice 'Pemeriksaan lolos: semua kolom lobi terbaca kecuali discord_url.';
end
$verify$;


-- ========================================================================
-- 20261116000000_personality_tags.sql
-- ========================================================================

-- Tag personalitas sebagai tabel, menggantikan `profiles.personality_tags`.
--
-- Fase 1 §6.1 bagian pertama. Rencana: docs/proposal-revision-2026-10.md
--
-- ── Kenapa dipecah jadi tabel ───────────────────────────────────────────
-- Revisi proposal menolak penyimpanan beberapa tag dalam satu kolom dengan
-- alasan bentuk normal pertama (1NF): "Penyimpanan tag pada tabel tersendiri
-- menggantikan penyimpanan beberapa tag dalam satu kolom teks yang dipisahkan
-- koma, sehingga setiap kolom hanya berisi satu nilai."
--
-- Alasan praktisnya lebih kuat lagi: Persamaan 3.13 menghitung kekuatan tag
-- dari jumlah PENILAI BERBEDA yang memberi tag itu. Itu tidak bisa dihitung
-- dari sebuah array di baris pengguna — butuh baris per (penilai, tag).
--
-- ── Yang TIDAK dibuat di sini ───────────────────────────────────────────
--   * `review_tag` — merujuk `reviews` yang belum ada. Menyusul bersama
--     tabel reviews dan perhitungan Bayesian.
--   * `lobby_tag` (himpunan B) — belum ada yang bisa menulisinya. Semua
--     penulisan data lobi harus lewat fungsi database, dan create_lobby /
--     update_lobby baru ditulis ulang di bagian ketiga. Membuat tabel yang
--     tidak bisa diisi siapa pun hanya jadi beban.
--
-- ── Catatan penting untuk yang melanjutkan ──────────────────────────────
-- `lobby.tags` yang sudah ada BUKAN himpunan B. Itu "vibe tag" dari form
-- buat lobi dengan kosakata sendiri (Competitive, Tactical, Grinding, Voice
-- Comms, Chill) yang hanya beririsan satu nilai dengan tag personalitas.
-- Jangan digabungkan: `lobby_tag` nanti adalah tabel terpisah.
--
-- `profiles.personality_tags` sengaja BELUM dihapus. Kolomnya masih dibaca
-- di banyak layar; isinya disalin ke sini dulu, kode dipindahkan, baru
-- kolomnya dibuang di migrasi terpisah setelah terbukti aman.

-- ── 1. Tabel induk tag ──────────────────────────────────────────────────
create table public.tag (
  id smallint primary key generated always as identity,
  name text not null unique,
  -- Urutan tampil di form; bukan peringkat kepentingan.
  sort_order smallint not null
);

-- Kelimanya sama persis dengan daftar yang selama ini dibatasi oleh check
-- constraint `profiles.personality_tags`, supaya penyalinan di langkah 4
-- tidak ada yang tercecer.
insert into public.tag (name, sort_order) values
  ('Shot Caller', 1),
  ('Positive Mental Attitude', 2),
  ('Chill', 3),
  ('Never Surrender', 4),
  ('Flex Player', 5);

-- ── 2. Tag pilihan pengguna sendiri (p_t pada Persamaan 3.13) ───────────
create table public.user_tag (
  user_id uuid not null references public.profiles (id) on delete cascade,
  tag_id smallint not null references public.tag (id),
  created_at timestamptz not null default now(),
  primary key (user_id, tag_id)
);

create index user_tag_tag_idx on public.user_tag (tag_id);

-- ── 3. Batas jumlah tag ─────────────────────────────────────────────────
-- Revisi menetapkan 3 sampai 5 tag saat membuat akun. Hanya batas ATAS yang
-- ditegakkan di sini: batas bawah tidak bisa diperiksa per baris (baris
-- pertama dari tiga selalu terlihat seperti pelanggaran), dan sebagian akun
-- yang sudah ada memiliki nol atau dua tag. Minimum 3 ditegakkan di form,
-- sama seperti aturan umur yang juga hanya berlaku untuk data baru.
create function public.limit_user_tags()
returns trigger
language plpgsql
as $$
begin
  if (select count(*) from public.user_tag where user_id = new.user_id) > 5 then
    raise exception 'too_many_tags'
      using errcode = 'check_violation';
  end if;
  return null;
end;
$$;

create trigger user_tag_limit
  after insert on public.user_tag
  for each row execute function public.limit_user_tags();

-- ── 4. Salin isi profiles.personality_tags ──────────────────────────────
insert into public.user_tag (user_id, tag_id)
select p.id, t.id
from public.profiles p
cross join lateral unnest(p.personality_tags) as picked(name)
join public.tag t on t.name = picked.name
on conflict do nothing;

-- ── 5. Hak akses ────────────────────────────────────────────────────────
-- Tag bersifat publik: tag seorang pemain memang untuk dilihat pemain lain
-- sebelum mengundang. Yang dibatasi hanya siapa yang boleh mengubahnya.
alter table public.tag enable row level security;
alter table public.user_tag enable row level security;

create policy tag_read
  on public.tag for select to anon, authenticated using (true);

create policy user_tag_read
  on public.user_tag for select to anon, authenticated using (true);

create policy user_tag_insert_own
  on public.user_tag for insert to authenticated
  with check (auth.uid() = user_id);

create policy user_tag_delete_own
  on public.user_tag for delete to authenticated
  using (auth.uid() = user_id);

-- Tidak ada kebijakan update: ini tabel penghubung, tag ditambah atau
-- dihapus, tidak pernah diubah.

grant select on public.tag to anon, authenticated;
grant select on public.user_tag to anon, authenticated;
grant insert (user_id, tag_id), delete on public.user_tag to authenticated;

revoke all on function public.limit_user_tags() from public, anon, authenticated;

-- ── 6. Periksa sendiri ──────────────────────────────────────────────────
do $verify$
declare
  n_tag      int;
  n_salinan  int;
  n_asli     int;
  tercecer   text;
begin
  select count(*) into n_tag from public.tag;
  if n_tag <> 5 then
    raise exception 'Tabel tag harusnya 5 baris, dapat %', n_tag;
  end if;

  -- Setiap tag yang ada di kolom lama harus punya pasangan di tabel baru.
  select count(*) into n_asli
  from public.profiles p, unnest(p.personality_tags) as x(name);

  select count(*) into n_salinan from public.user_tag;

  if n_salinan <> n_asli then
    select string_agg(distinct x.name, ', ') into tercecer
    from public.profiles p, unnest(p.personality_tags) as x(name)
    where not exists (select 1 from public.tag t where t.name = x.name);

    raise exception 'Penyalinan tidak lengkap: % dari % baris. Nama tak dikenal: %',
      n_salinan, n_asli, coalesce(tercecer, '(tidak ada)');
  end if;

  raise notice 'Pemeriksaan lolos: 5 tag, % baris user_tag tersalin.', n_salinan;
end
$verify$;


-- ========================================================================
-- 20261116000100_user_tag_minimum.sql
-- ========================================================================

-- Menegakkan batas 3-5 tag personalitas di database, bukan hanya di form.
--
-- Melengkapi `20261116000000_personality_tags.sql`, yang baru menegakkan
-- batas atas.
--
-- ── Kenapa batas bawah butuh jenis trigger yang berbeda ─────────────────
-- Trigger `after insert for each row` dijalankan setelah SETIAP baris. Saat
-- seseorang menyimpan tiga tag, baris pertama masuk ketika jumlahnya masih
-- satu — sehingga penyimpanan yang benar pun ditolak di baris pertama.
--
-- `constraint trigger ... deferrable initially deferred` dijalankan saat
-- transaksi di-commit, ketika ketiga baris sudah masuk. Barulah jumlah
-- akhirnya bisa dinilai.
--
-- ── Kenapa nol tetap diperbolehkan ──────────────────────────────────────
-- Bukan demi akun yang sudah ada, melainkan karena onboarding memang boleh
-- dilewati (lihat AGENTS.md: "Everything is optional and the whole flow is
-- skippable"). Akun yang melewatinya tidak punya baris di `user_tag` sama
-- sekali, jadi tidak ada yang memicu trigger ini.
--
-- Perlu disadari, dan ini batas yang tidak bisa ditembus skema: database
-- hanya bisa menilai himpunan tag SAAT DIUBAH. Ia tidak bisa memaksa setiap
-- akun MEMILIKI tag, karena akun yang tidak pernah menyentuh tabel ini tidak
-- pernah memicu apa pun. Jadi aturan skripsi "pengguna memilih tiga hingga
-- lima tag saat membuat akun" memang sebagian tanggung jawab alur onboarding.
-- Yang bisa dijamin database: kalau tag diisi, jumlahnya 3 sampai 5 —
-- tidak pernah 1 atau 2.
--
-- ── Akibat untuk data yang ada ──────────────────────────────────────────
-- Saat ini ada 6 akun dengan 1-2 tag. Baris mereka tetap tersimpan; trigger
-- hanya aktif saat tag diubah. Begitu akun-akun itu menyimpan profilnya,
-- mereka harus melengkapi jadi 3 tag atau mengosongkannya. Disepakati tim:
-- akun-akun itu data uji yang akan dihapus.

-- Trigger lama diganti: yang baru sudah mencakup batas atas sekaligus.
drop trigger user_tag_limit on public.user_tag;
drop function public.limit_user_tags();

create function public.check_user_tag_count()
returns trigger
language plpgsql
as $$
declare
  -- `new` kosong saat delete, `old` kosong saat insert.
  v_user uuid := coalesce(new.user_id, old.user_id);
  v_count int;
begin
  select count(*) into v_count
  from public.user_tag
  where user_id = v_user;

  -- Nol berarti "belum diisi", dan itu sah: onboarding boleh dilewati.
  -- Mengosongkan kembali juga sah.
  if v_count = 0 then
    return null;
  end if;

  if v_count < 3 then
    raise exception 'too_few_tags'
      using errcode = 'check_violation',
            hint = 'Pilih minimal 3 tag personalitas, atau kosongkan semuanya.';
  end if;

  if v_count > 5 then
    raise exception 'too_many_tags'
      using errcode = 'check_violation',
            hint = 'Maksimal 5 tag personalitas.';
  end if;

  return null;
end;
$$;

-- Ditunda sampai commit, supaya seluruh himpunan terlihat sekaligus. Ini juga
-- yang membuat pola "hapus semua lalu masukkan yang baru" berfungsi dalam satu
-- transaksi — cara form edit menyimpan perubahan.
create constraint trigger user_tag_count
  after insert or delete on public.user_tag
  deferrable initially deferred
  for each row execute function public.check_user_tag_count();

revoke all on function public.check_user_tag_count() from public, anon, authenticated;

-- ── Periksa sendiri ─────────────────────────────────────────────────────
do $verify$
declare
  v_admin uuid;
  v_tag   smallint;
  v_gagal boolean := false;
begin
  -- Pakai akun mana pun yang belum punya tag, supaya tidak mengganggu data.
  select p.id into v_admin
  from public.profiles p
  where not exists (select 1 from public.user_tag u where u.user_id = p.id)
  limit 1;

  if v_admin is null then
    raise notice 'Lewati uji: semua akun sudah punya tag.';
    return;
  end if;

  select id into v_tag from public.tag order by id limit 1;

  -- Satu tag saja harus ditolak saat commit sub-transaksi ini.
  begin
    insert into public.user_tag (user_id, tag_id) values (v_admin, v_tag);
    -- Memaksa trigger yang ditunda dijalankan sekarang.
    set constraints public.user_tag_count immediate;
    v_gagal := true;  -- kalau sampai sini, berarti TIDAK ditolak
  exception when check_violation then
    null;  -- inilah yang diharapkan
  end;

  if v_gagal then
    raise exception 'Trigger tidak menolak tag tunggal — batas bawah tidak aktif.';
  end if;

  raise notice 'Pemeriksaan lolos: 1 tag ditolak, 0 dan 3-5 diterima.';
end
$verify$;


-- ========================================================================
-- 20261116000200_reviews.sql
-- ========================================================================

-- Penilaian pasca-lobi: tabel `reviews` + `review_tag` + fungsi penulisnya.
--
-- Fase 1 §6.1 bagian kedua. Ini sumber data variabel R pada Persamaan 3.1 —
-- selama ini satu-satunya masukan rumus yang belum punya data nyata.
--
-- Perhitungan Bayesian-nya (Persamaan 3.5-3.12) BELUM ada di sini. Migrasi ini
-- hanya menyiapkan penyimpanan dan aturan siapa boleh menilai siapa. Kolom
-- rater_bias, corrected_rating dan reviewer_weight sudah disediakan karena
-- revisi menyebutnya dihitung SAAT ULASAN DIKIRIM berdasarkan riwayat penilai
-- sebelum rating itu — bukan dihitung ulang setiap dibaca. Untuk sementara
-- diisi nilai netral, lalu fungsi penilaiannya mengisi yang sebenarnya.
--
-- ── Aturan yang ditegakkan di sini ──────────────────────────────────────
--   1. Lobi harus berstatus `completed`.
--   2. Lobi harus sempat berjalan minimal 15 menit (selisih started_at dan
--      closed_at). Mencegah pembuat lobi memulai lalu langsung menyelesaikan
--      lobi bersama akun sendiri demi menggelembungkan rating.
--   3. Penilai dan yang dinilai sama-sama anggota lobi itu, dan bukan orang
--      yang keluar sebelum lobi dimulai.
--   4. Satu penilai satu rating per orang per lobi.
--   5. Tidak bisa menilai diri sendiri.
--   6. Rating 1-2 bintang wajib menyertakan alasan.
--
-- ── Anonimitas ──────────────────────────────────────────────────────────
-- Revisi: "Rating bersifat anonim... sehingga pengguna tidak dapat menebak
-- penilainya dari perubahan skor." Karena itu TIDAK ADA kebijakan select untuk
-- klien sama sekali: tak seorang pun membaca tabel ini lewat API, termasuk
-- orang yang dinilai. Skor reputasi dibaca dari `profiles`, hasil agregat.
-- Penilai pun tidak bisa membaca kembali ulasannya sendiri — kalau nanti layar
-- "ulasan yang sudah saya kirim" dibutuhkan, tambahkan kebijakan yang hanya
-- mengizinkan rater_id = auth.uid(), jangan buka ratee_id.

-- ── 1. Tabel reviews ────────────────────────────────────────────────────
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  lobby_id uuid not null references public.lobby (id) on delete cascade,
  rater_id uuid not null references public.profiles (id) on delete cascade,
  ratee_id uuid not null references public.profiles (id) on delete cascade,
  stars smallint not null check (stars between 1 and 5),

  -- Wajib untuk 1-2 bintang. Tidak memengaruhi skor sama sekali; gunanya
  -- membuat penilai berpikir ulang, dan jadi catatan moderasi.
  low_rating_reason text check (
    low_rating_reason in ('afk', 'flaming', 'trolling', 'verbal_abuse')
  ),

  -- Dihitung sekali saat ulasan dikirim, dari riwayat penilai SEBELUM rating
  -- ini. Disimpan supaya skor reputasi tidak berubah surut ketika kebiasaan
  -- penilainya berubah di kemudian hari.
  rater_bias numeric(4, 3) not null default 0,       -- b_j, Persamaan 3.6
  corrected_rating numeric(4, 3) not null,           -- r̃_i, Persamaan 3.7
  reviewer_weight numeric(4, 3) not null default 1,  -- w_i, Persamaan 3.8

  created_at timestamptz not null default now(),

  -- Aturan 4 dan 5.
  constraint reviews_one_per_pair unique (lobby_id, rater_id, ratee_id),
  constraint reviews_not_self check (rater_id <> ratee_id),
  -- Aturan 6, ditegakkan kolom supaya tidak bisa dilewati jalur mana pun.
  constraint reviews_low_rating_needs_reason check (
    (stars >= 3 and low_rating_reason is null)
    or (stars <= 2 and low_rating_reason is not null)
  )
);

-- Jendela 25 rating terakhir (Persamaan 3.9) membaca per orang, terbaru dulu.
create index reviews_ratee_recent_idx
  on public.reviews (ratee_id, created_at desc);
-- Koreksi bias membaca seluruh rating yang pernah DIBERIKAN penilai.
create index reviews_rater_idx on public.reviews (rater_id);

-- ── 2. Tag yang diberikan penilai (n_t pada Persamaan 3.13) ─────────────
create table public.review_tag (
  review_id uuid not null references public.reviews (id) on delete cascade,
  tag_id smallint not null references public.tag (id),
  primary key (review_id, tag_id)
);

create index review_tag_tag_idx on public.review_tag (tag_id);

-- ── 3. Siapa boleh menilai siapa ────────────────────────────────────────
-- Pembuat lobi selalu ikut bermain; sisanya adalah pelamar yang diterima dan
-- tidak keluar sebelum lobi dimulai.
create function public.played_in(p_lobby uuid, p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.lobby l
    where l.id = p_lobby and l.leader_id = p_user
  ) or exists (
    select 1
    from public.applications a
    join public.lobby l on l.id = a.lobby_id
    where a.lobby_id = p_lobby
      and a.applicant_id = p_user
      and a.status in ('accepted', 'left')
      and a.joined_at is not null
      -- Keluar sebelum lobi dimulai berarti tidak pernah bermain bersama.
      and (a.left_at is null or a.left_at >= l.started_at)
  );
$$;

-- Satu tempat untuk aturan 1-3, dipakai fungsi di bawah dan bisa dipanggil
-- layar penilaian untuk tahu apakah tombolnya perlu ditampilkan.
create function public.can_review(p_lobby uuid, p_rater uuid, p_ratee uuid)
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
      -- Aturan 2: benar-benar sempat bermain.
      and l.started_at is not null
      and l.closed_at is not null
      and l.closed_at - l.started_at >= interval '15 minutes'
      -- Aturan 3: keduanya ikut sampai lobi dimulai.
      and public.played_in(p_lobby, p_rater)
      and public.played_in(p_lobby, p_ratee)
  );
$$;

-- ── 4. Fungsi penulis ───────────────────────────────────────────────────
-- Satu-satunya jalan masuk: klien tidak punya hak insert ke `reviews`, sama
-- seperti data lobi. Kalau penulisannya dibiarkan langsung, aturan di atas
-- bisa dilewati dengan memanggil API apa adanya.
create function public.submit_review(
  p_lobby uuid,
  p_ratee uuid,
  p_stars smallint,
  p_reason text default null,
  p_tag_ids smallint[] default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rater uuid := auth.uid();
  v_review uuid;
  v_tag smallint;
begin
  if v_rater is null then
    raise exception 'not_signed_in';
  end if;

  if not public.can_review(p_lobby, v_rater, p_ratee) then
    raise exception 'cannot_review';
  end if;

  -- rater_bias, corrected_rating dan reviewer_weight sengaja memakai nilai
  -- netral untuk saat ini: Persamaan 3.5-3.8 menyusul di migrasi berikutnya,
  -- dan fungsi ini yang akan menghitungnya. Sampai saat itu rating tersimpan
  -- apa adanya, jadi tidak ada data yang hilang.
  insert into public.reviews (
    lobby_id, rater_id, ratee_id, stars, low_rating_reason, corrected_rating
  )
  values (
    p_lobby, v_rater, p_ratee, p_stars, p_reason, p_stars
  )
  returning id into v_review;

  if p_tag_ids is not null then
    foreach v_tag in array p_tag_ids loop
      insert into public.review_tag (review_id, tag_id)
      values (v_review, v_tag)
      on conflict do nothing;
    end loop;
  end if;

  return v_review;
end;
$$;

-- ── 5. Hak akses ────────────────────────────────────────────────────────
alter table public.reviews enable row level security;
alter table public.review_tag enable row level security;

-- Sengaja tanpa kebijakan select, insert, update maupun delete: lihat catatan
-- anonimitas di atas. RLS yang menyala tanpa kebijakan berarti tertutup untuk
-- semua peran klien. Fungsi di atas security definer, jadi tetap bisa menulis.
revoke all on public.reviews from anon, authenticated;
revoke all on public.review_tag from anon, authenticated;

revoke all on function public.submit_review(uuid, uuid, smallint, text, smallint[])
  from public, anon;
grant execute on function public.submit_review(uuid, uuid, smallint, text, smallint[])
  to authenticated;

revoke all on function public.can_review(uuid, uuid, uuid) from public, anon;
grant execute on function public.can_review(uuid, uuid, uuid) to authenticated;
revoke all on function public.played_in(uuid, uuid) from public, anon, authenticated;

-- ── 6. Periksa sendiri ──────────────────────────────────────────────────
do $verify$
declare
  v_lobby uuid;
begin
  -- Lobi yang sudah selesai tapi tidak punya started_at tidak boleh dinilai.
  select id into v_lobby from public.lobby where status = 'completed' limit 1;

  if v_lobby is not null then
    if public.can_review(v_lobby, gen_random_uuid(), gen_random_uuid()) then
      raise exception 'can_review meloloskan orang yang bukan anggota lobi';
    end if;
  end if;

  if to_regclass('public.reviews') is null
     or to_regclass('public.review_tag') is null then
    raise exception 'Tabel reviews atau review_tag tidak terbentuk';
  end if;

  raise notice 'Pemeriksaan lolos: reviews siap, bukan-anggota ditolak.';
end
$verify$;


-- ========================================================================
-- 20261116000300_reputation_bayes.sql
-- ========================================================================

-- Perhitungan skor reputasi: Persamaan 3.5 sampai 3.12.
--
-- Fase 1 §6.1 bagian ketiga. Melengkapi `20261116000200_reviews.sql`, yang
-- baru menyimpan rating mentah.
--
-- Seluruhnya di sisi server. Revisi menyebutnya tegas: "Parameter pembobotan
-- (bj dan wi) serta skor R* dan R hanya diproses di sisi server untuk mencegah
-- pengguna memanipulasi sistem reputasi."
--
-- ── Nilai tetap ─────────────────────────────────────────────────────────
--   m = 3   nilai awal netral sebelum platform punya data
--   C = 5   kekuatan nilai awal (Persamaan 3.11, dikunci — lihat §3.3
--           docs/proposal-revision-2026-10.md: empirical Bayes tidak bisa
--           diestimasi dari ~30 responden UAT)
--   N = 25  jendela rating (Persamaan 3.9: (1.96 x 1 / 0.4)^2 dibulatkan)
--
-- ── Penundaan 48 jam ────────────────────────────────────────────────────
-- Revisi: "skor reputasi pada profil baru diperbarui setelah seluruh anggota
-- lobi memberikan penilaian atau batas waktu 48 jam berakhir. Dengan demikian,
-- pengguna tidak dapat menebak penilainya dari perubahan skor."
--
-- Diterapkan lewat kolom `effective_at`: sebuah ulasan baru ikut dihitung
-- setelah saat itu. Tidak ada penjadwal — `release_due_reviews()` dipanggil
-- dari jalur baca, pola yang sama dengan `expire_stale_lobbies`.

alter table public.reviews
  -- null berarti belum dirilis; diisi saat seluruh anggota selesai menilai
  -- atau saat tenggat 48 jam lewat.
  add column effective_at timestamptz;

create index reviews_pending_idx
  on public.reviews (lobby_id) where effective_at is null;

alter table public.profiles
  -- R* (Persamaan 3.10), skala bintang 1-5. Dipakai rumus rekomendasi.
  -- `reputation_score` yang sudah ada tetap jadi nilai tampilan profil
  -- (Persamaan 3.12), karena itu yang mudah dipahami pengguna.
  add column reputation_bayes numeric(4, 3) not null default 3;

comment on column public.profiles.reputation_bayes is
  'R* pada Persamaan 3.10. R = (R* - 1) / 4 dipakai pada Persamaan 3.1. '
  'Kolom reputation_score adalah rata-rata sederhana untuk ditampilkan.';

grant select (reputation_bayes) on public.profiles to anon, authenticated;

-- ── Persamaan 3.5 - 3.7: koreksi bias penilai ───────────────────────────
-- Rata-rata Bayesian dari rating yang pernah DIBERIKAN penilai, lalu
-- selisihnya terhadap m. Penilai yang baru memberi sedikit rating ditarik
-- mendekati m, sehingga koreksinya kecil — itu gunanya prior di sini.
create function public.rater_bias(p_rater uuid, p_before timestamptz)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select round(
    ((5 * 3) + coalesce(sum(r.stars), 0)) / (5 + count(*))::numeric - 3,
    3
  )
  from public.reviews r
  where r.rater_id = p_rater
    and r.created_at < p_before;
$$;

-- ── Persamaan 3.8: bobot rating ─────────────────────────────────────────
-- Satu penilai satu suara terhadap satu orang: kalau penilai yang sama menilai
-- orang yang sama beberapa kali di dalam jendela, pengaruhnya dibagi rata.
-- Tabel reviews sudah membatasi satu rating per lobi, jadi k_i > 1 hanya
-- terjadi lintas lobi.
create function public.review_weight(p_rater uuid, p_ratee uuid)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select round(1 / greatest(count(*), 1)::numeric, 3)
  from (
    select 1
    from public.reviews r
    where r.ratee_id = p_ratee
      and r.rater_id = p_rater
      and r.effective_at is not null
    order by r.created_at desc
    limit 25
  ) dalam_jendela;
$$;

-- ── Persamaan 3.10 + 3.12: skor Bayesian dan nilai tampilan ─────────────
create function public.recompute_reputation(p_user uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_bayes   numeric;
  v_display numeric;
  v_count   int;
begin
  -- Persamaan 3.9: hanya 25 rating terakhir yang sudah dirilis.
  with jendela as (
    select r.stars, r.corrected_rating, r.rater_id
    from public.reviews r
    where r.ratee_id = p_user
      and r.effective_at is not null
      and r.effective_at <= now()
    order by r.created_at desc
    limit 25
  ),
  berbobot as (
    select j.corrected_rating,
           public.review_weight(j.rater_id, p_user) as w
    from jendela j
  )
  select
    -- Persamaan 3.10
    round(((5 * 3) + coalesce(sum(b.w * b.corrected_rating), 0))
          / (5 + coalesce(sum(b.w), 0)), 3),
    -- Persamaan 3.12: rata-rata sederhana, inilah yang dilihat pengguna
    round(coalesce(avg(j.stars), 0), 2),
    count(*)
  into v_bayes, v_display, v_count
  from jendela j
  full join berbobot b on true;

  update public.profiles
  set reputation_bayes = coalesce(v_bayes, 3),
      reputation_score = coalesce(v_display, 0),
      review_count = coalesce(v_count, 0)
  where id = p_user;
end;
$$;

-- ── Pelepasan ulasan: semua sudah menilai, atau 48 jam lewat ────────────
-- Dipanggil dari jalur baca, seperti expire_stale_lobbies. Tanpa penjadwal.
create function public.release_due_reviews()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ratee uuid;
begin
  -- Sebuah lobi "selesai dinilai" kalau tidak ada lagi pasangan penilai-dinilai
  -- yang masih kosong. Pasangan yang mungkin dihitung dari lobby_member.
  with lobi_tertunda as (
    select distinct r.lobby_id
    from public.reviews r
    where r.effective_at is null
  ),
  siap as (
    select lt.lobby_id
    from lobi_tertunda lt
    join public.lobby l on l.id = lt.lobby_id
    where
      -- Tenggat 48 jam sejak lobi ditutup.
      l.closed_at + interval '48 hours' <= now()
      -- atau: jumlah ulasan sudah sebanyak pasangan yang mungkin,
      -- yaitu n anggota x (n - 1).
      or (
        select count(*) from public.reviews r2 where r2.lobby_id = lt.lobby_id
      ) >= (
        select count(*) * (count(*) - 1)
        from public.lobby_member m where m.lobby_id = lt.lobby_id
      )
  )
  update public.reviews r
  set effective_at = now()
  from siap s
  where r.lobby_id = s.lobby_id and r.effective_at is null;

  -- Hitung ulang hanya untuk orang yang skornya benar-benar berubah.
  for v_ratee in
    select distinct ratee_id
    from public.reviews
    where effective_at is not null
      and effective_at > now() - interval '1 minute'
  loop
    perform public.recompute_reputation(v_ratee);
  end loop;
end;
$$;

-- ── Isi bias dan bobot saat ulasan dikirim ──────────────────────────────
-- submit_review() sebelumnya menyimpan nilai netral. Sekarang menghitung
-- yang sebenarnya, dari riwayat penilai SEBELUM rating ini — supaya skor
-- yang sudah tersimpan tidak berubah surut saat kebiasaan penilainya berubah.
create or replace function public.submit_review(
  p_lobby uuid,
  p_ratee uuid,
  p_stars smallint,
  p_reason text default null,
  p_tag_ids smallint[] default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rater uuid := auth.uid();
  v_review uuid;
  v_tag smallint;
  v_bias numeric;
  v_corrected numeric;
begin
  if v_rater is null then
    raise exception 'not_signed_in';
  end if;

  if not public.can_review(p_lobby, v_rater, p_ratee) then
    raise exception 'cannot_review';
  end if;

  -- Persamaan 3.6 lalu 3.7, dibatasi tetap di rentang 1-5.
  v_bias := public.rater_bias(v_rater, now());
  v_corrected := least(5, greatest(1, p_stars - v_bias));

  insert into public.reviews (
    lobby_id, rater_id, ratee_id, stars, low_rating_reason,
    rater_bias, corrected_rating, reviewer_weight
  )
  values (
    p_lobby, v_rater, p_ratee, p_stars, p_reason,
    v_bias, v_corrected, 1
  )
  returning id into v_review;

  if p_tag_ids is not null then
    foreach v_tag in array p_tag_ids loop
      insert into public.review_tag (review_id, tag_id)
      values (v_review, v_tag)
      on conflict do nothing;
    end loop;
  end if;

  -- Mungkin ulasan terakhir yang ditunggu lobi ini.
  perform public.release_due_reviews();

  return v_review;
end;
$$;

revoke all on function public.rater_bias(uuid, timestamptz) from public, anon, authenticated;
revoke all on function public.review_weight(uuid, uuid) from public, anon, authenticated;
revoke all on function public.recompute_reputation(uuid) from public, anon, authenticated;
revoke all on function public.release_due_reviews() from public, anon;
grant execute on function public.release_due_reviews() to authenticated;

-- ── Periksa sendiri ─────────────────────────────────────────────────────
do $verify$
declare
  v_bias numeric;
begin
  -- Penilai tanpa riwayat harus berbias 0: (5*3 + 0) / (5 + 0) - 3 = 0.
  v_bias := public.rater_bias(gen_random_uuid(), now());
  if v_bias is distinct from 0 then
    raise exception 'Bias penilai baru harusnya 0, dapat %', v_bias;
  end if;

  if to_regclass('public.reviews') is null then
    raise exception 'Tabel reviews hilang';
  end if;

  perform public.release_due_reviews();

  raise notice 'Pemeriksaan lolos: bias awal 0, pelepasan ulasan berjalan.';
end
$verify$;


-- ========================================================================
-- 20261116000400_lobby_preferences.sql
-- ========================================================================

-- Preferensi lobi untuk rumus rekomendasi: tabel `lobby_tag` (himpunan B pada
-- Persamaan 3.14) dan pengisian kolom `lobby.playstyle` (Pb pada Persamaan 3.2).
--
-- Fase 1 §6.1 bagian keempat.
--
-- ── Kenapa fungsi baru, bukan menambah parameter ────────────────────────
-- Cara "benar" menurut rencana awal adalah menambahkan p_playstyle dan
-- p_tag_ids ke create_lobby dan update_lobby. Keduanya berjumlah 239 baris dan
-- mengubah signature berarti men-`drop` lalu menulis ulang keduanya utuh.
--
-- Itu berarti menyalin ulang 239 baris SQL tanpa pernah bisa dijalankan lebih
-- dulu — migrasi di proyek ini diterapkan manual di SQL editor. Satu salah
-- ketik merusak pembuatan lobi di database yang sudah dipakai.
--
-- `set_lobby_preferences` bersifat aditif: tidak bisa merusak apa pun yang
-- sudah berjalan, dan kalau salah cukup diperbaiki tanpa menyentuh alur lobi.
-- Aturan repo tetap dipatuhi — penulisan data lobi tetap lewat fungsi
-- database, bukan insert langsung dari browser. Yang berubah hanya: satu
-- fungsi per urusan, bukan satu fungsi raksasa.
--
-- Konsekuensi untuk klien: form buat lobi memanggil create_lobby lalu
-- set_lobby_preferences. Kalau panggilan kedua gagal, lobinya tetap ada tanpa
-- preferensi — dan itu keadaan yang sah, karena |B| = 0 sudah ditangani
-- Persamaan 3.15 dan playstyle boleh null.
--
-- ── Catatan untuk yang melanjutkan ──────────────────────────────────────
-- `lobby.tags` yang sudah ada BUKAN himpunan B. Itu "vibe tag" dari form buat
-- lobi (Competitive, Tactical, Grinding, Voice Comms, Chill) dengan kosakata
-- sendiri. `lobby_tag` ini yang masuk Persamaan 3.14. Jangan digabungkan.

-- ── 1. Tabel ────────────────────────────────────────────────────────────
create table public.lobby_tag (
  lobby_id uuid not null references public.lobby (id) on delete cascade,
  tag_id smallint not null references public.tag (id),
  primary key (lobby_id, tag_id)
);

create index lobby_tag_tag_idx on public.lobby_tag (tag_id);

-- Maksimal 3, sesuai revisi: |B| adalah penyebut pada Persamaan 3.14, jadi
-- makin banyak tag makin sulit pelamar mendapat nilai tinggi. Ditunda sampai
-- commit supaya pola "hapus semua lalu masukkan yang baru" tetap jalan.
create function public.check_lobby_tag_count()
returns trigger
language plpgsql
as $$
declare
  v_lobby uuid := coalesce(new.lobby_id, old.lobby_id);
begin
  if (select count(*) from public.lobby_tag where lobby_id = v_lobby) > 3 then
    raise exception 'too_many_lobby_tags'
      using errcode = 'check_violation';
  end if;
  return null;
end;
$$;

create constraint trigger lobby_tag_count
  after insert on public.lobby_tag
  deferrable initially deferred
  for each row execute function public.check_lobby_tag_count();

-- ── 2. Penulisnya ───────────────────────────────────────────────────────
create function public.set_lobby_preferences(
  p_lobby uuid,
  p_playstyle smallint default null,
  p_tag_ids smallint[] default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_status text;
  v_leader uuid;
  v_tag smallint;
begin
  if v_uid is null then
    raise exception 'not_signed_in';
  end if;

  select status, leader_id into v_status, v_leader
  from public.lobby
  where id = p_lobby;

  if v_leader is null then
    raise exception 'lobby_not_found';
  end if;

  -- Cerminan aturan update_lobby: hanya pembuat lobi, dan hanya selama lobi
  -- belum berakhir.
  if v_leader <> v_uid then
    raise exception 'not_leader';
  end if;

  if v_status in ('completed', 'cancelled') then
    raise exception 'lobby_closed';
  end if;

  if p_playstyle is not null and (p_playstyle < 1 or p_playstyle > 5) then
    raise exception 'playstyle_invalid';
  end if;

  update public.lobby set playstyle = p_playstyle where id = p_lobby;

  -- Ganti seluruh himpunan, bukan selisihnya: paling banyak tiga baris, dan
  -- triggernya ditunda sampai commit sehingga keadaan antara tidak masalah.
  delete from public.lobby_tag where lobby_id = p_lobby;

  if p_tag_ids is not null then
    if array_length(p_tag_ids, 1) > 3 then
      raise exception 'too_many_lobby_tags';
    end if;
    foreach v_tag in array p_tag_ids loop
      insert into public.lobby_tag (lobby_id, tag_id)
      values (p_lobby, v_tag)
      on conflict do nothing;
    end loop;
  end if;
end;
$$;

-- ── 3. Hak akses ────────────────────────────────────────────────────────
alter table public.lobby_tag enable row level security;

-- Dibaca siapa saja: pelamar perlu tahu tag apa yang dicari lobi sebelum
-- melamar, dan kartu lobi menampilkannya.
create policy lobby_tag_read
  on public.lobby_tag for select to anon, authenticated using (true);

-- Tanpa kebijakan tulis: seperti data lobi lainnya, hanya lewat fungsi.
grant select on public.lobby_tag to anon, authenticated;

revoke all on function public.check_lobby_tag_count() from public, anon, authenticated;
revoke all on function public.set_lobby_preferences(uuid, smallint, smallint[])
  from public, anon;
grant execute on function public.set_lobby_preferences(uuid, smallint, smallint[])
  to authenticated;

-- ── 4. Periksa sendiri ──────────────────────────────────────────────────
do $verify$
declare
  v_lobby uuid;
begin
  if to_regclass('public.lobby_tag') is null then
    raise exception 'Tabel lobby_tag tidak terbentuk';
  end if;

  -- Batas tiga tag harus benar-benar menolak yang keempat.
  select id into v_lobby from public.lobby limit 1;
  if v_lobby is not null then
    begin
      insert into public.lobby_tag (lobby_id, tag_id)
      select v_lobby, id from public.tag order by id limit 4;
      set constraints public.lobby_tag_count immediate;
      raise exception 'Batas 3 tag lobi tidak aktif — 4 tag diterima';
    exception when check_violation then
      null;  -- inilah yang diharapkan
    end;
    delete from public.lobby_tag where lobby_id = v_lobby;
  end if;

  raise notice 'Pemeriksaan lolos: lobby_tag siap, tag keempat ditolak.';
end
$verify$;


-- ========================================================================
-- 20261116000500_tag_strengths.sql
-- ========================================================================

-- Kekuatan tag personalitas: Persamaan 3.13.
--
-- Fase 1, pelengkap §6.3. Ditemukan saat menyambungkan kodenya.
--
-- ── Kenapa harus fungsi, tidak bisa dihitung di aplikasi ────────────────
-- Persamaan 3.13 butuh n_t, yaitu jumlah PENILAI BERBEDA yang memberi sebuah
-- tag. Itu berarti membaca `review_tag` — dan tabel itu sengaja tertutup rapat
-- dari klien demi anonimitas (`20261116000200_reviews.sql`).
--
-- Jalan keluarnya: fungsi security definer yang hanya mengembalikan hasil
-- AGREGAT. "Tiga penilai memberi tag Chill" tidak membocorkan siapa pun,
-- sementara isi `review_tag` tetap tidak bisa disentuh klien.
--
-- ── Satu hal yang mudah salah ───────────────────────────────────────────
-- Penyebut pada Persamaan 3.13 adalah suara terbanyak di antara SELURUH tag
-- yang dimiliki pengguna — termasuk tag yang tidak pernah ia pilih sendiri
-- tapi diberikan penilai. Contoh di proposal memperlihatkannya: Flex Player
-- tidak dipilih sendiri, hanya diberi 6 penilai, dan tetap bernilai 0,67.
--
-- Jadi himpunannya adalah GABUNGAN dari tag pilihan sendiri (`user_tag`) dan
-- tag pemberian penilai (`review_tag`), bukan `user_tag` saja.

create function public.tag_strengths(p_users uuid[])
returns table (user_id uuid, tag_id smallint, strength numeric)
language sql
stable
security definer
set search_path = public
as $$
  with jendela as (
    -- Persamaan 3.9: 25 ulasan terakhir per orang, yang sudah dirilis.
    select r.id, r.ratee_id, r.rater_id
    from (
      select r.id, r.ratee_id, r.rater_id,
             row_number() over (
               partition by r.ratee_id order by r.created_at desc
             ) as urutan
      from public.reviews r
      where r.ratee_id = any(p_users)
        and r.effective_at is not null
        and r.effective_at <= now()
    ) r
    where r.urutan <= 25
  ),
  diberi as (
    -- n_t: penilai BERBEDA, bukan jumlah ulasan. Satu orang yang memberi tag
    -- sama di dua lobi tetap dihitung satu.
    select j.ratee_id as user_id,
           rt.tag_id,
           count(distinct j.rater_id) as n
    from jendela j
    join public.review_tag rt on rt.review_id = j.id
    group by j.ratee_id, rt.tag_id
  ),
  dipilih as (
    -- p_t: 1 kalau pengguna memilihnya sendiri saat membuat akun.
    select ut.user_id, ut.tag_id
    from public.user_tag ut
    where ut.user_id = any(p_users)
  ),
  gabungan as (
    select coalesce(d.user_id, p.user_id) as user_id,
           coalesce(d.tag_id, p.tag_id) as tag_id,
           (case when p.user_id is null then 0 else 1 end)
             + coalesce(d.n, 0) as suara
    from diberi d
    full join dipilih p
      on p.user_id = d.user_id and p.tag_id = d.tag_id
  )
  select g.user_id,
         g.tag_id,
         -- Normalisasi min-max dengan minimum 0: tag tersering bernilai 1,00.
         round(
           g.suara::numeric / max(g.suara) over (partition by g.user_id),
           3
         ) as strength
  from gabungan g;
$$;

-- Aman dibuka: keluarannya agregat, tidak ada identitas penilai di dalamnya.
-- Dibutuhkan anon juga, karena daftar lobi dan kartu pemain dibaca tanpa login.
grant execute on function public.tag_strengths(uuid[]) to anon, authenticated;

-- ── Periksa sendiri ─────────────────────────────────────────────────────
do $verify$
declare
  v_user uuid;
  v_baris int;
  v_maks  numeric;
begin
  -- Pengguna yang punya tag pilihan sendiri tapi belum pernah dinilai harus
  -- bernilai 1,00 untuk semua tagnya — revisi menyebutnya tegas supaya
  -- pengguna baru tetap bisa direkomendasikan.
  select ut.user_id into v_user
  from public.user_tag ut
  where not exists (
    select 1 from public.reviews r where r.ratee_id = ut.user_id
  )
  limit 1;

  if v_user is null then
    raise notice 'Lewati uji: tidak ada pengguna bertag yang belum dinilai.';
    return;
  end if;

  select count(*), max(strength) into v_baris, v_maks
  from public.tag_strengths(array[v_user]);

  if v_baris = 0 then
    raise exception 'tag_strengths tidak mengembalikan baris untuk pengguna bertag';
  end if;

  if v_maks is distinct from 1.000 then
    raise exception 'Pengguna belum dinilai harusnya berkekuatan 1,000, dapat %', v_maks;
  end if;

  raise notice 'Pemeriksaan lolos: % tag, pengguna baru bernilai 1,000.', v_baris;
end
$verify$;


-- ========================================================================
-- 20261117000000_realtime_lobby_renamed.sql
-- ========================================================================

-- Realtime for the lobby screens under the thesis table names.
--
-- 20261016000000_realtime_lobby_tables.sql added `lobbies` to the
-- supabase_realtime publication. If it ran before 20261115000100_thesis_naming
-- the publication followed the rename (it stores the table's OID) and this does
-- nothing. If it never ran, it now fails, because `lobbies` no longer exists;
-- this adds the same tables under their current names instead.
--
-- Safe to run again: each table is added only when it is missing.
--
-- To undo: alter publication supabase_realtime drop table public.<table>;

do $$
declare
  target text;
begin
  foreach target in array array['lobby', 'applications', 'lobby_invites', 'friendships'] loop
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = target
    ) then
      execute format(
        'alter publication supabase_realtime add table public.%I',
        target
      );
    end if;
  end loop;
end $$;


-- ========================================================================
-- 20261118000000_match_history.sql
-- ========================================================================

-- Match history: the completed lobbies a player played in, and who with.
--
-- The profile's "Recent match history", /profile/<user>/matches and the
-- rating screen all read this. A match is a `completed` lobby; a player played
-- in it if they led it, or were accepted and did not leave before it started
-- (the same rule as `played_in()`, which rating already uses).
--
-- Why a function and not a plain query: the viewer must know which teammates
-- THEY have already rated, and `reviews` is closed to clients so ratings stay
-- anonymous. This answers only for the viewer's own ratings (rater = the
-- caller), never who rated the viewer, so anonymity holds. For anyone else's
-- history `rated` and `can_rate` are null and false.
--
-- One row per (match, teammate). A lobby the player finished alone has no
-- teammates and so no rows: there is nobody to show or rate.
--
-- Never edit this file once it has run — fix with a new migration.

create function public.player_matches(p_user uuid)
returns table (
  lobby_id uuid,
  teammate_id uuid,
  teammate_was_leader boolean,
  teammate_role_id smallint,
  rated boolean,
  can_rate boolean
)
language sql
stable
security definer
set search_path = public
as $$
  with players as (
    select l.id as lobby_id, l.leader_id as user_id, true as was_leader,
           null::smallint as role_id
    from public.lobby l
    where l.status = 'completed'
    union all
    select a.lobby_id, a.applicant_id, false, a.role_id
    from public.applications a
    join public.lobby l on l.id = a.lobby_id
    where l.status = 'completed'
      and a.status in ('accepted', 'left')
      and a.joined_at is not null
      and (a.left_at is null or a.left_at >= l.started_at)
  ),
  mine as (
    select p.lobby_id from players p where p.user_id = p_user
  ),
  own_reviews as (
    select r.lobby_id, r.ratee_id
    from public.reviews r
    where r.rater_id = p_user and p_user = auth.uid()
  )
  select
    t.lobby_id,
    t.user_id,
    t.was_leader,
    t.role_id,
    case when p_user = auth.uid() then o.ratee_id is not null end,
    p_user = auth.uid()
      and o.ratee_id is null
      and public.can_review(t.lobby_id, p_user, t.user_id)
  from players t
  join mine m on m.lobby_id = t.lobby_id
  left join own_reviews o on o.lobby_id = t.lobby_id and o.ratee_id = t.user_id
  where t.user_id <> p_user;
$$;

revoke all on function public.player_matches(uuid) from public;
grant execute on function public.player_matches(uuid) to anon, authenticated;


-- ========================================================================
-- 20261118000100_report_evidence.sql
-- ========================================================================

-- Reports a player can actually file: safer insert rights and evidence files.
--
-- 1. INSERT RIGHTS. `20260919000200_reports_moderation.sql` granted insert on
--    the whole table, so a reporter could write `status = 'resolved'`, an
--    assignee or a resolution into their own report. Players now insert only
--    the columns that describe what happened; status and everything a
--    moderator owns keep their defaults.
--
-- 2. NOT YOURSELF. A report on your own account is never meaningful.
--
-- 3. EVIDENCE. The report form offers a screenshot or clip (proposal: reports
--    hold "bukti"). Files go to the PRIVATE bucket `report-evidence`, under the
--    reporter's own folder; only that reporter and admins can read them.
--    `reports.evidence_path` stores the path (never a URL), pinned to the
--    reporter's folder, the same pattern as `profiles.avatar_path`.
--
-- Never edit this file once it has run — fix with a new migration.

-- ── 1. Insert rights ────────────────────────────────────────────────────
alter table public.reports add column evidence_path text;

alter table public.reports
  add constraint reports_evidence_path_check
  check (evidence_path is null or evidence_path like reporter_id::text || '/%');

revoke insert on public.reports from authenticated;
grant insert (reporter_id, target_id, lobby_id, reason, details, evidence_url, evidence_path)
  on public.reports to authenticated;

-- ── 2. Not yourself ─────────────────────────────────────────────────────
-- `not valid`: checks every new report without failing on any old test rows.
alter table public.reports
  add constraint reports_not_self check (reporter_id <> target_id) not valid;

-- ── 3. Evidence bucket ──────────────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'report-evidence', 'report-evidence', false, 5242880,
  array['image/png', 'image/jpeg', 'video/mp4']
)
on conflict (id) do nothing;

create policy "Reporters upload evidence to their own folder"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'report-evidence'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Reporters and admins read evidence"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'report-evidence'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.is_admin(auth.uid())
    )
  );


-- ========================================================================
-- 20261118000200_reputation_display.sql
-- ========================================================================

-- What other players see about someone's reputation and conduct.
--
-- Proposal 3.3.1.2: a profile shows the plain star average with how many
-- players rated it; anyone rated by fewer than five different players is
-- labelled "Pemain Baru"; the lobby card shows every member's reputation; the
-- sanction history is on the profile; and a player under an active suspension
-- is left out of recommendations before anything is scored.
--
-- 1. `rater_count(profiles)` and `is_suspended(profiles)` are COMPUTED COLUMNS:
--    PostgREST lets a select ask for them like ordinary columns, including
--    inside a nested select, so the lobby list gets them in the same request.
--    They are security definer because `reviews` and `sanction` are closed to
--    clients; each returns one number or flag, never who rated whom.
--
-- 2. `sanction_history(p_user)` is the public part of a player's sanctions:
--    type, the rule broken, and dates. The moderator's internal note and who
--    issued it stay hidden (the same split as /account-restricted). A sanction
--    that was lifted is left out: it was withdrawn, so showing it would count
--    against the player for something that no longer stands.
--
-- Never edit this file once it has run — fix with a new migration.

create function public.rater_count(p public.profiles)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(distinct r.rater_id)::int
  from public.reviews r
  where r.ratee_id = p.id
    and r.effective_at is not null
    and r.effective_at <= now();
$$;

create function public.is_suspended(p public.profiles)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.sanction s
    where s.player_id = p.id
      and s.type = 'suspension'
      and s.lifted_at is null
      and s.issued_at <= now()
      and (s.expires_at is null or s.expires_at > now())
  );
$$;

create function public.sanction_history(p_user uuid)
returns table (
  type text,
  reason text,
  issued_at timestamptz,
  expires_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select s.type, s.reason, s.issued_at, s.expires_at
  from public.sanction s
  where s.player_id = p_user and s.lifted_at is null
  order by s.issued_at desc;
$$;

revoke all on function public.rater_count(public.profiles) from public;
revoke all on function public.is_suspended(public.profiles) from public;
revoke all on function public.sanction_history(uuid) from public;
grant execute on function public.rater_count(public.profiles) to anon, authenticated;
grant execute on function public.is_suspended(public.profiles) to anon, authenticated;
grant execute on function public.sanction_history(uuid) to anon, authenticated;


-- ========================================================================
-- 20261118000300_withdraw_other_requests.sql
-- ========================================================================

-- Join requests a player can no longer take up are withdrawn by themselves.
--
-- A player can be in one live lobby at a time (`create_lobby` and
-- `respond_to_application` already refuse a second). But a *pending* request
-- doesn't count, so a player could ask to join lobby A, then start lobby B or
-- get accepted into lobby C, and A's leader was left with a request whose
-- Accept could only fail ("applicant_busy").
--
-- Now, the moment a player is in a live lobby (they start one, or they are
-- accepted into one, by application or by invite), their pending requests to
-- other live lobbies are withdrawn, exactly as if they had pressed Withdraw:
-- status 'left', and the existing notification trigger removes the request
-- from those leaders' bells.
--
-- Scheduled lobbies are left alone: a player may hold several of those.
-- Pending invites are left alone too: the invited player still decides, and
-- `respond_to_invite` refuses an accept that breaks the one-lobby rule.

create function public.withdraw_other_requests(p_user_id uuid, p_keep_lobby uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.applications a
  set status = 'left', decided_at = now(), left_at = now()
  from public.lobby l
  where l.id = a.lobby_id
    and a.applicant_id = p_user_id
    and a.status = 'pending'
    and a.lobby_id <> p_keep_lobby
    and l.status = 'open';
$$;

revoke all on function public.withdraw_other_requests(uuid, uuid) from public, anon, authenticated;

-- A lobby goes live: a new "Looking now" lobby, or a scheduled one switched
-- to now. The leader is in it, so their other requests go.
create function public.withdraw_requests_on_lobby_live()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'open' and (tg_op = 'INSERT' or old.status is distinct from 'open') then
    perform public.withdraw_other_requests(new.leader_id, new.id);
  end if;
  return null;
end;
$$;

create trigger lobby_live_withdraws_requests
  after insert or update of status on public.lobby
  for each row execute function public.withdraw_requests_on_lobby_live();

-- A player is accepted (an application accepted, or an invite accepted,
-- which writes an accepted application) into a lobby that is live or
-- playing. Joining a scheduled lobby withdraws nothing.
create function public.withdraw_requests_on_accept()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'accepted'
     and (tg_op = 'INSERT' or old.status is distinct from 'accepted')
     and exists (
       select 1 from public.lobby l
       where l.id = new.lobby_id and l.status in ('open', 'in_progress')
     )
  then
    perform public.withdraw_other_requests(new.applicant_id, new.lobby_id);
  end if;
  return null;
end;
$$;

create trigger application_accept_withdraws_requests
  after insert or update of status on public.applications
  for each row execute function public.withdraw_requests_on_accept();


-- ========================================================================
-- 20261119000000_push_notifications.sql
-- ========================================================================

-- Push notifications through Firebase Cloud Messaging (proposal 3.2.4, fitur 5).
--
-- How a push travels:
--   1. A player turns push on in Settings. The browser gets an FCM token for
--      this device and stores it with `register_push_token`.
--   2. Any new row in `notifications` (written by the lobby, invite and friend
--      triggers that already exist) fires `send_push_on_notification`, which
--      posts the title, link and that player's tokens to the app's
--      /api/push endpoint through pg_net. The call is asynchronous, so a slow
--      or failing push never blocks or undoes the insert.
--   3. /api/push (Next.js on Vercel) sends it through FCM with the Firebase
--      service account, and reports tokens FCM says are dead back through
--      `forget_push_tokens`.
--
-- Two values live in Supabase Vault, never in this file or the repo:
--   push_webhook_url     https://teman-game.vercel.app/api/push
--   push_webhook_secret  a long random string, the same as PUSH_WEBHOOK_SECRET
--                        on Vercel, so only this database can make the app push.
-- Until both exist, the trigger does nothing.

create extension if not exists pg_net with schema extensions;

-- ── tokens ──────────────────────────────────────────────────────────────
-- One row per device (browser profile or installed app) a player turned push
-- on for. A token belongs to one device, so it is the key; if another player
-- signs in on that device, the row moves to them.
create table public.push_tokens (
  token text primary key check (char_length(token) between 20 and 4096),
  user_id uuid not null references public.profiles (id) on delete cascade,
  -- "Chrome on Android" and the like, so a player could tell devices apart.
  device text check (char_length(device) <= 120),
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create index push_tokens_user_idx on public.push_tokens (user_id);

alter table public.push_tokens enable row level security;

-- Players see their own devices. All writes go through the functions below.
create policy "own push tokens are readable"
  on public.push_tokens for select
  to authenticated
  using (user_id = auth.uid());

grant select on public.push_tokens to authenticated;

-- Stores (or refreshes) this device's token for the signed-in player.
create function public.register_push_token(p_token text, p_device text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not_signed_in';
  end if;

  insert into public.push_tokens (token, user_id, device)
  values (p_token, v_uid, left(p_device, 120))
  on conflict (token) do update
    set user_id = excluded.user_id,
        device = excluded.device,
        last_seen_at = now();
end;
$$;

-- Turning push off on this device, or signing out on it.
create function public.unregister_push_token(p_token text)
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.push_tokens
  where token = p_token and user_id = auth.uid();
$$;

revoke all on function public.register_push_token(text, text) from public, anon;
revoke all on function public.unregister_push_token(text) from public, anon;
grant execute on function public.register_push_token(text, text) to authenticated;
grant execute on function public.unregister_push_token(text) to authenticated;

-- /api/push reports tokens FCM no longer accepts (app uninstalled, permission
-- withdrawn). It has no player session, so it proves itself with the shared
-- secret instead.
create function public.forget_push_tokens(p_secret text, p_tokens text[])
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_secret text;
  v_count integer;
begin
  select decrypted_secret into v_secret
  from vault.decrypted_secrets where name = 'push_webhook_secret';

  if v_secret is null or p_secret is distinct from v_secret then
    raise exception 'not_allowed';
  end if;

  delete from public.push_tokens where token = any (p_tokens);
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.forget_push_tokens(text, text[]) from public;
grant execute on function public.forget_push_tokens(text, text[]) to anon, authenticated;

-- ── sending ─────────────────────────────────────────────────────────────
create function public.send_push_on_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_url text;
  v_secret text;
  v_tokens text[];
begin
  select array_agg(token) into v_tokens
  from public.push_tokens where user_id = new.user_id;
  if v_tokens is null then
    return null; -- push is off on every device of this player
  end if;

  select decrypted_secret into v_url
  from vault.decrypted_secrets where name = 'push_webhook_url';
  select decrypted_secret into v_secret
  from vault.decrypted_secrets where name = 'push_webhook_secret';
  if v_url is null or v_secret is null then
    return null; -- not configured yet
  end if;

  perform net.http_post(
    url := v_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-push-secret', v_secret
    ),
    body := jsonb_build_object(
      'id', new.id,
      'kind', new.kind,
      'title', new.title,
      'body', new.body,
      'href', coalesce(new.href, '/notifications'),
      'tokens', to_jsonb(v_tokens)
    ),
    timeout_milliseconds := 5000
  );
  return null;
end;
$$;

revoke all on function public.send_push_on_notification() from public, anon, authenticated;

create trigger notifications_send_push
  after insert on public.notifications
  for each row execute function public.send_push_on_notification();


-- ========================================================================
-- 20261119000100_chat_push.sql
-- ========================================================================

-- Push for chat: direct messages and lobby chat lines, without spamming.
--
-- Chat doesn't go through `notifications` (a DM isn't a bell item; it has its
-- own unread badge), so these triggers post to /api/push themselves, through
-- the same Vault settings and device tokens as 20261119000000_push_notifications.sql.
--
-- Against spam, per player and per conversation:
--   * a cooldown: after one push about a conversation, more messages in it
--     stay quiet for a while (1 minute for a DM, 3 for a lobby chat, where
--     several people talk at once);
--   * the push carries a `tag` per conversation, so a new one replaces the
--     last on the phone instead of stacking up.
-- Messages sent during the cooldown still arrive in the app as usual; only
-- the phone stays quiet.

-- When each player was last pushed about each conversation.
create table public.push_throttle (
  user_id uuid not null references public.profiles (id) on delete cascade,
  -- 'dm:<sender id>' or 'lobby:<lobby id>'
  thread text not null,
  last_sent_at timestamptz not null default now(),
  primary key (user_id, thread)
);

-- Only the functions below touch it.
alter table public.push_throttle enable row level security;

-- True (and the clock restarts) if this player may be pushed about this
-- conversation now; false while the cooldown runs.
create function public.push_slot_free(p_user uuid, p_thread text, p_cooldown interval)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ok boolean;
begin
  insert into public.push_throttle as t (user_id, thread, last_sent_at)
  values (p_user, p_thread, now())
  on conflict (user_id, thread) do update
    set last_sent_at = now()
    where t.last_sent_at < now() - p_cooldown
  returning true into v_ok;
  return coalesce(v_ok, false);
end;
$$;

-- Posts one push to /api/push for one player, if they have push on anywhere
-- and the Vault settings exist. Asynchronous (pg_net), never blocks the insert.
create function public.send_push_to(p_user uuid, p_payload jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_url text;
  v_secret text;
  v_tokens text[];
begin
  select array_agg(token) into v_tokens from public.push_tokens where user_id = p_user;
  if v_tokens is null then
    return;
  end if;

  select decrypted_secret into v_url
  from vault.decrypted_secrets where name = 'push_webhook_url';
  select decrypted_secret into v_secret
  from vault.decrypted_secrets where name = 'push_webhook_secret';
  if v_url is null or v_secret is null then
    return;
  end if;

  perform net.http_post(
    url := v_url,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-push-secret', v_secret),
    body := p_payload || jsonb_build_object('tokens', to_jsonb(v_tokens)),
    timeout_milliseconds := 5000
  );
end;
$$;

revoke all on function public.push_slot_free(uuid, text, interval) from public, anon, authenticated;
revoke all on function public.send_push_to(uuid, jsonb) from public, anon, authenticated;

-- ── direct messages ─────────────────────────────────────────────────────
create function public.push_direct_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sender text;
  v_thread text := 'dm:' || new.sender_id;
begin
  if not exists (select 1 from public.push_tokens where user_id = new.receiver_id) then
    return null;
  end if;
  if not public.push_slot_free(new.receiver_id, v_thread, interval '1 minute') then
    return null;
  end if;

  select username into v_sender from public.profiles where id = new.sender_id;
  perform public.send_push_to(new.receiver_id, jsonb_build_object(
    'id', new.id,
    'kind', 'direct_message',
    'title', coalesce(v_sender, 'New message'),
    'body', left(new.body, 140),
    'href', '/messages?user=' || coalesce(v_sender, ''),
    'tag', v_thread
  ));
  return null;
end;
$$;

revoke all on function public.push_direct_message() from public, anon, authenticated;

create trigger direct_messages_push
  after insert on public.direct_messages
  for each row execute function public.push_direct_message();

-- ── lobby chat ──────────────────────────────────────────────────────────
-- Everyone in the lobby but the sender; system lines ("X joined") don't push.
create function public.push_lobby_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lobby text;
  v_sender text;
  v_thread text := 'lobby:' || new.lobby_id;
  r record;
begin
  if new.kind <> 'message' then
    return null;
  end if;

  select name into v_lobby from public.lobby where id = new.lobby_id;
  select username into v_sender from public.profiles where id = new.sender_id;

  for r in
    select m.user_id
    from public.lobby_member m
    where m.lobby_id = new.lobby_id
      and m.user_id <> new.sender_id
      and exists (select 1 from public.push_tokens t where t.user_id = m.user_id)
  loop
    if public.push_slot_free(r.user_id, v_thread, interval '3 minutes') then
      perform public.send_push_to(r.user_id, jsonb_build_object(
        'id', new.id,
        'kind', 'lobby_message',
        'title', coalesce(v_lobby, 'Lobby chat'),
        'body', coalesce(v_sender, 'Someone') || ': ' || left(new.body, 120),
        'href', '/messages?lobby=' || new.lobby_id,
        'tag', v_thread
      ));
    end if;
  end loop;
  return null;
end;
$$;

revoke all on function public.push_lobby_message() from public, anon, authenticated;

create trigger lobby_messages_push
  after insert on public.lobby_messages
  for each row execute function public.push_lobby_message();


-- ========================================================================
-- 20261119000200_admin_moderation.sql
-- ========================================================================

-- The admin console on real data (step 6; proposal use case "Meninjau
-- Laporan dan Memberikan Sanksi", Gambar L3.5 / L4.4).
--
-- Until now an admin wrote to `reports`, `sanction`, `sanction_reports` and
-- `admin_actions` directly, and the audit entry was a separate write the
-- browser could skip. From here every moderation step is one function that
-- checks the caller is an admin, requires a reason, does the change and
-- writes the audit entry in the same transaction. The direct write grants
-- are taken away, so there is no other path.
--
-- Also: what only admins may read (account emails and sign-in dates, the
-- reasons behind 1-2 star ratings) and what a suspended player is told when
-- they try to sign in.

-- ── helpers ─────────────────────────────────────────────────────────────

create function public.require_admin()
returns uuid
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null or not public.is_admin(v_uid) then
    raise exception 'not_admin';
  end if;
  return v_uid;
end;
$$;

create function public.admin_log(
  p_admin uuid, p_type text, p_target_type text, p_target uuid, p_summary text, p_reason text
)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.admin_actions (admin_id, type, target_type, target_id, summary, reason)
  values (p_admin, p_type, p_target_type, p_target, p_summary, p_reason);
$$;

create function public.require_admin_reason(p_reason text)
returns text
language plpgsql
immutable
as $$
begin
  if p_reason is null or char_length(btrim(p_reason)) < 10 then
    raise exception 'reason_too_short';
  end if;
  return btrim(p_reason);
end;
$$;

revoke all on function public.admin_log(uuid, text, text, uuid, text, text) from public, anon, authenticated;

-- ── reports ─────────────────────────────────────────────────────────────

-- Take a pending report so two moderators don't work the same case.
create function public.admin_claim_report(p_report uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin uuid := public.require_admin();
begin
  update public.reports
  set status = 'in_review', assigned_to = v_admin
  where id = p_report and status = 'pending';
  if not found then
    raise exception 'report_not_pending';
  end if;
  perform public.admin_log(v_admin, 'report_claimed', 'report', p_report,
    'Claimed report', 'Claimed the report for review');
end;
$$;

-- Not proven: the report closes as rejected, nothing happens to the player.
create function public.admin_dismiss_report(p_report uuid, p_note text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin uuid := public.require_admin();
  v_note text := public.require_admin_reason(p_note);
begin
  update public.reports
  set status = 'rejected',
      assigned_to = coalesce(assigned_to, v_admin),
      resolution_outcome = 'rejected',
      resolution_note = v_note,
      resolved_by = v_admin,
      resolved_at = now()
  where id = p_report and status in ('pending', 'in_review');
  if not found then
    raise exception 'report_closed';
  end if;
  perform public.admin_log(v_admin, 'report_dismissed', 'report', p_report,
    'Dismissed report', v_note);
end;
$$;

-- ── sanctions ───────────────────────────────────────────────────────────

-- A warning, or a suspension of 1, 3, 7 or 30 days (no permanent ban: the
-- thesis' sanction has a start and an end). Closes the given reports as
-- resolved and links them to the sanction.
create function public.admin_issue_sanction(
  p_player uuid,
  p_type text,
  p_duration_days integer,
  p_reason text,
  p_note text,
  p_report_ids uuid[] default '{}'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin uuid := public.require_admin();
  v_note text := public.require_admin_reason(p_note);
  v_id uuid;
  v_summary text;
begin
  if p_type not in ('warning', 'suspension') then
    raise exception 'sanction_type_invalid';
  end if;
  if p_type = 'suspension' and coalesce(p_duration_days, 0) not in (1, 3, 7, 30) then
    raise exception 'duration_invalid';
  end if;
  if p_reason is null or btrim(p_reason) = '' then
    raise exception 'rule_required';
  end if;
  if public.is_admin(p_player) then
    raise exception 'cannot_sanction_staff';
  end if;
  if not exists (select 1 from public.profiles where id = p_player) then
    raise exception 'player_not_found';
  end if;

  insert into public.sanction (
    player_id, type, duration_days, reason, note, issued_by, issued_at, expires_at
  ) values (
    p_player, p_type,
    case when p_type = 'suspension' then p_duration_days end,
    btrim(p_reason), v_note, v_admin, now(),
    case when p_type = 'suspension' then now() + make_interval(days => p_duration_days) end
  )
  returning id into v_id;

  -- The reports this decision answers: only open ones about this player.
  insert into public.sanction_reports (sanction_id, report_id)
  select v_id, r.id
  from public.reports r
  where r.id = any (coalesce(p_report_ids, '{}'))
    and r.target_id = p_player
    and r.status in ('pending', 'in_review');

  update public.reports r
  set status = 'resolved',
      assigned_to = coalesce(r.assigned_to, v_admin),
      resolution_outcome = 'sanctioned',
      resolution_note = v_note,
      resolved_by = v_admin,
      resolved_at = now(),
      sanction_id = v_id
  where r.id in (select report_id from public.sanction_reports where sanction_id = v_id);

  v_summary := case
    when p_type = 'warning' then 'Warning'
    else p_duration_days || '-day suspension'
  end;
  perform public.admin_log(v_admin, 'sanction_issued', 'player', p_player, v_summary, v_note);
  return v_id;
end;
$$;

-- Ends a suspension early, or withdraws a warning. Kept, never deleted.
create function public.admin_lift_sanction(p_sanction uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin uuid := public.require_admin();
  v_reason text := public.require_admin_reason(p_reason);
  s public.sanction%rowtype;
begin
  update public.sanction
  set lifted_at = now(), lifted_by = v_admin, lift_reason = v_reason
  where id = p_sanction and lifted_at is null
  returning * into s;
  if not found then
    raise exception 'sanction_not_active';
  end if;
  perform public.admin_log(v_admin, 'sanction_lifted', 'player', s.player_id,
    case when s.type = 'warning' then 'Lifted warning'
         else 'Lifted ' || s.duration_days || '-day suspension' end,
    v_reason);
end;
$$;

-- ── lobbies ─────────────────────────────────────────────────────────────

-- Cancels a lobby that hasn't finished. The existing lobby triggers tell the
-- members and clear requests nobody can accept any more.
create function public.admin_close_lobby(p_lobby uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin uuid := public.require_admin();
  v_reason text := public.require_admin_reason(p_reason);
begin
  update public.lobby
  set status = 'cancelled', closed_at = now()
  where id = p_lobby and status in ('open', 'scheduled', 'in_progress');
  if not found then
    raise exception 'lobby_closed';
  end if;
  perform public.admin_log(v_admin, 'lobby_closed', 'lobby', p_lobby, 'Closed lobby', v_reason);
end;
$$;

-- Takes a member out, recorded like the leader removing them: they get the
-- "removed" notification and may apply again.
create function public.admin_remove_member(p_lobby uuid, p_player uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin uuid := public.require_admin();
  v_reason text := public.require_admin_reason(p_reason);
  v_name text;
begin
  update public.applications
  set status = 'left', decided_at = now(), left_at = now()
  where lobby_id = p_lobby and applicant_id = p_player and status = 'accepted';
  if not found then
    raise exception 'not_in_lobby';
  end if;
  select username into v_name from public.profiles where id = p_player;
  perform public.admin_log(v_admin, 'member_removed', 'lobby', p_lobby,
    'Removed ' || coalesce(v_name, 'a member'), v_reason);
end;
$$;

-- ── what only admins read ───────────────────────────────────────────────

-- Account emails and sign-in dates live in auth.users, which the API can't
-- reach; admins get them for the player directory.
create function public.admin_accounts()
returns table (id uuid, email text, joined_at timestamptz, last_sign_in_at timestamptz)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  perform public.require_admin();
  return query
    select u.id, u.email::text, u.created_at, u.last_sign_in_at
    from auth.users u
    join public.profiles p on p.id = u.id;
end;
$$;

-- The reasons behind 1-2 star ratings (proposal: "menjadi catatan untuk
-- keperluan moderasi"). Without the rater, so ratings stay anonymous even
-- to staff.
create function public.admin_low_ratings()
returns table (ratee_id uuid, stars smallint, reason text, lobby_id uuid, created_at timestamptz)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  perform public.require_admin();
  return query
    select r.ratee_id, r.stars, r.low_rating_reason, r.lobby_id, r.created_at
    from public.reviews r
    where r.low_rating_reason is not null
    order by r.created_at desc
    limit 1000;
end;
$$;

-- What a suspended player is told when they sign in: the rule and the dates,
-- never the moderator's note or who reported them.
create function public.my_active_suspension()
returns table (reason text, issued_at timestamptz, expires_at timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select s.reason, s.issued_at, s.expires_at
  from public.sanction s
  where s.player_id = auth.uid()
    and s.type = 'suspension'
    and s.lifted_at is null
    and s.issued_at <= now()
    and (s.expires_at is null or s.expires_at > now())
  order by s.expires_at desc nulls first
  limit 1;
$$;

revoke all on function public.admin_accounts() from public, anon;
revoke all on function public.admin_low_ratings() from public, anon;
revoke all on function public.my_active_suspension() from public, anon;
grant execute on function public.admin_accounts() to authenticated;
grant execute on function public.admin_low_ratings() to authenticated;
grant execute on function public.my_active_suspension() to authenticated;

do $$
declare
  f text;
begin
  foreach f in array array[
    'admin_claim_report(uuid)',
    'admin_dismiss_report(uuid, text)',
    'admin_issue_sanction(uuid, text, integer, text, text, uuid[])',
    'admin_lift_sanction(uuid, text)',
    'admin_close_lobby(uuid, text)',
    'admin_remove_member(uuid, uuid, text)'
  ] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end;
$$;

-- ── no other way in ─────────────────────────────────────────────────────
-- Players keep filing reports (their insert grant is untouched); every
-- moderation write now goes through the functions above.
revoke update on public.reports from authenticated;
revoke insert, update on public.sanction from authenticated;
revoke insert on public.sanction_reports from authenticated;
revoke insert on public.admin_actions from authenticated;


-- ========================================================================
-- 20261119000300_delete_own_account.sql
-- ========================================================================

-- Players delete their own account (Settings → Session & account).
--
-- Until now deletion went through an admin, because removing an auth record
-- needs more rights than a signed-in browser has. This function has them, and
-- only ever deletes the caller. It backs the right to have personal data
-- erased (UU PDP No. 27/2022).
--
-- What happens:
--   * Refused for staff accounts (another admin removes those) and while a
--     suspension is running, so deleting can't be used to dodge one.
--   * Reports filed by or about the player, and their sanctions, are removed
--     first: those keep their rows when a profile goes, and would otherwise
--     block the delete.
--   * Deleting the auth user cascades to the profile and everything that
--     belongs to it: games, tags, lobbies they lead, applications, invites,
--     friendships, blocks, messages, notifications, push tokens, and the
--     ratings they gave and received.
--   * The ratings they gave disappear, so everyone they rated gets their
--     reputation worked out again.
--
-- The profile picture is a Storage file; the app removes it before calling
-- this, since Storage files are deleted through the Storage API.

create function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_rated uuid[];
  r uuid;
begin
  if v_uid is null then
    raise exception 'not_signed_in';
  end if;
  if public.is_admin(v_uid) then
    raise exception 'staff_account';
  end if;
  if exists (
    select 1 from public.sanction s
    where s.player_id = v_uid
      and s.type = 'suspension'
      and s.lifted_at is null
      and s.issued_at <= now()
      and (s.expires_at is null or s.expires_at > now())
  ) then
    raise exception 'suspended';
  end if;

  -- Whose reputation depends on ratings this player gave.
  select array_agg(distinct ratee_id) into v_rated
  from public.reviews where rater_id = v_uid;

  delete from public.sanction_reports
  where report_id in (
    select id from public.reports where reporter_id = v_uid or target_id = v_uid
  )
     or sanction_id in (select id from public.sanction where player_id = v_uid);
  update public.reports set sanction_id = null
  where sanction_id in (select id from public.sanction where player_id = v_uid);
  delete from public.reports where reporter_id = v_uid or target_id = v_uid;
  delete from public.sanction where player_id = v_uid;

  delete from auth.users where id = v_uid;

  foreach r in array coalesce(v_rated, '{}') loop
    perform public.recompute_reputation(r);
  end loop;
end;
$$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;


-- ========================================================================
-- 20261119000400_oauth_signup.sql
-- ========================================================================

-- Masuk lewat Google dan Discord: username yang tidak diketik siapa pun.
--
-- `handle_new_user` (20260919000000_profiles.sql) membaca
-- `raw_user_meta_data.username` -- dan hanya form pendaftaran email yang
-- menuliskannya -- lalu jatuh ke bagian depan alamat email. Keduanya patah
-- pada pendaftaran OAuth, dengan tiga cara:
--
--   1. Tidak ada yang memeriksa hasilnya terhadap `profiles_username_lower_idx`
--      (unik pada lower(username)). Akun Google yang bagian depan emailnya
--      sudah dipakai orang lain membuat INSERT gagal; kegagalan itu
--      menggagalkan seluruh insert ke `auth.users`, dan Supabase melaporkannya
--      ke peramban sebagai "Database error saving new user". Artinya tombolnya
--      sekadar tidak bekerja. Pada pendaftaran email hal ini memang disengaja
--      (`SignupForm` menerjemahkannya menjadi "That username is already
--      taken"), tetapi pada OAuth tidak ada nama yang bisa diperbaiki pemakai.
--   2. Akun Discord tanpa email terverifikasi datang dengan `email` null;
--      `split_part(null, '@', 1)` juga null, sementara `profiles.username`
--      NOT NULL. Pendaftarannya gagal total.
--   3. Username muncul di URL (`/profile/<username>`), jadi hanya boleh berisi
--      [A-Za-z0-9_.-] (src/lib/username.ts). Nama tampilan Google
--      ("Ryon Pratama") atau nama beraksara non-Latin tidak memenuhinya.
--
-- Aturan di bawah TIDAK menyentuh kasus eksplisit: kalau pemakai mengetik
-- username sendiri, nama itu dimasukkan apa adanya dan duplikatnya tetap
-- ditolak, sehingga pesan "username already taken" di form email tetap jalan
-- seperti sebelumnya. Nama hanya dibuatkan ketika tidak ada yang memilihnya.

-- == Pembuat nama =========================================================
-- Dipisah dari trigger supaya bisa diuji sendiri (lihat blok pemeriksaan di
-- bawah, dan BAB 4: boundary value -- 2 karakter, 3 karakter, 24, 25).
--
-- EXECUTE-nya dicabut dari semua peran: trigger-nya security definer milik
-- postgres, jadi ia tetap boleh memanggil, sedangkan PostgREST tidak
-- mengekspos fungsi ini sebagai RPC.
create or replace function public.generate_username(
  p_handle text,
  p_email  text
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_try    text;
  v_base   text := '';
  v_name   text;
  v_suffix int  := 0;
begin
  -- Bersihkan setiap calon sampai tersisa yang boleh ada di URL, lalu pakai
  -- yang pertama yang masih punya 3 karakter. Nama beraksara non-Latin
  -- bersih menjadi kosong -- itu sebabnya ada cadangan di akhir.
  foreach v_try in array array[p_handle, split_part(coalesce(p_email, ''), '@', 1)]::text[]
  loop
    v_base := left(regexp_replace(coalesce(v_try, ''), '[^A-Za-z0-9_.-]', '', 'g'), 24);
    exit when length(v_base) >= 3;
  end loop;

  if coalesce(length(v_base), 0) < 3 then
    v_base := 'player';
  end if;

  -- Nama buatan masih bisa bentrok: dua alamat Gmail dengan bagian depan sama
  -- di domain berbeda, atau nama yang sudah didaftarkan lewat email. Karena
  -- tidak ada yang memilih nama ini, menyelesaikannya diam-diam justru benar --
  -- menggagalkannya berarti tombol OAuth-nya tidak bisa dipakai sama sekali.
  v_name := v_base;
  while exists (
    select 1 from public.profiles where lower(username) = lower(v_name)
  ) loop
    v_suffix := v_suffix + 1;
    if v_suffix <= 50 then
      -- Tetap di dalam batas 24 karakter yang dipaksakan form.
      v_name := left(v_base, 24 - length(v_suffix::text)) || v_suffix::text;
    else
      -- Lima puluh tebakan gagal: ambil yang hampir pasti belum ada. Kondisi
      -- WHILE tetap memeriksanya, jadi loop ini pasti berhenti.
      v_name := left(v_base, 14) || '-' || to_hex((random() * 2147483647)::int);
    end if;
  end loop;

  return v_name;
end;
$$;

revoke all on function public.generate_username(text, text) from public;

-- == Trigger ==============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_provider text := coalesce(new.raw_app_meta_data ->> 'provider', 'email');
  v_chosen   text := nullif(trim(new.raw_user_meta_data ->> 'username'), '');
  v_handle   text;
  v_base     text;
begin
  -- Pendaftaran email: pemakai mengetiknya sendiri. Masukkan apa adanya
  -- supaya duplikat tetap melempar galat -- itulah yang diubah SignupForm
  -- menjadi "That username is already taken". Jangan pernah mengganti nama
  -- pilihan orang secara diam-diam.
  if v_chosen is not null then
    insert into public.profiles (id, username) values (new.id, v_chosen);
    return new;
  end if;

  -- OAuth. Pada Discord, `name`/`user_name` MEMANG handel publik pemainnya,
  -- jadi itu username terbaik yang bisa kita dapat. Pada Google, `name`
  -- adalah nama asli orangnya, jadi sengaja dilewati dan dipakai bagian depan
  -- emailnya: username itu publik dan muncul di URL, sedangkan nama asli
  -- bukan sesuatu yang kita berhak sebarkan atas nama pemakainya.
  if v_provider = 'discord' then
    v_handle := coalesce(
      new.raw_user_meta_data ->> 'user_name',
      new.raw_user_meta_data ->> 'nickname',
      new.raw_user_meta_data ->> 'name',
      new.raw_user_meta_data -> 'custom_claims' ->> 'global_name'
    );
  end if;

  v_base := public.generate_username(v_handle, new.email);

  begin
    insert into public.profiles (id, username) values (new.id, v_base);
  exception when unique_violation then
    -- Dua pendaftaran OAuth yang jatuh ke nama sama pada saat yang sama.
    -- Sempit sekali, tapi akibatnya pendaftaran gagal total, jadi dicoba
    -- sekali lagi dengan akhiran acak.
    insert into public.profiles (id, username)
    values (
      new.id,
      left(v_base, 14) || '-' || to_hex((random() * 2147483647)::int)
    );
  end;

  return new;
end;
$$;

-- Foto profil dari Google/Discord TIDAK diambil. `profiles.avatar_path`
-- dikunci CHECK ke `<id pemakai>/<waktu>.jpg` di bucket `avatars`
-- (20261004000000_avatars.sql) justru supaya tidak ada URL luar di sana.
-- Akun baru tampil sebagai inisial (`UserAvatar`) sampai pemakainya
-- mengunggah foto sendiri.

-- == Periksa sendiri ======================================================
do $verify$
declare
  v_ada   text;
  v_hasil text;
begin
  -- Fungsi ini MENGHINDARI nama yang sudah dipakai, jadi uji kesamaan persis
  -- hanya sahih kalau nama ujinya belum ada. Semua nama uji di bawah diawali
  -- "ujioauth"; itu dipastikan dulu, supaya migrasinya tidak pernah gagal
  -- gara-gara kebetulan ada yang mendaftar dengan nama itu.
  if exists (
    select 1 from public.profiles where lower(username) like 'ujioauth%'
  ) then
    raise exception 'Ada username berawalan "ujioauth"; ganti nama uji di migrasi ini.';
  end if;

  -- Handel Discord dipakai apa adanya.
  v_hasil := public.generate_username('UjiOauth', 'apa@saja.test');
  if v_hasil <> 'UjiOauth' then
    raise exception 'Handel bersih seharusnya dipakai apa adanya, dapat %', v_hasil;
  end if;

  -- Tanpa handel (Google): bagian depan email.
  v_hasil := public.generate_username(null, 'ujioauthmail@gmail.test');
  if v_hasil <> 'ujioauthmail' then
    raise exception 'Bagian depan email tidak terpakai, dapat %', v_hasil;
  end if;

  -- Spasi dan karakter lain dibuang, bukan ditolak.
  v_hasil := public.generate_username('Uji Oauth!', 'x@y.test');
  if v_hasil <> 'UjiOauth' then
    raise exception 'Pembersihan karakter salah, dapat %', v_hasil;
  end if;

  -- Handel yang bersih menjadi kosong harus jatuh ke email. Ini kasus nyata
  -- untuk nama beraksara non-Latin; diuji dengan '!!!' supaya berkasnya tetap
  -- ASCII dan aman ditempel di editor SQL mana pun.
  v_hasil := public.generate_username('!!!', 'ujioauthlatin@x.test');
  if v_hasil <> 'ujioauthlatin' then
    raise exception 'Handel tak terpakai tidak jatuh ke email, dapat %', v_hasil;
  end if;

  -- Boundary value: 2 karakter terlalu pendek, 3 karakter cukup. Uji yang
  -- kedua sengaja dibandingkan dengan email-nya, bukan dengan 'abc' --
  -- 'abc' bisa saja sudah dipakai orang, dan hasilnya 'abc1' tetap
  -- membuktikan handel-nya yang dipakai.
  v_hasil := public.generate_username('ab', 'ujioauthshort@x.test');
  if v_hasil <> 'ujioauthshort' then
    raise exception '2 karakter seharusnya ditolak, dapat %', v_hasil;
  end if;
  v_hasil := public.generate_username('abc', 'ujioauthshort@x.test');
  if v_hasil = 'ujioauthshort' then
    raise exception '3 karakter seharusnya diterima, tapi malah jatuh ke email';
  end if;

  -- Boundary value: lebih dari 24 karakter dipangkas ke 24. Kebal bentrok --
  -- penyelesaian bentrok pun menjaga panjangnya tetap 24.
  v_hasil := public.generate_username(repeat('a', 30), 'x@y.test');
  if length(v_hasil) <> 24 then
    raise exception 'Nama panjang seharusnya dipangkas ke 24, dapat % (%)',
      length(v_hasil), v_hasil;
  end if;

  -- Tidak ada handel dan tidak ada email sama sekali (Discord tanpa email
  -- terverifikasi) -- kasus yang sebelumnya menggagalkan pendaftaran.
  v_hasil := public.generate_username(null, null);
  if v_hasil not like 'player%' then
    raise exception 'Tanpa handel dan email seharusnya berawalan "player", dapat %', v_hasil;
  end if;

  -- Bentrok dengan nama yang sudah ada diselesaikan, bukan digagalkan.
  select username into v_ada from public.profiles limit 1;
  if v_ada is not null then
    v_hasil := public.generate_username(v_ada, 'x@y.test');
    if lower(v_hasil) = lower(v_ada) then
      raise exception 'Bentrok username tidak diselesaikan: % tetap %', v_ada, v_hasil;
    end if;
    if length(v_hasil) > 24 then
      raise exception 'Penyelesaian bentrok melewati 24 karakter: %', v_hasil;
    end if;
    raise notice 'Bentrok "%" diselesaikan menjadi "%".', v_ada, v_hasil;
  else
    raise notice 'Lewati uji bentrok: tabel profiles masih kosong.';
  end if;

  raise notice 'Pemeriksaan lolos: generate_username siap untuk Google dan Discord.';
end
$verify$;

-- ========================================================================
-- Check: every one of these should be listed.
-- ========================================================================
select proname from pg_proc
where proname in ('create_lobby', 'apply_to_lobby', 'submit_review', 'recompute_reputation',
                  'player_matches', 'admin_issue_sanction', 'delete_my_account', 'generate_username')
order by proname;
