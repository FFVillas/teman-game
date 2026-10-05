-- Game slice: `game` + `user_game_mapping` from the proposal's ERD (see
-- docs/thesis-spec.md). This is what makes the profile's per-game tabs real
-- — until now they were a hardcoded list of four titles, and the games,
-- rank and role collected during onboarding were thrown away.
--
-- Rank and role are typed in by the player, not synced from the game: there
-- is no Riot/Moonton API integration, and pretending otherwise would put
-- unverified numbers on a profile that is supposed to be trustworthy. The
-- UI says as much.

-- ── Catalogue ───────────────────────────────────────────────────────────
-- Integer primary key, as the ERD specifies. Fixed ids (not generated) so
-- the app can seed and reference them without a lookup round trip.
create table public.games (
  id smallint primary key,
  slug text not null unique,
  name text not null
);

insert into public.games (id, slug, name) values
  (1, 'valorant', 'Valorant'),
  (2, 'league-of-legends', 'League of Legends'),
  (3, 'counter-strike-2', 'Counter-Strike 2'),
  (4, 'mobile-legends', 'Mobile Legends: Bang Bang'),
  (5, 'pubg-mobile', 'PUBG Mobile'),
  (6, 'free-fire', 'Free Fire');

alter table public.games enable row level security;

create policy "Games are publicly readable"
  on public.games for select
  to anon, authenticated
  using (true);

grant select on public.games to anon, authenticated;
-- No write policy: the catalogue is the thesis scope, changed by migration.

-- ── Per-player game profile ─────────────────────────────────────────────
create table public.user_game_mapping (
  user_id uuid not null references public.profiles (id) on delete cascade,
  game_id smallint not null references public.games (id),
  -- What they're called in that game (Riot ID, IGN). Free text: formats
  -- differ per title and none of it is verified.
  in_game_name text check (char_length(in_game_name) <= 60),
  -- Region is per game, not per account — someone can queue SG2 on Valorant
  -- and NA on League. That's why it isn't on `profiles` (see
  -- 20260919000300_profiles_drop_region.sql).
  region text check (char_length(region) <= 20),
  rank text check (char_length(rank) <= 40),
  -- Several roles per game is normal ("I flex jungle and mid").
  roles text[] not null default '{}' check (cardinality(roles) <= 6),
  created_at timestamptz not null default now(),
  primary key (user_id, game_id)
);

alter table public.user_game_mapping enable row level security;

-- Same reasoning as `profiles`: a player's games are part of the public
-- profile other people read before inviting them.
create policy "Player game profiles are publicly readable"
  on public.user_game_mapping for select
  to anon, authenticated
  using (true);

create policy "Players manage their own game profiles"
  on public.user_game_mapping for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Players can edit their own game profiles"
  on public.user_game_mapping for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Players can remove their own game profiles"
  on public.user_game_mapping for delete
  to authenticated
  using (auth.uid() = user_id);

grant select on public.user_game_mapping to anon, authenticated;
grant insert (user_id, game_id, in_game_name, region, rank, roles)
  on public.user_game_mapping to authenticated;
-- Only the editable columns: the two key columns identify the row and
-- changing them would mean "move this to another game/person", which the
-- app does by deleting and inserting instead.
--
-- NOTE: this is why the app must not use `.upsert()` here — PostgREST
-- compiles that to `on conflict do update set <every column sent>`, which
-- needs UPDATE on the key columns too and fails with 42501. See
-- src/lib/user-games.ts and the note in AGENTS.md.
grant update (in_game_name, region, rank, roles)
  on public.user_game_mapping to authenticated;
grant delete on public.user_game_mapping to authenticated;

-- Finding everyone who plays a game (the LFG list, once it reads real data)
-- goes the other way round from the primary key.
create index user_game_mapping_game_idx
  on public.user_game_mapping (game_id);
