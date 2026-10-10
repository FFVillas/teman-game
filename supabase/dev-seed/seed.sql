-- DEMO DATA for looking at the app with something in it.
-- NOT a migration: it lives outside supabase/migrations on purpose, and the
-- app never depends on it.
--
-- Run it by hand in the Supabase SQL editor. It is safe to run again: it
-- removes its own earlier data first. To remove everything it made, run
-- cleanup.sql.
--
-- WHAT IT MAKES
--   * 22 fake players (username demo_xxx, email xxx@demo.temangame.test) with
--     ranks and roles in Valorant and League of Legends. They have no
--     password, so nobody can log in as them.
--   * 9 lobbies in different states: recruiting with a rank range, open to
--     anyone, scheduled for later, completely full.
--   * If you put YOUR username below, the demo adds you as a pending
--     applicant to one lobby and gives YOUR newest open lobby three pending
--     applicants (one of them already in another lobby, so accepting that one
--     shows the "already in a live lobby" error). If you lead no open lobby it
--     makes you a small scheduled one first. Your bell then has real requests.
--
-- WHO SEES IT: everyone who uses this same database, including teammates. The
-- names are obviously fake on purpose. Run cleanup.sql when you are done.
--
-- Written against the lobby migrations up to 20261011000000. The chat lines are
-- only added when that last migration (lobby chat) has been run.

-- ── helpers (temporary: they vanish when the session ends) ─────────────
-- A player: an auth user without a password (the signup trigger makes the
-- profile), plus their rank and roles in one game. Called again for a second
-- game, it only adds that game.
create or replace function pg_temp.player(
  p_name text, p_game text, p_rank text, p_region text, p_roles text[]
) returns uuid
language plpgsql
as $$
declare
  v_id uuid;
  v_game smallint;
  v_rank smallint;
  v_tags text[] := array['Shot Caller','Positive Mental Attitude','Chill','Never Surrender','Flex Player'];
  v_seed integer := abs(hashtext(p_name));
begin
  select id into v_id from public.profiles where username = p_name;
  if v_id is null then
    v_id := gen_random_uuid();
    insert into auth.users (id, aud, role, email, raw_user_meta_data, raw_app_meta_data, created_at, updated_at)
    values (
      v_id, 'authenticated', 'authenticated', p_name || '@demo.temangame.test',
      jsonb_build_object('username', p_name),
      '{"provider":"email","providers":["email"]}'::jsonb, now(), now()
    );
    update public.profiles
    set playstyle = 1 + v_seed % 5,
        personality_tags = array[v_tags[1 + v_seed % 5], v_tags[1 + (v_seed / 5) % 5]],
        languages = array['Indonesian', 'English']
    where id = v_id;
  end if;

  select id into v_game from public.games where slug = p_game;
  select r.id into v_rank from public.game_ranks r where r.game_id = v_game and r.name = p_rank;
  if v_rank is null then
    raise exception 'unknown rank "%" in %', p_rank, p_game;
  end if;

  insert into public.user_game_mapping (user_id, game_id, in_game_name, region, rank_id)
  values (v_id, v_game, p_name, p_region, v_rank)
  on conflict (user_id, game_id) do update set rank_id = excluded.rank_id;

  insert into public.user_game_roles (user_id, game_id, role_id)
  select v_id, v_game, r.id from public.game_roles r
  where r.game_id = v_game and r.name = any (p_roles)
  on conflict do nothing;

  return v_id;
end;
$$;

-- A lobby, written directly (the app goes through create_lobby; a seed has no
-- signed-in user to do that as). Rank names are looked up, so a typo fails
-- loudly instead of making a lobby with no range.
create or replace function pg_temp.lobby(
  p_leader text, p_game text, p_mode text, p_name text, p_description text,
  p_region text, p_languages text[], p_mic boolean, p_tags text[], p_capacity integer,
  p_status text, p_starts timestamptz, p_ends timestamptz,
  p_min_rank text, p_max_rank text, p_cover text, p_roles text[], p_minutes_ago integer
) returns uuid
language plpgsql
as $$
declare
  v_game smallint;
  v_mode smallint;
  v_min smallint;
  v_max smallint;
  v_id uuid;
