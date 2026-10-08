# TemanGame — Thesis Spec

Condensed from the skripsi proposal (BAB 1–3). This is the authoritative
spec for what the app must eventually do — the code is currently a
frontend shell, so much of what follows is **not built yet**. Read the
"Spec vs. code" table at the bottom before assuming a feature exists.

Full title: *TemanGame: Peningkatan Konektivitas Sosial dalam Gim
Kompetitif melalui Platform Looking-For-Group (LFG) Berbasis Reputasi.*
BINUS University, 2026. Topic area: Advanced Software Engineering.

## The problem

In-game matchmaking (SBMM) optimizes for skill balance alone and ignores
the social dimension — which is what actually drives toxicity and churn.
Existing alternatives each miss something: Discord has community but no
behavior record, GameTree is a personality catalog that hands users back
to Discord, Lita is paid companion-hire. The gap is a centralized LFG
platform where players self-select teammates *and* are protected by an
integrated reputation system.

## What the research says the app needs

From a 58-respondent questionnaire:

- Playstyle match (79.3%) and low-toxicity attitude (60.3%) rank above
  raw skill (46.6%) → playstyle and reputation are primary filters, not
  nice-to-haves.
- Negative behavior experienced: AFK 89.7%, flaming 70.7%, trolling
  62.1%, verbal abuse 58.6%.
- 77.6% play on more than one device → PWA over native.
- 53.4% play <5 hrs/week → target user is casual/mid intensity, wants
  fast flexible grouping, not a permanent roster.
- 63.8% prefer voice comms on Discord → lobbies need a Discord link
  field.

## Scope

Six competitive games, chosen for high team-coordination dependency:

| Platform | Games |
| --- | --- |
| PC | Valorant, League of Legends, Counter-Strike 2 |
| Mobile | Mobile Legends, PUBG Mobile, Free Fire |

Target user: casual-to-mid players, ≤15 hrs/week.

## Recommendation engine

The core contribution. A **transparent weighted formula**, deliberately
chosen over a neural model so the ranking stays explainable — that
explainability is itself part of the thesis argument. Lobbies are hard
filtered by game first, then ranked by:

```
S_total = (0.40·P + 0.30·R + 0.30·T) × M_rank
M_rank  = max(0.30, 1 − (ΔR / 10 × 0.70))
```

The weights (0.40/0.30/0.30) are typed as plain text in the proposal's
Persamaan 3.1, not locked in an image — confirmed 2026-09-19 by extracting
`word/document.xml` from the docx directly. An earlier version of this
doc hedged on this; that hedge was wrong and is now removed.

`S_total` lands in 0.00–1.00. Components:

| Sym | Meaning | Formula |
| --- | --- | --- |
| `P` | Playstyle proximity | `1 − |P_a − P_b| / 4` over a 1–5 Likert scale ("Sangat Kasual" → "Sangat Kompetitif"). Identical = 1.00; 5-vs-1 = 0.00. |
| `R` | Reputation | `avg_stars / 5`. A 5.0 player contributes 1.00; a 1.5 player contributes 0.30. |
| `T` | Personality tag match | `|A ∩ B| / |B|`, where A = applicant's tags, B = tags the lobby asks for (max 3). **Edge case `|B| = 0`: `T = 1`** — this is *our* interpretation to avoid a divide-by-zero, not something the proposal states; flag it to the examiner as an implementation decision if asked. |
| `M_rank` | Rank distance penalty | See below. |

**`M_rank` reconstructed formula** (Persamaan 3.5 is an embedded equation
image, not extractable as text — this is inferred from the surrounding
prose, which *is* text, so it's a high-confidence reconstruction, not a
guess, but worth eyeballing against the actual rendered equation once):

```
M_rank = max(0.30, 1 − 0.07 × ΔR)
```

i.e. linear decay starting at 1.00 (ΔR = 0), reaching the 0.30 floor
exactly at ΔR = 10 sub-ranks, clamped at 0.30 beyond that (never 0 or
negative). `ΔR` needs a fully-ordered numeric sub-rank ladder to compute
— see the rank-ladder gap noted below; this is the formula that gap
blocks.

Personality tags: Shot Caller, PMA (Positive Mental Attitude), Chill,
Never Surrender, Flex Player.

Implemented in the frontend as `src/lib/recommendation.ts` (mock data for
now); ΔR is measured in Valorant divisions (Iron 1 = 0 … Radiant = 24), so
the ordered ladder exists in code for Valorant — what's still missing is the
`game_ranks` table that will hold it for every game. The weights are plain
text in the proposal, as noted above; only the `M_rank` equation is an image.

Computed server-side; the client receives a pre-sorted lobby list.

## Target stack

Present in the repo today: Next.js, React, TypeScript, Tailwind.
Everything below is specified but **not yet present**:

- **PWA** — service worker (cache + push interception) and web app
  manifest (installable, home screen).
- **Supabase** — PostgreSQL, Auth, and Row Level Security. RLS is what
  enforces that profile/report data is only readable by authorized
  parties, so it is a spec requirement, not an implementation detail.
