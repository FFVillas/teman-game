# TemanGame — Agent Notes

Mostly frontend on mock data; the backend is being added in small vertical
slices on Supabase — Auth, `profiles` and `admins` are real, everything else
(lobbies, social, messages, reviews, reports) is still mock.

## What this is

TemanGame is a Looking-For-Group (LFG) platform for competitive games:
players find teammates by role, rank, schedule and playstyle, and are
protected by a reputation system that surfaces behavior history *before*
they group up. It's the implementation for a BINUS undergraduate thesis
(skripsi, 2026), so the written proposal — not this repo — is the
authoritative spec.

**Read [`docs/thesis-spec.md`](docs/thesis-spec.md) before doing feature
work.** It covers the recommendation-engine formula, the 13-entity data
model, the target stack (PWA + Supabase + FCM), and — importantly — a
table of what's specified but not yet built. The current code is a UI
shell on mock data; assume a feature is absent unless you've checked.

**Read [`docs/game-reference.md`](docs/game-reference.md) before touching
games, ranks, roles or regions** — the researched ladders, role lists and
per-game server lists, with confidence marks and an in-game verification
checklist for each game.

**Every place the build departs from the proposal is logged in
[`docs/thesis-divergences.md`](docs/thesis-divergences.md).** Add a row there
whenever you add a table, change a rule or drop something the proposal
specifies.

Two conventions that matter when extending it: the spec says **lobby**
where the code says **team** (`LfgTeam`), and only Valorant is built out
of the six games in scope.

## Stack

- Next.js 16 (App Router), React 19, TypeScript 5
- Tailwind CSS v4 — **CSS-first config, no `tailwind.config.ts`**. Theme
  tokens (colors, fonts) are defined in `src/app/globals.css` via `@theme`.
  Don't hardcode hex colors or font names in components — add a token in
  `globals.css` and use the generated utility (e.g. `bg-brand`,
  `text-text-muted`, `font-heading`) instead.
- Node 22.x
- Path alias: `@/*` → `src/*`

## File structure

```
src/app/                 routes, layout, globals.css (theme tokens live here)
src/app/lfg/<game>/      LFG (find-a-team) page per game, e.g. lfg/valorant
src/app/lfg/<game>/lobby/<id>/  lobby detail — the lobby you're already in
src/app/lfg/<game>/news/, .../news/[slug]/  platform news list + article
src/app/login, /signup   auth screens (wired to AuthContext, see below)
src/app/social/          friends list — layout.tsx holds the shared sidebar
src/app/social/pending, /discover, /recent  the other 3 social sub-pages
src/components/          reusable UI (Navbar, Footer, Logo, GameCard, FeatureCard)
src/components/sections/ landing page sections — composed in app/page.tsx
src/components/lfg/      LFG page UI (LfgHero, LfgToolbar, LfgTeamCard, SortDropdown, LfgPagination, NewsCard)
src/components/lobby/    lobby detail UI (header, members, applications, chat, rating, LobbyActionsMenu)
src/components/social/   friends/pending/discover/recent UI (FriendCard, PlayerCard, dropdowns)
src/components/auth/     auth UI (AuthShell, AuthField, OAuthButtons, AuthPanelCards)
src/contexts/AuthContext.tsx  Supabase session — see "Auth" below
src/lib/supabase/        browser + server Supabase clients; src/proxy.ts refreshes sessions
supabase/migrations/     schema, applied manually in the Supabase SQL editor
src/lib/                 small shared helpers (auth redirect)
src/app/admin/           admin console (overview, reports, players, lobbies, audit-log) — see docs/admin-console.md
src/components/admin/    admin UI (AdminGate, AdminShell, AdminUi primitives, modals, one view per page)
src/contexts/AdminDataContext.tsx  mock moderation API + audit log
src/lib/admin.ts         derived rules: account status, suggested sanction, queue order, credibility
src/data/admin-*.ts      admin accounts, moderation mock data + types, nav/labels
src/app/profile/         me, me/edit, [username], [username]/matches, .../report
src/components/profile/  profile UI (view, edit form, match history, report panel)
src/data/                static content (nav links, games, landing copy, footer links)
src/data/lfg-*.ts        LFG mock data (teams, ranks, roles, lobby)
src/data/social-*.ts     Social page mock data (friends, pending, discover, recent)
src/data/player-profiles.ts  profile mock data; game-regions.ts has the per-game region choices
public/games/            game cover images (landing page)
public/lfg/covers/<game>/  LFG lobby cover images (N.webp)
public/ranks/<game>/     rank badges: Valorant per division (gold-3.webp), LoL per tier
public/roles/<game>/     role icons (see src/data/role-icons.ts)
inbox/                   git-ignored drop folder for raw downloads; compress + rename into public/
                         (sources and rights: docs/image-credits.md)
public/lfg/avatars/      LFG member avatar images — shared identity across the app
                         (e.g. avatar-1.jpg = "Yonziii" everywhere: LFG teams, Social, Navbar)
public/icons/            SVG/PNG icons
```

