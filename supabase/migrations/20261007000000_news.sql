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
