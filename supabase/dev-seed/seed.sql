-- DEMO AND TEST DATA: something to look at, and the test lobbies for the
-- Precision@5 evaluation (proposal 3.1.6, "sekitar 20 lobi uji dengan variasi
-- gim, rank, playstyle, dan tag").
--
-- NOT a migration: it lives outside supabase/migrations on purpose, and the
-- app never depends on it. Run it by hand in the Supabase SQL editor. It is
-- safe to run again: it removes its own earlier data first. To remove
-- everything it made, run cleanup.sql.
--
-- WHAT IT MAKES
--   * 51 fake players (username demo_xxx, email xxx@demo.temangame.test),
--     eight to eleven per game, each with a rank, a playstyle, three
--     personality tags and a reputation. They have no password, so nobody can log in as them.
--   * Five open lobbies in each of the six games (30), plus two scheduled
--     ones. Precision@5 shows each participant the top five lobbies of their
--     game, so every game needs at least five. Per game the five differ on
--     purpose: a very casual one, a very competitive one, a balanced one with
--     no wanted tags (|B| = 0, Persamaan 3.15), one with a narrow rank range,
--     and one whose members have a poor reputation.
--   * If you put YOUR username below, you get a pending application on one
--     lobby and three applicants on your newest open lobby (one of them
--     already in another lobby, which shows the "already in a live lobby"
--     error on accept). With no open lobby, a small scheduled one is made.
--
-- REPUTATION is written straight onto profiles (`reputation_bayes` = R*,
-- `reputation_score` and `review_count` for display). There are no review
-- rows behind it: real R* comes from `submit_review` and
-- `recompute_reputation`, which only touch players who have reviews.
--
-- WHO SEES IT: everyone who uses this same database, including teammates. The
-- names are obviously fake on purpose. Run cleanup.sql when you are done.
--
-- Written against the migrations up to 20261117000000 (thesis table names,
-- `tag` / `user_tag`, `lobby_tag`, `lobby.playstyle`).

-- ── helpers (temporary: they vanish when the session ends) ─────────────

-- The rank at a point on a game's ladder: 0 is the lowest, 1 the highest.
-- Positions instead of names, so one call works for every game's ladder.
create or replace function pg_temp.rank_at(p_game smallint, p_position numeric)
returns smallint
language sql
as $$
  select id from public.rank_tier
  where game_id = p_game
  order by ordinal
  offset (
    select round(p_position * (count(*) - 1))::int
    from public.rank_tier where game_id = p_game
  )
  limit 1;
$$;

-- A player in one game: an auth user without a password (the signup trigger
-- makes the profile), their playstyle, tags, reputation, rank and roles.
create or replace function pg_temp.player(
  p_name text, p_game text, p_position numeric, p_region text,
  p_playstyle smallint, p_tags text[], p_stars numeric, p_reviews integer,
  p_roles text[] default array[]::text[]
) returns uuid
language plpgsql
as $$
declare
  v_id uuid := gen_random_uuid();
  v_game smallint;
begin
  select id into v_game from public.game where slug = p_game;
  if v_game is null then
    raise exception 'unknown game "%"', p_game;
  end if;

  insert into auth.users (id, aud, role, email, raw_user_meta_data, raw_app_meta_data, created_at, updated_at)
  values (
    v_id, 'authenticated', 'authenticated', p_name || '@demo.temangame.test',
    jsonb_build_object('username', p_name),
    '{"provider":"email","providers":["email"]}'::jsonb, now(), now()
  );

  -- An unrated player keeps the prior: R* = m = 3 (Persamaan 3.10 with no data).
  update public.profiles
  set playstyle = p_playstyle,
      languages = array['Indonesian', 'English'],
      reputation_bayes = case when p_reviews > 0 then p_stars else 3 end,
      reputation_score = case when p_reviews > 0 then p_stars else 0 end,
      review_count = p_reviews
  where id = v_id;

  insert into public.user_tag (user_id, tag_id)
  select v_id, t.id from public.tag t where t.name = any (p_tags);

  insert into public.user_game_mapping (user_id, game_id, in_game_name, region, rank_id)
  values (v_id, v_game, p_name, p_region, pg_temp.rank_at(v_game, p_position));

  insert into public.user_game_roles (user_id, game_id, role_id)
  select v_id, v_game, r.id from public.game_role r
  where r.game_id = v_game and r.name = any (p_roles);

  return v_id;
end;
$$;

-- A lobby, written directly (the app goes through create_lobby; a seed has no
-- signed-in user to do that as). `p_min` / `p_max` are ladder positions, or
-- null for an open end.
create or replace function pg_temp.lobby(
  p_leader text, p_mode text, p_name text, p_description text,
  p_playstyle smallint, p_wanted text[], p_min numeric, p_max numeric,
  p_capacity integer, p_minutes_ago integer,
  p_roles text[] default array[]::text[],
  p_status text default 'open', p_starts timestamptz default null
) returns uuid
language plpgsql
as $$
declare
  v_leader uuid;
  v_game smallint;
  v_region text;
  v_mode smallint;
  v_id uuid;
begin
  select m.user_id, m.game_id, m.region into v_leader, v_game, v_region
  from public.user_game_mapping m
  join public.profiles p on p.id = m.user_id
  where p.username = p_leader;

  select id into v_mode from public.game_modes where game_id = v_game and value = p_mode;
  if v_mode is null then
    raise exception 'unknown mode "%" for %', p_mode, p_leader;
  end if;

  insert into public.lobby (
    leader_id, game_id, mode_id, name, description, region, languages, mic_required,
    tags, capacity, status, starts_at, ends_at, min_rank_id, max_rank_id, cover,
    playstyle, created_at
  ) values (
    v_leader, v_game, v_mode, p_name, p_description, v_region,
    array['Indonesian', 'English'], p_playstyle >= 4,
    case when p_playstyle >= 4 then array['Competitive'] else array['Chill'] end,
    p_capacity, p_status, p_starts,
    case when p_starts is null then null else p_starts + interval '3 hours' end,
    case when p_min is null then null else pg_temp.rank_at(v_game, p_min) end,
    case when p_max is null then null else pg_temp.rank_at(v_game, p_max) end,
    null, p_playstyle, now() - make_interval(mins => p_minutes_ago)
  ) returning id into v_id;

  insert into public.lobby_required_role (lobby_id, game_id, role_id)
  select v_id, v_game, r.id from public.game_role r
  where r.game_id = v_game and r.name = any (p_roles);

  insert into public.lobby_tag (lobby_id, tag_id)
  select v_id, t.id from public.tag t where t.name = any (p_wanted);

  return v_id;
end;
$$;

-- Someone already accepted into a lobby.
create or replace function pg_temp.member(p_lobby uuid, p_username text)
returns void
language plpgsql
as $$
begin
  insert into public.applications (lobby_id, game_id, applicant_id, status, decided_at, joined_at)
  select p_lobby, l.game_id, p.id, 'accepted', now(), now()
  from public.lobby l, public.profiles p
  where l.id = p_lobby and p.username = p_username;
end;
$$;

-- An application waiting for an answer. Inserting it fires the real trigger,
-- so the leader's bell gets a real join request.
create or replace function pg_temp.pending(p_lobby uuid, p_username text, p_message text)
returns void
language plpgsql
as $$
begin
  insert into public.applications (lobby_id, game_id, applicant_id, message, status)
  select p_lobby, l.game_id, p.id, p_message, 'pending'
  from public.lobby l, public.profiles p
  where l.id = p_lobby and p.username = p_username;
end;
$$;

do $seed$
declare
  -- Your own username (the one shown on your profile). Leave as is to skip the
  -- parts that involve you.
  me_username constant text := 'YOUR_USERNAME_HERE';

  me uuid;
  my_lobby uuid;
  l uuid;
  tomorrow_8pm timestamptz :=
    (date_trunc('day', now() at time zone 'Asia/Jakarta') + interval '1 day 20 hours')
    at time zone 'Asia/Jakarta';
begin
  -- ── 0. start clean ────────────────────────────────────────────────────
  delete from public.notifications
  where actor_id in (select id from public.profiles where username like 'demo\_%');
  delete from auth.users where email like '%@demo.temangame.test';

  -- ── 1. Valorant ───────────────────────────────────────────────────────
  -- (name, game, ladder position, region, playstyle, tags, stars, reviews, roles)
  perform pg_temp.player('demo_jett',  'valorant', 0.70, 'AP', 5::smallint, array['Shot Caller','Never Surrender','Flex Player'], 4.6, 21, array['Duelist']);
  perform pg_temp.player('demo_sova',  'valorant', 0.68, 'AP', 4::smallint, array['Shot Caller','Positive Mental Attitude','Never Surrender'], 4.3, 14, array['Initiator']);
  perform pg_temp.player('demo_omen',  'valorant', 0.72, 'AP', 5::smallint, array['Never Surrender','Flex Player','Shot Caller'], 4.1, 9, array['Controller']);
  perform pg_temp.player('demo_sage',  'valorant', 0.35, 'AP', 2::smallint, array['Chill','Positive Mental Attitude','Flex Player'], 4.8, 30, array['Sentinel']);
  perform pg_temp.player('demo_neon',  'valorant', 0.25, 'AP', 1::smallint, array['Chill','Positive Mental Attitude','Never Surrender'], 4.4, 12, array['Duelist']);
  perform pg_temp.player('demo_brim',  'valorant', 0.20, 'AP', 1::smallint, array['Chill','Flex Player','Positive Mental Attitude'], 0, 0, array['Controller']);
  perform pg_temp.player('demo_raze',  'valorant', 0.45, 'AP', 3::smallint, array['Flex Player','Chill','Never Surrender'], 2.1, 11, array['Duelist']);
  perform pg_temp.player('demo_yoru',  'valorant', 0.48, 'AP', 3::smallint, array['Shot Caller','Flex Player','Chill'], 1.9, 8, array['Duelist']);
  perform pg_temp.player('demo_kayo',  'valorant', 0.66, 'AP', 4::smallint, array['Positive Mental Attitude','Shot Caller','Flex Player'], 4.0, 6, array['Initiator']);
  -- Not in any lobby: free to apply to yours (section 7).
  perform pg_temp.player('demo_fade',  'valorant', 0.40, 'AP', 2::smallint, array['Positive Mental Attitude','Chill','Flex Player'], 3.8, 5, array['Initiator']);
  perform pg_temp.player('demo_cypher','valorant', 0.38, 'AP', 3::smallint, array['Flex Player','Never Surrender','Chill'], 0, 0, array['Sentinel']);

  l := pg_temp.lobby('demo_neon', 'unrated', 'Chill Unrated Night',
    'No pressure, good vibes, some laughs and the occasional clutch. All ranks welcome.',
    1::smallint, array['Chill','Positive Mental Attitude'], null, null, 5, 18);
  perform pg_temp.member(l, 'demo_brim');

  l := pg_temp.lobby('demo_jett', 'competitive', 'Radiant Grind',
    'Climbing this act. We play clean, call everything and don''t tilt after a bad round.',
    5::smallint, array['Shot Caller','Never Surrender'], 0.60, 0.90, 5, 25, array['Controller','Sentinel']);
  perform pg_temp.member(l, 'demo_sova');
  perform pg_temp.member(l, 'demo_omen');

  perform pg_temp.lobby('demo_sage', 'swiftplay', 'Balanced Swiftplay',
    'Serious while the round lasts, relaxed between. Any agent.',
    3::smallint, array[]::text[], null, null, 5, 12);

  perform pg_temp.lobby('demo_kayo', 'competitive', 'Mid-Elo Climb',
    'A narrow range so the lobby stays queueable. Comms in English or Indonesian.',
    4::smallint, array['Positive Mental Attitude','Shot Caller'], 0.62, 0.75, 5, 30, array['Duelist']);

  l := pg_temp.lobby('demo_raze', 'spike-rush', 'Spike Rush Warmup',
    'Quick games between ranked. Anyone.',
    3::smallint, array['Flex Player'], null, null, 5, 6);
  perform pg_temp.member(l, 'demo_yoru');

  perform pg_temp.lobby('demo_omen', 'premier', 'Premier Scrims',
    'Practising for Premier. Please be on time.',
    5::smallint, array['Shot Caller','Never Surrender','Flex Player'], 0.65, null, 5, 4,
    array['Initiator','Sentinel'], 'scheduled', tomorrow_8pm);

  -- ── 2. League of Legends ──────────────────────────────────────────────
  perform pg_temp.player('demo_ahri',  'league-of-legends', 0.30, 'SEA', 2::smallint, array['Chill','Positive Mental Attitude','Flex Player'], 4.5, 16, array['Mid']);
  perform pg_temp.player('demo_lux',   'league-of-legends', 0.40, 'SEA', 1::smallint, array['Chill','Positive Mental Attitude','Never Surrender'], 4.7, 25, array['Support']);
  perform pg_temp.player('demo_garen', 'league-of-legends', 0.20, 'SEA', 1::smallint, array['Chill','Flex Player','Never Surrender'], 0, 0, array['Top']);
  perform pg_temp.player('demo_yasuo', 'league-of-legends', 0.65, 'SEA', 5::smallint, array['Shot Caller','Never Surrender','Flex Player'], 3.9, 19, array['Mid']);
  perform pg_temp.player('demo_zed',   'league-of-legends', 0.68, 'SEA', 5::smallint, array['Shot Caller','Never Surrender','Positive Mental Attitude'], 4.2, 10, array['Mid']);
  perform pg_temp.player('demo_kaisa', 'league-of-legends', 0.50, 'SEA', 3::smallint, array['Flex Player','Chill','Positive Mental Attitude'], 4.0, 7, array['Bot (ADC)']);
  perform pg_temp.player('demo_lee',   'league-of-legends', 0.45, 'SEA', 4::smallint, array['Shot Caller','Flex Player','Never Surrender'], 2.0, 13, array['Jungle']);
  perform pg_temp.player('demo_teemo', 'league-of-legends', 0.42, 'SEA', 4::smallint, array['Never Surrender','Flex Player','Chill'], 1.8, 9, array['Top']);

  l := pg_temp.lobby('demo_lux', 'aram', 'ARAM All Night',
    'Pure chaos, zero stakes. Join for the snowballs.',
    1::smallint, array['Chill'], null, null, 5, 14);
  perform pg_temp.member(l, 'demo_garen');

  l := pg_temp.lobby('demo_yasuo', 'ranked-flex', 'Emerald Flex Stack',
    'Flex stack with a shot caller. We review every loss.',
    5::smallint, array['Shot Caller','Never Surrender'], 0.55, 0.85, 5, 8, array['Top','Jungle']);
  perform pg_temp.member(l, 'demo_zed');

  perform pg_temp.lobby('demo_kaisa', 'normal-draft', 'Balanced Normals',
    'Try-hard when it matters, otherwise relaxed. Any role.',
    3::smallint, array[]::text[], null, null, 5, 20);

  perform pg_temp.lobby('demo_ahri', 'ranked-solo-duo', 'Duo to Gold',
    'Looking for a calm duo partner, ideally a jungler.',
    2::smallint, array['Positive Mental Attitude','Flex Player'], 0.25, 0.40, 2, 22, array['Jungle']);

  l := pg_temp.lobby('demo_lee', 'swiftplay', 'Swiftplay Sprint',
    'Short games, fast queue.',
    4::smallint, array['Never Surrender'], null, null, 5, 5);
  perform pg_temp.member(l, 'demo_teemo');

  perform pg_temp.lobby('demo_kaisa', 'clash', 'Clash Saturday',
    'Clash team for the weekend. Bring your best champion pool.',
    4::smallint, array['Shot Caller','Positive Mental Attitude'], null, null, 5, 3,
    array['Support'], 'scheduled', now() + interval '3 hours');

  -- ── 3. Counter-Strike 2 (no roles) ────────────────────────────────────
  perform pg_temp.player('demo_s1mple', 'counter-strike-2', 0.80, 'ASIA', 5::smallint, array['Shot Caller','Never Surrender','Flex Player'], 4.4, 18);
  perform pg_temp.player('demo_niko',   'counter-strike-2', 0.75, 'ASIA', 5::smallint, array['Never Surrender','Shot Caller','Positive Mental Attitude'], 4.0, 11);
  perform pg_temp.player('demo_rain',   'counter-strike-2', 0.40, 'ASIA', 3::smallint, array['Flex Player','Chill','Positive Mental Attitude'], 4.6, 20);
  perform pg_temp.player('demo_karrigan','counter-strike-2', 0.35, 'ASIA', 2::smallint, array['Shot Caller','Chill','Positive Mental Attitude'], 4.9, 27);
  perform pg_temp.player('demo_hobbit', 'counter-strike-2', 0.20, 'ASIA', 1::smallint, array['Chill','Positive Mental Attitude','Flex Player'], 0, 0);
  perform pg_temp.player('demo_ropz',   'counter-strike-2', 0.25, 'ASIA', 1::smallint, array['Chill','Never Surrender','Flex Player'], 4.2, 6);
  perform pg_temp.player('demo_fallen', 'counter-strike-2', 0.55, 'ASIA', 4::smallint, array['Shot Caller','Flex Player','Never Surrender'], 2.2, 10);
  perform pg_temp.player('demo_magixx', 'counter-strike-2', 0.57, 'ASIA', 4::smallint, array['Never Surrender','Chill','Flex Player'], 1.7, 7);

  l := pg_temp.lobby('demo_hobbit', 'casual', 'Casual Deathmatch Pals',
    'Warm up, no stress, mics optional.',
    1::smallint, array['Chill','Positive Mental Attitude'], null, null, 5, 16);
  perform pg_temp.member(l, 'demo_ropz');

  l := pg_temp.lobby('demo_s1mple', 'premier', 'Premier Push',
    'Tryhard Premier. Utility, trades, calls.',
    5::smallint, array['Shot Caller','Never Surrender'], 0.65, null, 5, 9);
  perform pg_temp.member(l, 'demo_niko');

  perform pg_temp.lobby('demo_rain', 'competitive', 'Balanced Competitive',
    'Serious rounds, friendly lobby.',
    3::smallint, array[]::text[], null, null, 5, 24);

  perform pg_temp.lobby('demo_karrigan', 'wingman', 'Wingman Learning',
    'Learning maps together, calm comms.',
    2::smallint, array['Positive Mental Attitude'], 0.30, 0.45, 2, 28);

  l := pg_temp.lobby('demo_fallen', 'competitive', 'Late Night Comp',
    'Competitive until we drop.',
    4::smallint, array['Shot Caller','Never Surrender','Flex Player'], null, null, 5, 7);
  perform pg_temp.member(l, 'demo_magixx');

  -- ── 4. Mobile Legends ─────────────────────────────────────────────────
  perform pg_temp.player('demo_lylia',  'mobile-legends', 0.30, 'SEA', 1::smallint, array['Chill','Positive Mental Attitude','Flex Player'], 4.6, 15, array['Mid Lane']);
  perform pg_temp.player('demo_tigreal','mobile-legends', 0.25, 'SEA', 1::smallint, array['Chill','Flex Player','Never Surrender'], 0, 0, array['Roam']);
  perform pg_temp.player('demo_ling',   'mobile-legends', 0.80, 'SEA', 5::smallint, array['Shot Caller','Never Surrender','Flex Player'], 4.3, 22, array['Jungle']);
  perform pg_temp.player('demo_beatrix','mobile-legends', 0.78, 'SEA', 5::smallint, array['Never Surrender','Shot Caller','Positive Mental Attitude'], 4.1, 13, array['Gold Lane']);
  perform pg_temp.player('demo_chou',   'mobile-legends', 0.50, 'SEA', 3::smallint, array['Flex Player','Chill','Positive Mental Attitude'], 4.5, 9, array['EXP Lane']);
  perform pg_temp.player('demo_estes',  'mobile-legends', 0.40, 'SEA', 2::smallint, array['Positive Mental Attitude','Chill','Flex Player'], 4.8, 26, array['Roam']);
  perform pg_temp.player('demo_fanny',  'mobile-legends', 0.60, 'SEA', 4::smallint, array['Shot Caller','Flex Player','Never Surrender'], 2.0, 12, array['Jungle']);
  perform pg_temp.player('demo_saber',  'mobile-legends', 0.58, 'SEA', 4::smallint, array['Never Surrender','Chill','Flex Player'], 1.6, 8, array['Jungle']);

  l := pg_temp.lobby('demo_lylia', 'classic', 'Classic Santai',
    'Main santai, yang penting seru.',
    1::smallint, array['Chill','Positive Mental Attitude'], null, null, 5, 15);
  perform pg_temp.member(l, 'demo_tigreal');

  l := pg_temp.lobby('demo_ling', 'ranked', 'Push Mythic',
    'Ranked serius, ikuti call, jangan tilt.',
    5::smallint, array['Shot Caller','Never Surrender'], 0.65, null, 5, 10, array['Roam','Mid Lane']);
  perform pg_temp.member(l, 'demo_beatrix');

  perform pg_temp.lobby('demo_chou', 'brawl', 'Brawl Seimbang',
    'Serius pas main, santai di luar.',
    3::smallint, array[]::text[], null, null, 5, 26);

  perform pg_temp.lobby('demo_estes', 'ranked', 'Epic ke Legend',
    'Rank range sempit supaya bisa satu party.',
    2::smallint, array['Positive Mental Attitude','Flex Player'], 0.35, 0.50, 5, 21, array['Gold Lane']);

  l := pg_temp.lobby('demo_fanny', 'classic', 'Malam Classic',
    'Classic sampai ngantuk.',
    4::smallint, array['Shot Caller','Flex Player'], null, null, 5, 4);
  perform pg_temp.member(l, 'demo_saber');

  -- ── 5. PUBG Mobile (no roles) ─────────────────────────────────────────
  perform pg_temp.player('demo_shroud', 'pubg-mobile', 0.80, 'SEA', 5::smallint, array['Shot Caller','Never Surrender','Flex Player'], 4.4, 17);
  perform pg_temp.player('demo_jonathan','pubg-mobile', 0.82, 'SEA', 5::smallint, array['Never Surrender','Shot Caller','Positive Mental Attitude'], 4.2, 12);
  perform pg_temp.player('demo_mortal', 'pubg-mobile', 0.30, 'SEA', 1::smallint, array['Chill','Positive Mental Attitude','Flex Player'], 4.7, 23);
  perform pg_temp.player('demo_scout',  'pubg-mobile', 0.28, 'SEA', 1::smallint, array['Chill','Flex Player','Never Surrender'], 0, 0);
  perform pg_temp.player('demo_ryzen',  'pubg-mobile', 0.50, 'SEA', 3::smallint, array['Flex Player','Chill','Positive Mental Attitude'], 4.3, 8);
  perform pg_temp.player('demo_luxxy',  'pubg-mobile', 0.40, 'SEA', 2::smallint, array['Positive Mental Attitude','Chill','Shot Caller'], 4.9, 29);
  perform pg_temp.player('demo_zgod',   'pubg-mobile', 0.60, 'SEA', 4::smallint, array['Shot Caller','Flex Player','Never Surrender'], 2.1, 10);
  perform pg_temp.player('demo_clutch', 'pubg-mobile', 0.62, 'SEA', 4::smallint, array['Never Surrender','Chill','Flex Player'], 1.5, 7);

  l := pg_temp.lobby('demo_mortal', 'classic-squad', 'Squad Santai',
    'Drop di mana saja, yang penting chicken dinner atau ketawa.',
    1::smallint, array['Chill'], null, null, 4, 13);
  perform pg_temp.member(l, 'demo_scout');

  l := pg_temp.lobby('demo_shroud', 'ranked-squad', 'Conqueror Squad',
    'Ranked squad, rotasi rapi, call jelas.',
    5::smallint, array['Shot Caller','Never Surrender'], 0.70, null, 4, 11);
  perform pg_temp.member(l, 'demo_jonathan');

  perform pg_temp.lobby('demo_ryzen', 'team-deathmatch', 'TDM Seimbang',
    'Latihan aim, serius tapi santai.',
    3::smallint, array[]::text[], null, null, 4, 23);

  perform pg_temp.lobby('demo_luxxy', 'ranked-duo', 'Duo Naik Ace',
    'Cari partner duo yang sabar.',
    2::smallint, array['Positive Mental Attitude'], 0.35, 0.50, 2, 19);

  l := pg_temp.lobby('demo_zgod', 'classic-squad', 'Squad Malam',
    'Main sampai pagi.',
    4::smallint, array['Shot Caller','Never Surrender','Flex Player'], null, null, 4, 3);
  perform pg_temp.member(l, 'demo_clutch');

  -- ── 6. Free Fire (no roles) ───────────────────────────────────────────
  perform pg_temp.player('demo_alok',   'free-fire', 0.80, 'SEA', 5::smallint, array['Shot Caller','Never Surrender','Flex Player'], 4.5, 16);
  perform pg_temp.player('demo_kelly',  'free-fire', 0.78, 'SEA', 5::smallint, array['Never Surrender','Shot Caller','Positive Mental Attitude'], 4.0, 10);
  perform pg_temp.player('demo_moco',   'free-fire', 0.30, 'SEA', 1::smallint, array['Chill','Positive Mental Attitude','Flex Player'], 4.8, 24);
  perform pg_temp.player('demo_andrew', 'free-fire', 0.25, 'SEA', 1::smallint, array['Chill','Flex Player','Never Surrender'], 0, 0);
  perform pg_temp.player('demo_hayato', 'free-fire', 0.50, 'SEA', 3::smallint, array['Flex Player','Chill','Positive Mental Attitude'], 4.2, 9);
  perform pg_temp.player('demo_laura',  'free-fire', 0.40, 'SEA', 2::smallint, array['Positive Mental Attitude','Chill','Shot Caller'], 4.6, 18);
  perform pg_temp.player('demo_wukong', 'free-fire', 0.60, 'SEA', 4::smallint, array['Shot Caller','Flex Player','Never Surrender'], 2.3, 11);
  perform pg_temp.player('demo_jota',   'free-fire', 0.62, 'SEA', 4::smallint, array['Never Surrender','Chill','Flex Player'], 1.4, 6);

  l := pg_temp.lobby('demo_moco', 'clash-squad', 'Clash Squad Santai',
    'Main santai, no toxic.',
    1::smallint, array['Chill','Positive Mental Attitude'], null, null, 4, 17);
  perform pg_temp.member(l, 'demo_andrew');

  l := pg_temp.lobby('demo_alok', 'br-ranked-squad', 'Grandmaster Push',
    'Ranked serius, harus ikut call.',
    5::smallint, array['Shot Caller','Never Surrender'], null, null, 4, 9);
  perform pg_temp.member(l, 'demo_kelly');

  perform pg_temp.lobby('demo_hayato', 'br-squad', 'BR Seimbang',
    'Serius waktu fight, santai waktu loot.',
    3::smallint, array[]::text[], null, null, 4, 27);

  perform pg_temp.lobby('demo_laura', 'br-ranked-duo', 'Duo Heroic',
    'Cari duo yang sabar dan komunikatif.',
    2::smallint, array['Positive Mental Attitude','Shot Caller'], 0.35, 0.50, 2, 20);

  l := pg_temp.lobby('demo_wukong', 'br-squad', 'Squad Begadang',
    'Main sampai subuh.',
    4::smallint, array['Shot Caller','Flex Player'], null, null, 4, 5);
  perform pg_temp.member(l, 'demo_jota');

  -- ── 7. you ────────────────────────────────────────────────────────────
  select id into me from public.profiles where username = me_username;
  if me is null then
    raise notice 'No player named % found. The demo players and lobbies were made, but nothing involving you.', me_username;
  else
    perform pg_temp.pending(
      (select id from public.lobby where name = 'Chill Unrated Night'),
      me_username, 'Hi! Happy to fill any role, I have a mic.');

    -- Your newest open lobby gets the applicants. None? Make a small one.
    select id into my_lobby
    from public.lobby
    where leader_id = me and status in ('open', 'scheduled')
    order by created_at desc limit 1;

    if my_lobby is null then
      insert into public.lobby (
        leader_id, game_id, mode_id, name, description, region, languages, mic_required,
        tags, capacity, status, starts_at, ends_at, playstyle
      )
      select me, g.id, m.id, 'My Demo Lobby',
        'A lobby made by the demo script so you have something to manage.',
        'AP', array['English'], false, array['Chill'], 5, 'scheduled',
        tomorrow_8pm, tomorrow_8pm + interval '3 hours', 3
      from public.game g
      join public.game_modes m on m.game_id = g.id and m.value = 'unrated'
      where g.slug = 'valorant'
      returning id into my_lobby;
    end if;

    -- Two free applicants, and one who is already in another live lobby.
    perform pg_temp.pending(my_lobby, 'demo_fade', 'Looking for a chill group to learn with.');
    perform pg_temp.pending(my_lobby, 'demo_cypher', 'Sentinel player, happy to swap.');
    perform pg_temp.pending(my_lobby, 'demo_brim', 'Controller main with a mic.');
  end if;

  raise notice 'Demo data ready: % players, % lobbies.',
    (select count(*) from public.profiles where username like 'demo\_%'),
    (select count(*) from public.lobby l2 join public.profiles p on p.id = l2.leader_id where p.username like 'demo\_%');
end
$seed$;