Keep copy/links/content in `src/data/*.ts`, not inline in JSX — makes it
editable without touching component code.

## Lobby vs. team

`LfgTeam` (`lfg-teams.ts`) is a lobby as it appears in the **discovery
list**; `Lobby` (`lfg-lobby.ts`) is the same entity as seen from
**inside**, with members, applications and messages. The proposal calls
both a "lobby". A user can only be in one live lobby at a time, but may
hold several scheduled ones — hence `activeLobby` plus `scheduledLobbies`.

Your role in a lobby comes **from the data**, the way the backend will
decide it: `viewerRoleIn(lobby, CURRENT_PLAYER_ID)` in `lfg-lobby.ts`
checks `leaderId`, then membership, then `invitedIds`, and the lobby page
404s if none match. The mock player (Fayaz, the account login signs you
into) leads `lobby-1`, is a member of `lobby-2`, and is invited to
`lobby-4`, so all three views are reachable from the LFG page banner. There
is no preview switcher any more. `invited` is a real third state: you can see
the lobby, but you're not on the roster and chat stays read-only until you
accept. Swap `CURRENT_PLAYER_ID` for the session's user id when auth is real.

## Lobby screen behaviour

- **Invite players** (leader only): the open-slot rows and the "Invite
  players" button open `InvitePlayersModal`, which is where the
  recommendation engine lives. It orders `lfgCandidates` by `S_total`
  (`src/lib/recommendation.ts`, Persamaan 3.1–3.5) under "Sort by:
  Recommended", and lets the leader filter by role, rating, online and mic.
  The score and its breakdown are **deliberately not shown** to players —
  only the order. Hard filters run first: already in the lobby, already
  applied, or suspended/banned. Pending invites fill open slots on the roster.
- **Chat**: every lobby automatically has a chat page at
  `/lfg/<game>/lobby/<id>/chat`; the lobby page shows a compact panel with a
  button that opens it, and `/messages` lists it under "Lobby chats" above
  your DMs (only lobbies you lead or have joined — not pending invites).
  `/messages?lobby=<id>` opens one directly. Both read the same state from
  `src/lib/lobby-session.ts` (sessionStorage, standing in for
  `lobby_messages` + realtime). **Lobby chats are temporary**: ending the
  lobby closes the chat, clears its messages, and drops it from
  `/messages`. Backend TODO: keep a
  moderator-only copy, since reports use the chat log as evidence.
- **After a lobby ends**, the notice counts down 8s and returns to the LFG
  page, with "Stay here" to cancel. Skipping the rating does the same.

## Auth (real Supabase Auth)

Signup, login and logout go through Supabase Auth. Setup:

- `.env.local` (gitignored) needs `NEXT_PUBLIC_SUPABASE_URL` and
  `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (the `sb_publishable_…` key, which
  replaced "anon"). Never put the `sb_secret_…` key in the frontend.
- `src/lib/supabase/client.ts` (browser) and `server.ts` (Server
  Components / Route Handlers); `src/proxy.ts` refreshes the session on
  every request (Next 16 renamed `middleware.ts` → `proxy.ts`). Server-side,
  trust `getUser()`, never `getSession()`.
- `supabase/migrations/` is the schema, applied **by hand** in the Supabase
  SQL editor (no CLI tracking). Never edit an applied migration — add a new
  timestamped one. `20260919000200_reports_moderation.sql` is written but
  deliberately **not run** until the report feature is built.
- A signup creates `auth.users`; the `on_auth_user_created` trigger creates
  the `profiles` row. Staff are rows in `admins`, not a role on `profiles`
  (a divergence from the proposal — see `docs/thesis-spec.md`).

`AuthContext`/`useAuth()` exposes `user`, `isReady`, `isAdmin`, `logout` and
`refreshUser` (call it after editing the profile so the navbar updates).
There is no `login()` setter — `onAuthStateChange` is the only writer.

Still open: Google/Discord buttons are stubs, there is no forgot-password
flow, and `AdminGate` is a client check (RLS is the real protection).

## Image cropping

Game key art is portrait; most frames it lands in are not (lobby banners are
~3:1, list thumbs are square). With plain `object-cover` the centre crop cuts
straight through the middle of the artwork, so use **`object-cover object-top`**
on cover/key-art images — the top of game art carries the characters and logo.

Round avatars are the exception: they stay centred (`object-cover` alone),
because they're already face-centred crops and anchoring them to the top
clips chins.

## Shared type scale

Screens share one scale, so a new page shouldn't invent its own: page
container `max-w-[1000px]`, cards `rounded-2xl border-border-strong
bg-bg-card-alt p-5`, section headings `text-[11px] font-bold uppercase
tracking-widest text-text-muted`, header actions `h-10 text-xs`. If a
page starts feeling like a different product, check it against these
first.

## Notifications vs. toasts

Two different things, deliberately:

- **Toast** (`toast()`) confirms something *you just did* and disappears
  after ~4.5s. Used only where the result isn't visible on screen —
  because the action redirects (create lobby, save profile, finish
  onboarding, leave lobby) or closes a modal (apply to lobby, submit a
  report). Accepting an applicant, sending a chat message and saving a
  rating deliberately have no toast: the UI already updates in place.
- **Notification** (`notify()`) is an incoming event you may need to come
  back to. It shows a toast *and* files an entry on `/notifications`,
  where it stays until read.

**Notifications are real rows** in `public.notifications`
(`20261006000000_notifications.sql`); `src/lib/notifications.ts` reads and
writes them and `NotificationContext` is the only caller. Toasts stay
local — storing a four-second confirmation would be noise. `src/data/
notifications.ts` now only holds the kinds, their styling, and which ones
are actionable.

Two limits worth knowing:

- **Delivery is still "on page load".** Push (FCM + service worker, per the
  proposal) and PWA are not built. A Supabase realtime subscription on this
  table is the cheaper first step.
- **The insert policy only allows rows addressed to yourself.** That covers
  today's frontend-driven flows, but real cross-player notifications ("X
  applied to your lobby") must be written server-side — a trigger on
  `applications` or an edge function — once the Lobby slice exists.
  Otherwise any account could spam anyone. The mock lobby flows therefore
  file their notifications to the acting user, and the actor's name lives in
  the title rather than in `actor_id`.

`ToastHost` is mounted once in the root layout — don't add another.

Join requests and lobby invites are **actionable**: they render accept /
decline icon buttons in the row (`actionableKinds` in
`src/data/notifications.ts`) and store the outcome on `resolution`. Friend
requests deliberately aren't — `/social/pending` already owns that action,
and having it in two places invites them drifting apart.

## Messages: DMs are real, lobby chat is not

Two different entities, deliberately split so two people can work at once:

- **Direct messages** are rows in `public.direct_messages`
  (`20261007000000_direct_messages.sql`), read and written through
  `src/lib/direct-messages.ts`. Exactly the proposal's entity: sender,
  receiver, body, timestamp — no `conversations` table, because a
  conversation is just every row between two people. RLS lets only the two
  participants read it, only the sender insert, and only the receiver set
  `read_at`. **No delete policy**: a sent message can't be unsent.
- **Lobby chat** is `lobby_messages` in the proposal, which needs the
  `lobbies` table nobody has built yet. It is still the sessionStorage
  stand-in (`src/lib/lobby-session.ts`) and must stay that way until the
  Lobby slice lands — building a second lobby schema alongside someone
  else's is how the games slice ended up with two parallel versions.

`/messages` shows both in one list: lobby chats on top (session store), DMs
below (database). The `?user=<username>` deep link resolves to a real
profile; names that only exist in the social mock data get an empty state
saying so, rather than opening a conversation that can't be sent to.

An admin **cannot** read DMs through the API — there's no policy for it.
That's deliberate: if reporting a DM is added later, the reporter should
attach the specific messages to the report instead of handing moderators a
window into every private conversation.

## Settings

`/settings` covers what belongs to the *login*, not the player profile:
email, password, logout, and where account deletion goes. Profile fields
stay on `/profile/me/edit`, so there's one place to edit who you are.

**No new table, on purpose.** Everything there is already owned by Supabase
Auth. Notification preferences and profile visibility would each need
storage the proposal doesn't model — add them when a screen actually reads
them, not before. Account deletion is admin-handled for now: removing an
auth record needs a server-side job, which a signed-in browser can't be
trusted with.

## Admin console

**Read [`docs/admin-console.md`](docs/admin-console.md) before touching
`/admin`.** Short version:

- Admins are **separate staff accounts** (`src/data/admin-accounts.ts`),
  signed in through the normal `/login`. Demo: `admin@temangame.dev`, any
  password. `AuthUser.role` is `"player" | "admin"`; missing means player.
- `/admin/*` is wrapped in `AdminGate`, which waits for `useAuth().isReady`
  and then calls `notFound()` for non-admins — a 404, not "access denied".
  It's a client check standing in for middleware + RLS, not security.
- The console has its own shell (sidebar, no public Navbar/Footer) and a
  wider container (`max-w-[1160px]`) for tables. Reuse the primitives in
  `components/admin/AdminUi.tsx` and the modals in `AdminModal.tsx`.
- Data model follows **Option B**: new `sanctions` and `admin_actions`
  tables on top of the 13-entity ERD. Account status is **derived** from
  sanctions in `src/lib/admin.ts` — don't store it separately in mock data.
- Every mutation in `AdminDataContext` requires a reason and appends an
  audit entry. Nothing is deleted: lobbies close, sanctions get lifted.
- Staff accounts see no player controls in the public Navbar (bell,
  messages), and `UserMenu` links them to the console instead.
- Suspended/banned players who log in get **no session** and land on
  `/account-restricted` (rule + dates only, never the internal note or
  reporter). Demo: `carrypotter@mail.com`, `lagswitch@mail.com`.

## Empty states

A new account is mostly blank, so emptiness is a design surface, not an
edge case. Two rules, both in `src/components/EmptyState.tsx`:

- **A missing value is dimmer than a real one** (`NotSet`, `NotSetOrAdd`) —
  never a plausible-looking stand-in. On a product selling trustworthy
  player data, filler that reads like an answer is the worst default. When
  the viewer owns the profile, the blank is the action ("Add"); visitors
  just see it's unset.
- **An empty section says what belongs there** (`EmptyState`: dashed
  border, dimmed icon, one line of why) and offers the fix only to whoever
  can make it.

Two specific calls: an unrated player shows "No ratings yet" instead of 0.0
with five grey stars (which reads as *bad*, not *new*), and the owner gets a
completeness prompt — percentage, progress bar, and the named gaps — driven
by `src/lib/profile-completeness.ts`.

## Onboarding

Steps: games → rank & role (skipped when no game is picked) → **about you**
→ playstyle → accounts. `AboutYouStep` collects date of birth, gender,
languages and play hours; it shares its inputs and validation with the edit
form through `components/profile/DossierFields.tsx`, so the two can't drift.

Everything is optional and the whole flow is skippable. `finish()` writes
playstyle, tags, gender, languages and the play window to `profiles`, and
the date of birth to `profile_private` (private — only the derived age is
public). Each picked game is saved through `saveGameSetup()` (see "Games,
ranks, roles and regions"). Linked accounts have nowhere to go until
`connected_accounts` exists.

## Profiles for everyone

`/profile/me`, `/profile/me/edit` and `/profile/<username>` read the real
`profiles` row (`src/lib/profiles.ts` maps it onto the `PlayerProfile` shape
the UI was built for; lookup by username is case-insensitive). Only
account-level fields exist so far — username, avatar, playstyle, personality
tags, reputation, gender, languages (list), a structured play schedule
(`play_days`/`play_start`/`play_end`/`timezone`, formatted for display by
`src/lib/availability.ts`; option lists in `src/data/profile-options.ts`),
plus a **private** date of
birth (`profile_private`, owner-only; others see only the derived age via
`profile_age()`). Region, rank, linked
accounts and match history are **per game** and arrive with the Lobby slice,
so they render as empty / "Not set". Usernames are 3–24 chars of
`[A-Za-z0-9_.-]` (`src/lib/username.ts`) because they appear in URLs.

**Profile pictures** live in the public Supabase Storage bucket `avatars`.
`profiles.avatar_path` stores only the path (`<user id>/<timestamp>.jpg`, pinned
by a CHECK to the owner's own folder) — never a URL, so a player can't point it
at an arbitrary address; `avatarUrl()` in `src/lib/avatar.ts` builds the URL.
The edit form crops to a square and shrinks to 256×256 JPEG in the browser
before uploading (~20–40 KB), uploads on Save under a fresh file name, then
deletes the previous file. Anything *player-uploaded* belongs in Storage;
design assets stay in `public/`.

Every *mock* player row still links to `/profile/<slug>`, but only a few have
a full mock record. When no real user matches, `resolveProfile()` in
`src/data/profile-lookup.ts` returns the mock record or builds a
**placeholder** from the name + avatar found in the social mock data, so no
row dead-ends on a 404. Unknown fields render "Not set" rather than invented
stats — filler would undercut a product about trustworthy player data. That
fallback goes away once the social/LFG screens read from the database too.
`src/lib/profile-loader.ts` (`loadProfile`, cached per request) does that
real-then-mock lookup for both `/profile/<user>` and `/profile/<user>/report`.
`/matches` is still mock-only (real users have no match history yet, so the
link never shows). The report form works for real players but **submitting
saves nothing** — it only shows a toast until the `reports` migration is run
and wired in.

## Games, ranks, roles and regions

The six in-scope games, their rank ladders and their roles are database data
(`games`, `game_ranks`, `game_roles`; migration `20261003000200_games.sql`),
read through `src/lib/games.ts` (`fetchGameCatalog`). **Read
[`docs/game-reference.md`](docs/game-reference.md)** for the researched values,
confidence marks and open questions before changing any of them.

- A rank is a step on a flat ladder: `ordinal` 0 is the lowest and the
  rank-distance penalty ΔR is `|a.ordinal − b.ordinal|`.
- **Roles exist only for Valorant, League of Legends and Mobile Legends.** The
  other three games have none, so the app never asks for one there
  (`game.roles` is empty).
- A player's choices are `user_game_mapping` (in-game name, region, rank) plus
  `user_game_roles`. `saveGameSetup()` writes them: **update first, insert if
  there was no row, never upsert.** An upsert needs UPDATE permission on the
  key columns, and tables with column-level grants deliberately don't grant
  those. (`profile_private` hit the same trap.)
- Region choices per game are in `src/data/game-regions.ts`, stored as text.
  Not a table yet; see the open decision in the reference doc.
- Onboarding saves games on "Finish setup" and stays on the page with an error
  if saving fails. "Skip for now" saves nothing, so a skipped setup doesn't
  record default answers.
- After onboarding, games are added, edited and removed in the **Games card on
  `/profile/me/edit`**. Save applies removals first, then saves each remaining
  game, and does all of that before the picture and the profile row so a
  failure is a plain "try again". Linking real game accounts (Riot, etc.) is
  not built; the "Connected accounts" card is still a placeholder.
- **Every game has its own LFG page** at `/lfg/<slug>` and its own create form
  at `/lfg/<slug>/create`. Valorant keeps its static route
  (`app/lfg/valorant`) because it is the only game with lobby, news and chat
  pages (all on mock data); the other five share `app/lfg/[game]`, where a
  static folder beats the dynamic one. Those five have no lobbies yet, so the
  list shows an empty state. Slugs come from `src/data/games.ts`, which also
  drives the navbar links and the landing cards.
- **Modes** per game are the `game_modes` table (group-play modes only, each
  with a kind, a max party, a rotating flag and the game's party rule;
  researched list in the reference doc), read through the catalog as
  `GameInfo.modes`. The create form caps the group size at the chosen mode's
  max party, and `partyRuleFor(mode, capacity, ranks)` in `lib/ranks.ts` turns
  the stored rule into the check, the same data the SQL join check uses.
- The LFG search bar offers the game's own region and mode, and one **Rank**
  dropdown: "Fits my rank" (default for a signed-in player with a rank), "All
  ranks", or a tier (Silver, Gold…), each meaning "lobbies that accept it".
  **The filters are not wired to the list yet.** The create form shows
  "Seeking Roles" only for games that have roles. Only the lobby *leader* sets
  a min–max range (form: "Rank Requirement", default "Any rank").
- **A lobby card shows one rank fact: the leader's accepted range**, drawn in
  the original rank-badge spot as icons and tier names ("[icon] Bronze to
  [icon] Gold", "Ascendant and up", or "Any rank"; `LfgTeam.rankRange`,
  `RankRangeBadge`, `rankRangeEnds`). A leader picks whole tiers, never
  divisions, so the badge names tiers only (Valorant's middle division stands
  in for the tier's icon). Icons come from `src/data/rank-icons.ts`; tiers without art yet
  get a small placeholder marker. The
  leader's own rank (`LfgTeam.rank`) is not on the card; it only orders
  results (`M_rank`). Whether the viewer can join *right now* is checked in
  `RequestToJoinModal` (button disabled with a reason), because that depends
  on who is already in the lobby.
- **Rank logic is in `src/lib/ranks.ts`** (pure functions, no database):
  tiers from a ladder, tier ranges to ordinal bounds, `joinableBounds` (which
  ranks may still join given who is *already in the lobby* and the game's
  party rule, `partyRuleFor`), `lobbyJoinBounds` (that plus the leader's
  range) and `boundsAcceptTier` (what the Rank filter asks). Eligibility (a yes/no filter) is
  kept separate from closeness (`M_rank`, which only orders). A lobby carries
  an optional leader-set range, default "Any rank". The party rules are
  approximations from guides; see the reference doc before changing them.
- **Lobbies are real** (`20261006000000_lobbies.sql` plus `20261007000000_lobby_start.sql` and `20261008000000_lobby_lifecycle.sql` and `20261009000000_lobby_edit.sql`: `game_modes`, `lobbies`,
  `lobby_roles`, `applications`, the `lobby_members` view and the write
  functions; plan and gaps in `docs/lobby-slice-plan.md`). Every LFG page lists
  the game's real lobbies (`fetchLobbyTeams` in `src/lib/lobbies.ts`), the create
  form calls `create_lobby` and the join dialog calls `apply_to_lobby`. All writes
  go through those database functions, never plain inserts; their error codes
  are mapped to wording in `lobbyErrorMessage`. A real lobby opens at
  `/lfg/<game>/lobby/<uuid>` (`RealLobbyDetail`, which reuses the mock screen's
  header, roster and join-request components; the mock ones, `lobby-1` and so
  on, still run on `LobbyDetail`). On it the leader accepts or declines, starts, reopens
  and ends or closes the lobby, members leave, applicants withdraw. Header: only
  "Start lobby" and "Join voice" sit at the bottom; the menu (or the one action
  a visitor has) stays top right. Statuses: `live` (recruiting, the screen's
  "Forming"), `scheduled`, `started` ("Live"), `completed` (ended after being
  started) and `closed` (cancelled). Stale lobbies end by themselves
  (`expire_stale_lobbies`, 6 hours). The Discord link is private to the leader and
  members (`lobby_voice_link`; the column can't be read through the API, so
  always select lobby columns explicitly, never `*`). The leader edits a lobby
  at `/lfg/<game>/lobby/<id>/edit` (the create form with the lobby's values;
  `update_lobby`, with group size, range, roles and schedule locked once started)
  and can remove a member (they may apply again). Still mock or missing: chat
  (the panel is shown disabled), invites, ratings, the Valorant banner above the
  list, and live updates (refresh to see changes).
- The old single region list (`regions.ts`: `SG2`, `NA East`, `EU West`) is
  gone. The create-lobby form now uses the Valorant list from
  `game-regions.ts`, with the labels as its values; once lobbies are real, the
  stored value is the code (`AP`, not "Asia Pacific (AP)").

## Reporting and reviewing

`ReportForm` is shared. It takes a loose `ReportTarget` ({ id, name,
avatar, rank? }) rather than a lobby member, so the same form backs the
end-of-lobby flow, `/profile/<user>/report`, and a past match. Pass
`lobbyId` when the report has lobby context (`reports.lobby_id`).

`RatingModal` is likewise a queue over `ReportTarget[]`, so it works for
live lobby members *and* for teammates pulled out of match history.
Rating at the end of a lobby is skippable, so `MatchTeammate.reviewed`
tracks who still needs rating — `/profile/<user>/matches/<id>` is where
that gets picked back up. Reviews and reports return separately from the
modal because they're separate tables.

## Row actions and full-row links

Player rows carry two inline icon buttons (message, add friend / invite)
via `PlayerRowActions`. There is **no overflow menu** — the row itself
opens the player's profile, and Report lives there, so a menu holding one
item was a detour.

The whole row is clickable using the stretched-link pattern: the name is
the `<Link>`, and `after:absolute after:inset-0 after:content-['']`
expands its hit area over the row. Two things that will bite you:

- `after:content-['']` is **required** — without a content value the
  pseudo-element is never generated and the overlay silently does nothing.
- Action buttons need `relative z-10` to sit above the overlay, and their
  handlers call `preventDefault()`/`stopPropagation()` so clicking one
  doesn't also follow the row link. Never nest them inside the anchor —
  that's invalid HTML.

## Navbar and avatars

The right side of the navbar carries only things with live state: the
active-lobby chip, the notification bell and messages (both with unread
counts), then the account chip. **Social lives in the account menu**
(`src/data/user-menu.ts`), not as its own icon — it's somewhere you go, not
something you monitor, and four icons next to the chip read as clutter.
Messages use a single speech bubble (`/icons/nav-chat.svg`); the old
two-bubble icon competed with the bell.

Use **`<UserAvatar src name />`** for any person whose picture may be
missing — which is every real account, since `avatar_path` starts null and
`avatarUrl()` returns "". An `<img src="">` makes the browser re-request the
current page (React warns about it), so an empty source has to render the
initial tile instead. Mock data always has an avatar, so the plain `<img>`
in those components is fine.

## Back navigation

`BackLink` is the shared back control. It's **sticky under the 60px
navbar** (`top-[60px]`), so on long pages — lobby, profile, match detail —
you don't scroll to the top just to go back. Sticky strip rather than a
floating button: it keeps its place in the layout, covers no content, and
sits where the eye already looks for back.

Default to a semantic destination (`href`). `useHistory` pops one history
entry — rarely what you want inside a multi-page section.

Social needs to leave the **whole section**: friends → discover → back
should return to wherever you were before opening Social, not to friends.
`router.back()` can't express that, so `NavOriginTracker` (root layout)
records every non-social route to `sessionStorage`, and `SocialBackLink`
reads it. See `src/lib/section-origin.ts`. Copy that shape if another
section ever needs the same.

## Reusable anchored-dropdown pattern

`SortDropdown`, `GameFilterDropdown`, `PlayerActionsPopup`, and
`LobbyActionsMenu` all share one shape: `relative` wrapper + `useState` for
open/closed + a `useRef` + `mousedown` listener to close on outside click +
an `absolute`-positioned panel. Copy one of these rather than inventing a
new dropdown/popover approach.
## Landing page content

The landing page is for players deciding whether to sign up, not for the
thesis. Keep it to four beats: what this is, pick your game, how it works,
why bother. Survey percentages, the comparison against Discord/Lita, and
the scoring formula were tried here and cut — that's examiner material,
not visitor material, and it buried the actual call to action.

The game grid lives **in the hero**, above the fold: each card routes into
that game's LFG page, so it's the primary way in, not decoration.

Copy lives in `src/data/landing.ts`. No invented metrics ("10M+ gamers",
"4.2k active LFG") — there are no users yet, and fake numbers undercut a
product whose pitch is trust.

## Auth redirect

Login and signup return the user to wherever they came from, carried as
`?next=<path>` and resolved by `src/lib/auth-redirect.ts`. `NavAuthButtons`
attaches it, both forms read it, and the login↔signup cross-links preserve
it. `sanitizeNextPath` rejects absolute URLs, protocol-relative paths and
auth routes, so `?next=` can't become an open redirect. Because the forms
call `useSearchParams`, each page wraps its form in `<Suspense>` — that's
what keeps `/login` and `/signup` statically prerendered.

## Games on a profile

The profile's per-game tabs render **only the games that player added**
(they used to be a hardcoded list of four titles), and the set is edited from
the edit form (`GamesEditor`, which reads the catalog from the database).
The data layer is the one described in "Games, ranks, roles and regions"
above: `games`, `game_ranks`, `game_roles`, `user_game_mapping` and
`user_game_roles`, read and written through `src/lib/games.ts`.

Rank, role, region and in-game name are **picked by the player**. There is no
Riot/Moonton integration, so nothing is "detected", and the card says so.
Rank is a row of `game_ranks` (a position on the ladder), never typed text,
so ranks can be compared and the rank-distance penalty can be computed.

A teammate once built a parallel version (`user_games.sql`, rank as free
text, `src/lib/user-games.ts`). It was never applied to the shared database
and was dropped in favour of this schema; the UI from that work
(`GamesEditor`, `DossierFields`, `AboutYouStep`) was kept and connected
to this data layer.

Mock profiles predate this and still carry `gameStats` with invented win
rates; `gamesOf()` in `PlayerProfileView` reads them through the same shape
so there's one rendering path. Win rate only shows when a `gameStat` exists,
i.e. never for a real account.

## Supabase gotcha: upsert vs. column grants

`profiles` and `profile_private` grant UPDATE on **specific columns**, never
the whole table. That breaks `.upsert()`: PostgREST compiles it to
`insert ... on conflict do update set <every column you passed>`, and
Postgres checks UPDATE privilege on all of them while planning — even when
no conflict happens. The result is `42501 permission denied for table ...`
on what looks like a plain insert.

Write update-then-insert instead (`saveDateOfBirth()` in `src/lib/profiles.ts`
is the worked example, including the 23505 retry). Don't "fix" it by widening
the grant to the primary key.

## Mock data → real backend

Data files under `src/data/` that represent things a database will
eventually own (e.g. `lfg-teams.ts`) are typed and shaped like the API
response they're standing in for — components consume the typed interface,
not the mock array directly. When the backend exists, swap the data source
(fetch/DB call) behind that same interface; components shouldn't need to
change.

## Scripts

```bash
npm run dev     # dev server, localhost:3000
npm run build
npm run lint
```

## Design source

Built from Figma file `CQg1F1t0GJh5BmiDacwNvC`:
https://www.figma.com/design/CQg1F1t0GJh5BmiDacwNvC/Design-System--Copy-

Despite the name, this file holds both the UI designs and the thesis
UML diagrams. Append `?node-id=<id>` to the URL to jump to one:

The file has three pages: **UI/UX** (screen designs), **Diagram** (thesis
UML), and Wireframe. Screen frames are 1440-wide, laid left to right.

| Node | What |
| --- | --- |
| `110:519` | LFG Page — the UI design the LFG route is built from |
| `2136:23` | Sign Up Page — matches `/signup` |
| `2151:64` | Log In Page — matches `/login` |
| `2148:64` | **Auth / Components** section (see below) |
| `1:2` | Kerangka Berpikir (research framework; vector, readable as text) |
| `37:6` | Use Case diagram |
| `40:16` | Use Case descriptions |
| `31:4` | Flowchart: recommendation + filter algorithm |
| `59:5` | Activity diagrams (3) |
| `79:5` | Sequence diagrams (3) |
| `168:3` | Class diagram |

Most diagram sections are rasterized images, so they need to be viewed
rather than parsed. They're the best available source for the figures
that the proposal PDF only contains as pictures.

### Figma components and variables

The auth screens are assembled from real components, not loose frames —
reuse them instead of drawing new ones:

| Component set | Variants | Code counterpart |
| --- | --- | --- |
| `Auth / Input Field` | `Trailing` = None / Eye / Chevron | `AuthField`, `AuthSelect` |
| `Auth / OAuth Button` | `Provider` = Google / Discord | `OAuthButtons` |
| `Auth / Step Card` | `State` = Active / Default | `AuthPanelCards` |
| `Auth / Primary Button` | — | submit buttons |

A **`TemanGame`** variable collection holds the colour tokens, mirroring
`@theme` in `globals.css` (`color/brand`, `color/bg-page`,
`color/text-muted`, `color/auth-*`, …). Bind fills to these rather than
typing hex values, and keep the two in sync when either side changes.

Note: Figma virtualises hidden sublayers inside instances, so an icon
that is invisible in a component will not exist in its instances at all.
That's why the input field uses `Trailing` variants rather than one
component with toggled icons.