begin
  select id into v_game from public.games where slug = p_game;
  select id into v_mode from public.game_modes where game_id = v_game and value = p_mode;
  if v_mode is null then
    raise exception 'unknown mode "%" in %', p_mode, p_game;
  end if;
  if p_min_rank is not null then
    select id into v_min from public.game_ranks where game_id = v_game and name = p_min_rank;
    if v_min is null then raise exception 'unknown rank "%"', p_min_rank; end if;
  end if;
  if p_max_rank is not null then
    select id into v_max from public.game_ranks where game_id = v_game and name = p_max_rank;
    if v_max is null then raise exception 'unknown rank "%"', p_max_rank; end if;
  end if;

  insert into public.lobbies (
    leader_id, game_id, mode_id, name, description, region, languages, mic_required,
    tags, capacity, status, starts_at, ends_at, min_rank_id, max_rank_id, cover, created_at
  ) values (
    (select id from public.profiles where username = p_leader), v_game, v_mode, p_name,
    p_description, p_region, p_languages, p_mic, p_tags, p_capacity, p_status, p_starts, p_ends,
    v_min, v_max, p_cover, now() - make_interval(mins => p_minutes_ago)
  ) returning id into v_id;

  insert into public.lobby_roles (lobby_id, game_id, role_id)
  select v_id, v_game, r.id from public.game_roles r
  where r.game_id = v_game and r.name = any (p_roles);

  return v_id;
end;
$$;

-- Someone already accepted into a lobby.
create or replace function pg_temp.member(p_lobby uuid, p_username text, p_role text)
returns void
language plpgsql
as $$
declare
  v_game smallint;
begin
  select game_id into v_game from public.lobbies where id = p_lobby;
  insert into public.applications (lobby_id, game_id, applicant_id, role_id, status, decided_at, joined_at)
  values (
    p_lobby, v_game, (select id from public.profiles where username = p_username),
    (select id from public.game_roles where game_id = v_game and name = p_role),
    'accepted', now(), now()
  );
end;
$$;

-- An application waiting for an answer. Inserting it fires the real trigger,
-- so the leader's bell gets a real join request.
create or replace function pg_temp.pending(p_lobby uuid, p_username text, p_role text, p_message text)
returns void
language plpgsql
as $$
declare
  v_game smallint;
begin
  select game_id into v_game from public.lobbies where id = p_lobby;
  insert into public.applications (lobby_id, game_id, applicant_id, role_id, message, status)
  values (
    p_lobby, v_game, (select id from public.profiles where username = p_username),
    (select id from public.game_roles where game_id = v_game and name = p_role),
    p_message, 'pending'
  );
end;
$$;

-- A chat line, dated a few minutes ago.
create or replace function pg_temp.say(
  p_lobby uuid, p_username text, p_body text, p_minutes_ago integer
) returns void
language plpgsql
as $$
begin
  insert into public.lobby_messages (lobby_id, sender_id, body, created_at)
  values (
    p_lobby, (select id from public.profiles where username = p_username),
    p_body, now() - make_interval(mins => p_minutes_ago)
  );
end;
$$;