- **Node.js + TypeScript** backend for the scoring logic.
- **Firebase Cloud Messaging** for push (join invites, application
  decisions), delivered through the service worker.
- **Discord API** (optional) for auto-generated voice-coordination links
  in lobbies.

SDLC model is **Waterfall**; design approach is OOP, mapped from the UML
class diagram.

## Data model

Thirteen entities across four domains:

- **User & access** — `user`, `role`, `user_role_mapping`,
  `connected_accounts` (third-party links: Discord, Steam)
- **Matchmaking & lobby** — `lobby`, `game`, `applications`,
  `user_game_mapping` (per-game rank + favorite role)
- **Social** — `friendships` (recursive: requester/receiver),
  `direct_messages`, `lobby_messages`
- **Reputation & moderation** — `reviews`, `reports`

Notes: `user` and `lobby` use UUID primary keys; `game` and `role` use
integer. `reviews.reviewer_weight` freezes the weighting at submission
time so historical scores stay reproducible. `Review` and `Report` are
deliberately separate — a review feeds the score, a report opens a
moderation ticket for an admin.

Two actors: **User** and **Admin** (moderation, sanctions, bans).

## Divergences from the proposal (bring these to your advisor)

The running index of all divergences, including behaviour and rules, is
[`thesis-divergences.md`](thesis-divergences.md). The arguments for the
data-model ones are below.

Real schema work started 2026-09-19. Four deliberate departures from the
ERD as written — both decided in favor of standard practice over what
the proposal originally specified. Not gaps: each is a considered
substitution, argued below.

1. **Admin identity is not `role` + `user_role_mapping`.** The proposal
   models admin as a permission a user account can hold. The actual
   schema (`supabase/migrations/20260919000100_admin_roles.sql`) instead
   gives admins their own `admins` table, completely independent of
   `profiles` — a compromised or self-reported player account can never
   carry moderation power. This is the same separation real platforms
   use between end-user accounts and internal staff tooling.
   `role`/`user_role_mapping` are not built, on purpose. **Live** as of
   2026-09-19 — prioritized ahead of the rest of the moderation schema
   because Login/Profile needs it (same `/login`, role decides where you
   land).
2. **Four entities beyond the original 13**: `admins` (above), plus
   `sanctions`, `sanction_reports` (join table — one decision can close
   several reports), and `admin_actions` (append-only audit log) in
   `supabase/migrations/20260919000200_reports_moderation.sql` — written
   but **not run yet**, deferred until the report feature is actually
   being built. Once it is, `reports` itself will carry
   `status`/`assigned_to`/`resolution_*`/`sanction_id` — arguably
   *detailing* the proposal's own reports entity ("status penanganan
   tiket... catatan resolusi dari administrator") rather than inventing
   a new one, but worth being explicit that the data dictionary as
   submitted doesn't show these columns.
3. **Profile data the UI needs (2026-10-03).** `profiles` carries
   `gender`, `languages` (a list picked from a dropdown) and a structured
   play schedule — `play_days`, `play_start`, `play_end`, `timezone` —
   instead of a free-text availability field (migrations
   `20261003000000_profiles_dossier.sql` and
   `20261003000100_profiles_schedule_languages.sql`). The schedule is structured so
   the "schedule overlap" filter can be computed later. The profile screen
   shows these as a player dossier — check them against the data
   dictionary's user entity and add any that are missing. Age comes from a **date of
   birth** (never a stored age, which goes stale), kept in a separate
   private table `profile_private` because `profiles` is publicly
   readable; everyone else only gets the derived age via `profile_age()`.
   A database trigger enforces the 13+ minimum. This is one more table
   than the proposal's ERD. **`region` is not on `profiles`** — it is per
   game, so it lives on `user_game_mapping`. Profile pictures are files in
   Supabase Storage (bucket `avatars`); `profiles.avatar_path` holds the path
   rather than a URL, so the owner can't point it at an arbitrary external
   address (`20261004000000_avatars.sql`).
4. **Games slice (2026-10-03,
   `supabase/migrations/20261003000200_games.sql`).** Three tables beyond
   the proposal: `game_ranks` (every rank gets an `ordinal` position, so the
   rank-distance penalty `M_rank` can compute ΔR as a subtraction),
   `game_roles` and `user_game_roles`. The proposal's `user_game_mapping`
   stores a single "favorite role" per game; onboarding lets a player pick
   several, so roles are a join table instead. The proposal's `role` means
   an account permission, so in-game roles are named `game_roles` to avoid
   confusion. In-game roles exist only for games that define them (Valorant,
   League of Legends, Mobile Legends); Counter-Strike 2, PUBG Mobile and Free
   Fire have none, so `user_game_roles` has no rows there. All six in-scope
   games are seeded; the ladders and roles were researched from web sources
   (see `docs/game-reference.md`) and still need checking against the games.
   Region is stored as text on `user_game_mapping` with the per-game choices
   kept in the app, not as a table. Game modes (Classic, Ranked, ARAM…) are
   likewise an app-side list for now; a lobby will need to point at a mode, at
   which point a `game_modes` table (and possibly `game_regions`) is the
   natural move, taking the table count to 20 or 21. When lobbies are stored,
   a lobby will also need an **optional accepted rank range** (lowest and
   highest rank the leader allows, both nullable) beside the leader's own rank
   that the proposal's `M_rank` already uses; the range is an eligibility
   filter, `M_rank` stays the ordering. This is two extra columns on `lobby`,
   not a new table. Counter-Strike 2 models only its 18-rank Competitive
   ladder, not the numeric Premier rating.