do $seed$
declare
  -- Your own username (the one shown on your profile). Leave as is to skip the
  -- parts that involve you.
  me_username constant text := 'YOUR_USERNAME_HERE';

  -- Chat lines need the lobby chat migration.
  chat constant boolean := to_regclass('public.lobby_messages') is not null;

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

  -- ── 1. players ────────────────────────────────────────────────────────
  -- (name, game, rank, region, roles)
  perform pg_temp.player('demo_jett',    'valorant', 'Diamond 2',   'AP', array['Duelist']);
  perform pg_temp.player('demo_sova',    'valorant', 'Diamond 3',   'AP', array['Initiator']);
  perform pg_temp.player('demo_omen',    'valorant', 'Ascendant 1', 'AP', array['Controller']);
  perform pg_temp.player('demo_sage',    'valorant', 'Gold 2',      'AP', array['Sentinel']);
  perform pg_temp.player('demo_kayo',    'valorant', 'Platinum 1',  'AP', array['Initiator']);
  perform pg_temp.player('demo_neon',    'valorant', 'Silver 3',    'AP', array['Duelist']);
  perform pg_temp.player('demo_cypher',  'valorant', 'Silver 2',    'AP', array['Sentinel']);
  perform pg_temp.player('demo_reyna',   'valorant', 'Immortal 1',  'AP', array['Duelist']);
  perform pg_temp.player('demo_brim',    'valorant', 'Bronze 3',    'AP', array['Controller']);
  perform pg_temp.player('demo_fade',    'valorant', 'Gold 1',      'AP', array['Initiator']);
  perform pg_temp.player('demo_viper',   'valorant', 'Platinum 2',  'AP', array['Controller']);
  perform pg_temp.player('demo_raze',    'valorant', 'Gold 3',      'AP', array['Duelist']);
  perform pg_temp.player('demo_phoenix', 'valorant', 'Gold 1',      'AP', array['Duelist']);
  perform pg_temp.player('demo_yoru',    'valorant', 'Platinum 3',  'AP', array['Duelist']);
  perform pg_temp.player('demo_astra',   'valorant', 'Gold 2',      'AP', array['Controller']);

  perform pg_temp.player('demo_ahri',    'league-of-legends', 'Silver I',    'SEA', array['Mid']);
  perform pg_temp.player('demo_yasuo',   'league-of-legends', 'Emerald IV',  'SEA', array['Mid']);
  perform pg_temp.player('demo_lux',     'league-of-legends', 'Gold II',     'SEA', array['Support']);
  perform pg_temp.player('demo_garen',   'league-of-legends', 'Bronze I',    'SEA', array['Top']);
  perform pg_temp.player('demo_kaisa',   'league-of-legends', 'Platinum III','SEA', array['Bot (ADC)']);
  perform pg_temp.player('demo_lee',     'league-of-legends', 'Gold III',    'SEA', array['Jungle']);
  perform pg_temp.player('demo_zed',     'league-of-legends', 'Diamond IV',  'SEA', array['Mid']);

  -- ── 2. Valorant lobbies ───────────────────────────────────────────────
  l := pg_temp.lobby('demo_jett', 'valorant', 'competitive', 'Radiant Grind',
    'Climbing to Radiant this act. We play clean, communicate a lot, and don''t tilt after a bad round.',
    'AP', array['English','Indonesian'], true, array['Competitive','Voice Comms'], 5, 'live', null, null,
    'Diamond 1', 'Immortal 3', 'valorant/1', array['Controller','Sentinel'], 25);
  perform pg_temp.member(l, 'demo_sova', 'Initiator');
  perform pg_temp.member(l, 'demo_omen', 'Controller');
  if chat then
    perform pg_temp.say(l, 'demo_jett', 'Warm up in 10 minutes, anyone want to practise lineups first?', 42);
    perform pg_temp.say(l, 'demo_sova', 'I can do recon darts on Ascent.', 38);
    perform pg_temp.say(l, 'demo_omen', 'Smokes ready. Queue whenever you are.', 35);
  end if;

  l := pg_temp.lobby('demo_neon', 'valorant', 'unrated', 'Chill Unrated Night',
    'No pressure, good vibes, some laughs and the occasional clutch. All ranks welcome.',
    'AP', array['Indonesian'], false, array['Chill'], 5, 'live', null, null,
    null, null, 'valorant/2', array[]::text[], 18);
  perform pg_temp.member(l, 'demo_brim', 'Controller');
  perform pg_temp.member(l, 'demo_fade', 'Initiator');
  if chat then
    perform pg_temp.say(l, 'demo_neon', 'Welcome! No pressure tonight, just have fun.', 27);
    perform pg_temp.say(l, 'demo_brim', 'Can I play Controller?', 25);
    perform pg_temp.say(l, 'demo_neon', 'Of course. We need one more for 4 stack.', 24);
  end if;
  if exists (select 1 from public.profiles where username = me_username) then
    perform pg_temp.pending(l, me_username, null, 'Hi! Happy to fill any role, I have a mic.');
  end if;

  l := pg_temp.lobby('demo_cypher', 'valorant', 'competitive', 'Silver to Gold Climb',
    'Learning the game together. Calm comms, no flaming.',
    'AP', array['English'], true, array['Competitive','Chill'], 4, 'live', null, null,
    'Silver 1', 'Gold 3', 'valorant/3', array['Duelist','Initiator'], 12);
  perform pg_temp.member(l, 'demo_sage', 'Sentinel');

  perform pg_temp.lobby('demo_reyna', 'valorant', 'premier', 'Premier Scrims',
    'Practising for Premier. Please be on time and bring your own agents list.',
    'AP', array['English'], true, array['Competitive','Tactical'], 5, 'scheduled', tomorrow_8pm, tomorrow_8pm + interval '3 hours',
    'Ascendant 1', 'Radiant', 'valorant/4', array['Controller','Sentinel','Initiator'], 6);

  l := pg_temp.lobby('demo_kayo', 'valorant', 'spike-rush', 'Spike Rush Full House',
    'Quick games between ranked. This one is already full.',
    'AP', array['Indonesian'], false, array['Chill'], 3, 'live', null, null,
    null, null, 'valorant/1', array[]::text[], 9);
  perform pg_temp.member(l, 'demo_viper', 'Controller');
  perform pg_temp.member(l, 'demo_raze', 'Duelist');

  -- ── 3. League of Legends lobbies ──────────────────────────────────────
  perform pg_temp.lobby('demo_ahri', 'league-of-legends', 'ranked-solo-duo', 'Duo Queue to Gold',
    'Looking for a duo partner, ideally a jungler. Bronze to Gold.',
    'SEA', array['English'], true, array['Competitive'], 2, 'live', null, null,
    'Bronze IV', 'Gold I', 'league-of-legends/1', array['Jungle'], 22);

  l := pg_temp.lobby('demo_lux', 'league-of-legends', 'aram-mayhem', 'ARAM Mayhem Night',
    'Pure chaos, zero stakes. Join for the augments.',
    'SEA', array['Indonesian','English'], false, array['Chill'], 5, 'live', null, null,
    null, null, 'league-of-legends/2', array[]::text[], 14);
  perform pg_temp.member(l, 'demo_garen', 'Top');
  perform pg_temp.member(l, 'demo_lee', 'Jungle');
  if chat then
    perform pg_temp.say(l, 'demo_lux', 'Mayhem is up, who has the best augment build?', 15);
    perform pg_temp.say(l, 'demo_garen', 'Spin to win.', 14);
  end if;

  l := pg_temp.lobby('demo_yasuo', 'league-of-legends', 'ranked-flex', 'Emerald Flex Stack',
    'Flex stack with a shot caller. Emerald to Master only.',
    'SEA', array['English'], true, array['Competitive','Voice Comms'], 5, 'live', null, null,
    'Emerald IV', 'Master', 'league-of-legends/3', array['Top','Jungle'], 8);
  perform pg_temp.member(l, 'demo_zed', 'Mid');

  perform pg_temp.lobby('demo_kaisa', 'league-of-legends', 'normal-draft', 'Late Night Normals',
    'Normals after work. Relaxed and friendly.',
    'SEA', array['Indonesian'], false, array['Chill'], 5, 'scheduled', now() + interval '3 hours', now() + interval '6 hours',
    null, null, 'league-of-legends/4', array['Support'], 4);

  -- ── 4. you ────────────────────────────────────────────────────────────
  select id into me from public.profiles where username = me_username;
  if me is null then
    raise notice 'No player named % found. The demo players and lobbies were made, but nothing involving you.', me_username;
  else
    -- Your newest open lobby gets the applicants. None? Make a small one.
    select id into my_lobby
    from public.lobbies
    where leader_id = me and status in ('live', 'scheduled')
    order by created_at desc limit 1;

    if my_lobby is null then
      my_lobby := pg_temp.lobby(me_username, 'valorant', 'unrated', 'My Demo Lobby',
        'A lobby made by the demo script so you have something to manage.',
        'AP', array['English'], false, array['Chill'], 5, 'scheduled', tomorrow_8pm, tomorrow_8pm + interval '3 hours',
        null, null, 'valorant/2', array[]::text[], 3);
    end if;

    -- Two free applicants, and one who is already in another live lobby.
    perform pg_temp.pending(my_lobby, 'demo_phoenix', 'Duelist', 'Duelist main with a mic. Can start any time.');
    perform pg_temp.pending(my_lobby, 'demo_yoru',    'Duelist', 'Looking for a chill group to learn with.');
    perform pg_temp.pending(my_lobby, 'demo_sage',    'Sentinel', 'Sentinel player, happy to swap.');
    perform pg_temp.member(my_lobby, 'demo_astra', 'Controller');
    if chat then
      perform pg_temp.say(my_lobby, 'demo_astra', 'Hi! Excited to play with you.', 5);
    end if;
  end if;

  raise notice 'Demo data ready: % players, % lobbies.',
    (select count(*) from public.profiles where username like 'demo\_%'),
    (select count(*) from public.lobbies l2 join public.profiles p on p.id = l2.leader_id where p.username like 'demo\_%' or p.id = me);
end
$seed$;