5. **Notifications (2026-10-06,
   `supabase/migrations/20261006000000_notifications.sql`).** One more table
   beyond the ERD, which has no entity for notifications at all — yet
   requirement 5 of §3.2.4 ("Sistem Notifikasi Real-time") and the sequence
   diagrams on p.59 (apply → notify leader → decision → notify applicant)
   both depend on them. Frame it like `sanctions`: detailing a behaviour the
   proposal already specifies rather than inventing a feature. Current limit
   worth stating in BAB 4: the insert policy only allows rows addressed to
   yourself, so genuine cross-player notifications wait on a server-side
   trigger that arrives with the Lobby slice.

Net effect: 13 → 20 distinct tables once the rest of the model is built
(13 original, minus `user`/`role`/`user_role_mapping` reshaped into
`profiles` + `admins` = 12; plus `profile_private` = 13; plus
`sanctions`/`sanction_reports`/`admin_actions` = 16; plus `game_ranks`,
`game_roles` and `user_game_roles` = 19). An earlier version of this
paragraph said 17 — that was a miscount. If your
proposal can still be revised, this is the number and reasoning to bring
to your advisor — if it can't, this doc is the record of what changed
and why for your BAB 4 writeup.

Design context for the admin console generally: [`admin-console.md`](admin-console.md).

## Evaluation plan

1. **UAT** — end-user sign-off against the original requirements.
2. **Black-box testing** — input/output validation per function.
3. **Non-functional** — performance, reliability, efficiency, stability.
4. **Matching accuracy** — derived from post-session ratings: high
   ratings on system-matched lobbies indicate good matching, low ratings
   indicate poor matching. Note this metric is *reused* from the
   reputation data rather than measured independently.

## Spec vs. code

Where the implementation currently stands. Nothing here is a defect —
the code is at UI-shell stage while the spec describes the full system.

| Spec | Code today |
| --- | --- |
| 6 games | only `lfg/valorant`; all 6 `nav-links.ts` entries point there |
| Lobbies ranked by `S_total` | "Recommended Teams" is a static label; `lfgTeams` renders in array order. The formula **is** implemented (`lib/recommendation.ts`) and drives the leader's Invite players panel; the lobby list and the applicants' `matchScore` don't use it yet |
| Reputation (stars, sanctions, tags) | no reputation field on `LfgTeam` |
| `game` + `user_game_mapping` | **built** (`20261003000200_games.sql`, with `game_ranks`, `game_roles`, `user_game_roles`) — profile tabs, onboarding and the edit form all read/write it. Rank and role are self-reported picks from the ladder; no game API integration |
| Playstyle 1–5 Likert | closest is free-text `vibeTags` in the create form |
| Personality tags | not modeled |
| PWA (service worker, manifest, FCM) | none present — notifications exist as rows and are read on page load, but nothing is pushed |
| `direct_messages` | **built** (`20261007000000_direct_messages.sql`) — exactly the ERD entity; `/messages` reads and writes it |
| `lobby_messages` | not built — waits on the `lobbies` table; lobby chat still runs on a sessionStorage stand-in |
| Settings screen | `/settings` built on Supabase Auth alone (email, password, logout); no new table |
| Notifications (§3.2.4 req. 5) | table + UI built; cross-player inserts still need a server-side trigger, since RLS only allows self-addressed rows |
| Supabase + Auth + RLS | `profiles` table + RLS live (Account slice). Everything else still `// TODO` + `router.push` |
| Admin moderation (reports, sanctions, bans) | `admins` + `is_admin()` live (see divergences above); `reports`/`sanctions`/`sanction_reports`/`admin_actions` written but not run — deferred until the report feature is built. `/admin` console itself still runs on mock data; `AdminGate` is still a client-side check, not yet wired to real auth/RLS; players aren't notified of sanctions yet |
| Rank/role/region filtering | `LfgToolbar` has a hardcoded `resultCount={128}`; `SortDropdown` not wired |

**Terminology drift:** the proposal says **lobby**, the code says
**team** (`LfgTeam`, `lfg-teams.ts`). Same concept. Worth unifying
before the backend lands.

**Rank ladder:** `lfg-ranks.ts` still holds only 4 Valorant ranks (for
icons). The full ordered ladder used for `ΔR` (Iron 1 … Radiant) lives in
`rankOrdinal()` in `src/lib/recommendation.ts`; lobbies and candidates
carry a division alongside their rank.

## Source material

- Proposal PDF — held by the team, not in this repo. Contains the
  figures (ERD, class/activity/sequence diagrams, data dictionaries,
  and the Persamaan 3.1 weights) as images.
- Figma `CQg1F1t0GJh5BmiDacwNvC` — holds both the UI design and the UML
  diagrams. See `AGENTS.md` for the node map.
