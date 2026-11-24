# TemanGame — Agent Notes

Mostly frontend on mock data; the backend is being added in small vertical
slices on Supabase — Auth, `profiles`, `admins`, lobbies (with invites and
chat), notifications and direct messages are real; reviews and reports are
still mock, and social is partly so.

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

**The proposal was revised on 14 October 2026 and the code has not caught up
yet.** `S_total` lost its `M_rank` multiplier, `R` was rebuilt around a
Bayesian weighted average, and `T` now scores tag *strength* rather than set
overlap — so `src/lib/recommendation.ts` currently implements a formula the
supervisor struck out. Tables are being renamed to the thesis's own names
(`games` → `game`, `lobbies` → `lobby`, `game_ranks` → `rank_tier`,
`game_roles` → `game_role`, `lobby_roles` → `lobby_required_role`), lobby
statuses too (`live` → `open`, `started` → `in_progress`, `closed` →
`cancelled`), and the `ban` sanction is being dropped.
[`docs/proposal-revision-2026-10.md`](docs/proposal-revision-2026-10.md) is the
work plan: the new equations in full, the decisions already settled, and the
four phases from here to a deployable build. **Read it before touching the
recommendation engine, the lobby lifecycle, the rating flow or the admin
console** — and prefer it over the older status notes in this file, which
describe the pre-revision shape.

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
supabase/dev-seed/       demo players and lobbies to look at the app with (seed.sql, cleanup.sql);
                         blackbox-lobbies.sql (+ -cleanup) adds the lobbies the black-box cases
                         compare (tc_xxx / @tc.temangame.test), kept apart from seed.sql
                         because Precision@5 participants see seed.sql's lobbies;
                         NOT migrations, run by hand, safe to re-run, all fake data is
                         demo_xxx / @demo.temangame.test and removed by cleanup.sql
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
public/mascot/           Bounce, the mascot — 28 poses (see "Bounce, the mascot")
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
  players" button open a picker, which is where the recommendation engine
  lives. It orders players by `S_total` (`src/lib/recommendation.ts`,
  Persamaan 3.1–3.5) under "Sort by: Recommended". The score and its breakdown
  are **deliberately not shown** to players — only the order. Hard filters run
  first: already in the lobby, applied or invited, or a rank the lobby wouldn't
  accept. **Invites don't hold slots** (`20261123000200_invites_no_slot.sql`):
  up to two pending per open slot (`INVITES_PER_OPEN_SLOT`); the first to
  accept gets the slot and the rest lapse once the lobby is full. They are not
  listed on the roster. A player with an invitation out is locked on
  "Invited" wherever an invite button for them appears: in the picker (listed,
  not hidden: `invitedIds`) and on the friends list (`fetchMyPendingInvitees`,
  read once per page). The picker scores exactly like the join-request list: the lobby's
  Pb and wanted tags, the candidate's R* (3 when unrated) and tag strengths;
  it lists only the tags the candidate picked, as their profile does. Two versions: the real
  lobby's is `RealInvitePlayersModal` over real profiles (`lib/invite-candidates.ts`;
  no online/mic filters, nothing records them; the leader's playstyle stands in
  for the lobby's, tags are left open); the mock lobby's is `InvitePlayersModal`
  over `lfgCandidates`, and inviting there reaches nobody.
- **Chat**: every lobby has a chat, in three places that show the same
  conversation: a panel on the lobby page, its own page at
  `/lfg/<game>/lobby/<id>/chat`, and "Lobby chats" at the top of `/messages`
  (`/messages?lobby=<id>` opens one directly). For real lobbies it is the
  `lobby_messages` table with realtime (see "Messages" below). The mock lobbies
  (`lobby-1` and so on) still use the sessionStorage store in
  `src/lib/lobby-session.ts`. **Lobby chats are temporary for players**: once the
  lobby ends the chat is closed and drops off `/messages`.
- **After a lobby ends** the rating pop-up opens by itself for everyone who
  can still rate (once per lobby per tab, `rating-prompted:<id>` in
  sessionStorage); "Rate teammates" on the banner reopens it. In the pop-up,
  Report and Add friend are icons beside the name (`RatingFriendButton`, shown
  only while there is no friendship either way).
- **Every confirmation is a pop-up** (`ConfirmDialog`), never a bar under the
  header: end/close, leave, remove a member, and cancelling a join request
  (`WithdrawDialog`, shared by the lobby page and the LFG card's "Cancel").
  The leader's open slots open the invite picker even when every invitation
  is used up; the picker then says so.
- **Times are a 24-hour clock everywhere** ("20:00"): the create form's
  selects, lobby start labels, the profile's play hours, match history.
- **The roster marks the leader with the crown** (`/icons/lfg-crown.svg`), not
  a text chip; so does a match's roster. Match history lists the history's
  owner too (their face leads each row's avatar stack, and they are the first
  row of the roster); its rows keep a "Leader" chip, which there means "you
  led this one".

## Auth (real Supabase Auth)

Signup, login and logout go through Supabase Auth. Setup:

- `.env.local` (gitignored) needs `NEXT_PUBLIC_SUPABASE_URL` and
  `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (the `sb_publishable_…` key, which
  replaced "anon"). Never put the `sb_secret_…` key in the frontend.
- `src/lib/supabase/client.ts` (browser) and `server.ts` (Server
  Components / Route Handlers); `src/proxy.ts` refreshes the session on
  every request (Next 16 renamed `middleware.ts` → `proxy.ts`). Server-side,
  never trust `getSession()`. To scope a query to the caller use `getUserId()`
  (`lib/supabase/server.ts`): it verifies the token locally with `getClaims()`, so it
  costs no round trip, and it is computed once per request. Use `getUser()` only
  when you need the account itself (email). RLS is what protects data either way.
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

**Forgot password**: `/forgot-password` sends Supabase's reset email (same
answer whether or not the address exists), and the link lands on
`/reset-password`, which exchanges the `?code=` (or picks up the hash token)
and saves the new password. Both are exempt from the onboarding gate and
count as auth routes for `?next=`.

**Google and Discord are real** — `OAuthButtons` calls `signInWithOAuth` and
the round trip comes back to `src/app/auth/callback/route.ts`, which swaps the
code for a session on the *server* (the cookies have to exist before the first
navigation, or `proxy.ts`'s onboarding gate misses the new account) and then
applies LoginForm's admin rule. **Each provider still has to be switched on in
the Supabase dashboard with its own client ID and secret — step by step in
[`docs/oauth-setup.md`](docs/oauth-setup.md).** Three things worth knowing:

- **Nobody types a username**, so `handle_new_user` makes one
  (`20261119000400_oauth_signup.sql`): Discord's own handle, or the email's
  local part for Google (its `name` is the person's real name, and a username
  is public — it is in the URL), cleaned to `[A-Za-z0-9_.-]`, capped at 24, and
  numbered when it collides. An explicitly typed username is still inserted
  as-is so a duplicate raises, which is what SignupForm turns into "That
  username is already taken". The name generator is a separate function with
  EXECUTE revoked, so the migration can test its own boundary values.
- **The provider's avatar is not imported.** `avatar_path` is CHECKed to the
  owner's own folder in the `avatars` bucket precisely so no outside URL lands
  there; new accounts show initials.
- **Suspension isn't checked in the callback.** `signOutIfSuspended` writes to
  `sessionStorage`, which a Route Handler can't reach — `proxy.ts` catches
  `is_suspended` on the next page load instead.

## Image cropping

Game key art is portrait; most frames it lands in are not (lobby banners are
~3:1, list thumbs are square). With plain `object-cover` the centre crop cuts
straight through the middle of the artwork, so use **`object-cover object-top`**
on cover/key-art images — the top of game art carries the characters and logo.

**Lobby covers have a focal point** instead: `coverPosition(src)` in
`src/data/lfg-covers.ts` gives each cover's `object-position`, used everywhere
a cover is drawn (card, banner, lobby header, chat, match history, admin), so
the subject stays in frame in the tall desktop strip and the wide phone band
alike. Add an entry when adding a cover. The card's fade into the text is
desktop-only.

Round avatars are the exception: they stay centred (`object-cover` alone),
because they're already face-centred crops and anchoring them to the top
clips chins.

## Bounce, the mascot

A pair of blue blobs — two friends, which is what *teman* means. 28 SVGs in
`public/mascot/`, all 200×200 and all in `--main-color`, so they sit on the
dark page without a container. Drawn in-house; the source package is
`TemanGame-Bounce.html` plus `TemanGame-Bounce-svg/`.

Three rules, each learned the hard way:

- **Never inline them into JSX.** Every file declares the same mask ids
  (`d10`, `d11`) because each was authored standalone, so two inlined in one
  page collide and the second one loses its eyes and the gap between the
  blobs. Go through `components/Mascot.tsx`, which renders an `<img>` — each
  then gets its own document. Poses are typed in `src/data/mascot.ts`.
- **The pose has to match the screen.** Each was drawn for a specific one:
  `empty` is Bounce alone with a dashed outline where the other should be
  (the friends list), `lost` has a question mark (404), `soon` is asleep
  (a game with no lobbies yet), `error` a red "!", plus `search`, `filter`,
  `chat`, `rate`, `apply`, `accepted`, `trust`, `support`, `login`. Used
  everywhere it stops meaning anything, so it is on the **big** empty
  surfaces only — a whole panel or a whole page. Small slots keep the dimmed
  icon disc (`EmptyState`'s `icon`), and plenty of them are better with no
  picture at all.
- **Three files are not interchangeable.** `public/mascot/app-icon.svg` is
  the lockup (white duo on a rounded brand square) used by `Logo` and
  anywhere the mark appears. `public/icons/logo-mark.svg` is the duo in
  **white on transparent**, and exists only because
  `scripts/generate-pwa-icons.mjs` composites it onto its own brand square —
  make it blue and the PWA icons come out blue-on-blue and invisible.
  `public/mascot/mark.svg` is the single blob, the quiet version.

After changing the logo, rerun `node scripts/generate-pwa-icons.mjs`, and
regenerate `src/app/favicon.ico` from `app-icon.svg` if the mark moved.

`public/sw.js`'s `PRECACHE` lists the artwork the **offline** screen draws
(`/mascot/worried.svg`). That page is the one thing that must render with no
network, so changing its picture means changing that list — and bumping
`VERSION` — in the same commit.

`loading-1/2/3.svg` are three frames of a bounce, for a loading animation
that nothing uses yet; `PageSkeleton` still shimmers the page's own shape,
which tells a player more than a mascot would.

## Shared type scale

Screens share one scale, so a new page shouldn't invent its own: page
container `max-w-[1000px]`, cards `rounded-2xl border-border-strong
bg-bg-card-alt p-5`, section headings `text-[11px] font-bold uppercase
tracking-widest text-text-muted`, header actions `h-10 text-xs`. If a
page starts feeling like a different product, check it against these
first.

## Responsive layout

Breakpoints are Tailwind's, plus one: **`xs` = 368px**, defined in
`globals.css`'s `@theme`. It exists for the navbar, where the logo, the menu
button and the auth buttons fit a 375px phone but not a 320px one; `sm`
(640px) reacts far too late and would strip the wordmark from every phone.

Three screens change shape rather than just reflow, and each hid something
before:

- **Navbar.** The six game links are `hidden lg:flex` — they don't fit beside
  the account controls. The live-lobby chip sits in the bar from `sm` up; on a
  phone it is a floating pill at the bottom right instead (hidden on that
  lobby's own pages and in Messages, where it would cover the composer). Below `lg` they live behind `MobileNavMenu`, a
  hamburger that opens a full-width panel under the bar. Without it a phone
  had no route into any game but the landing page's grid.
- **Social** (`/social/*`) is a sidebar beside a panel from `sm` up. Below
  that the layout stacks (`flex-col sm:flex-row`) and `SocialSidebar` renders
  a scrolling strip of the same five destinations instead, using each item's
  `shortLabel`. It used to be `hidden sm:flex`, which left Pending, Discover,
  Recent and Blocked unreachable on a phone.
- **Messages** is master-detail below `sm`: the conversation list, then the
  thread with a back arrow (`BackToList`, exported from `MessageThread` and
  shared with `LobbyChatThread`). `MessagesView` holds `threadOpenOnMobile`;
  a `?user=` or `?lobby=` deep link starts on the thread, since it asked for
  one conversation. From `sm` up both panes show and the state is ignored.

Two rules worth keeping:

- **`dvh`, never `vh`,** for anything sized to the window. `vh` counts the
  strip a mobile browser's URL bar covers, so a chat composer pinned to the
  bottom sits off-screen. Used by `/messages`, the Social layout, the lobby
  chat pages and every modal's `max-h`.
- **A fixed-height control must not wrap.** `h-8` plus a label that wraps to
  two lines spills text outside its own border — that's what `shrink-0
  whitespace-nowrap` on the nav auth buttons is for.

Tables stay wide and scroll: `AdminTable` wraps a `min-w-[720px]` table in
`overflow-x-auto`, because a moderation queue reads worse as stacked cards
than as a table you nudge sideways.

## Notifications vs. toasts

Two different things, deliberately:

- **Toast** (`toast()`) confirms something *you just did* and disappears
  after ~4.5s. Used only where the result isn't visible on screen (start
  or end a lobby, save a profile, finish onboarding, submit a report) and for
  errors. Accepting or declining, leaving, applying, creating a lobby,
  friend requests, blocking and every admin action except claiming or
  dismissing a case deliberately have no toast: the UI already shows it.
  Every toast has a subtitle (clamped to two lines) and a solid-colour icon
  circle: green success, blue info, red danger. The card itself stays dark.
- **Incoming events pop up too**: a new `notifications` row (realtime) raises
  a toast through `incomingToast()` in `src/lib/notifications.ts`. Invites,
  join requests and friend requests carry Accept / Decline (answered in
  `ToastHost`, 12s); accepted and lobby-started are green, removed is red.
  New direct messages and lobby chat lines do **not** pop up (DMs raise the
  messages badge only). `notify()` files a row, so for a signed-in player its
  pop-up comes from that same path.

**Notifications are real rows** in `public.notifications`
(`20261006000000_notifications.sql`); `src/lib/notifications.ts` reads and
writes them and `NotificationContext` is the only caller. Toasts stay
local — storing a four-second confirmation would be noise. `src/data/
notifications.ts` now only holds the kinds, their styling, and which ones
are actionable.

Two limits worth knowing:

- **Push (FCM) reaches closed apps**, for players who turned it on in
  Settings → Notifications (per device). Every new `notifications` row is
  pushed; there is no separate push list to keep in step. See "PWA" below.
- **The insert policy only allows rows addressed to yourself.** So
  cross-player notifications are written by the database, never by the browser.
  The lobby ones are triggers (`20261010000000_lobby_notifications.sql`): an
  application tells the leader (`join_request`), the leader's answer tells the
  applicant (`application_accepted` / `application_declined`), starting a lobby
  tells its members (`lobby_started`). Requests nobody can accept any more
  (withdrawn, or the lobby started or ended) are deleted. `notifications.ref_id`
  is the application a join request is about; Accept and Decline on
  `/notifications` call `respond_to_application` with it, and show the
  database's reason if it refuses (lobby full, the player no longer fits).
  Invites work the same way (`20261012000000_lobby_invites.sql`): `lobby_invites`
  rows trigger a `lobby_invite` to the invitee, `ref_id` is the invite, and
  Accept calls `respond_to_invite`. `notify_user` is now **friend requests
  only**; never widen it to lobby kinds, a player could forge one. There is no
  `message` kind (DMs have their own unread count) and no `report_update`.
  Only the old mock flows still file a notification to the acting user.
  **Deleted rows** (a withdrawn join request) reach the bell through
  `useRealtimeDeletes`: Supabase can't filter delete events, so it listens to
  the whole table and drops the id if it is one the player has.

  A row shows the game's logo before the title (read from the `/lfg/<slug>`
  link, `gameOfNotification`), unread as a small dot after the time, and names
  (the person, the lobby) a step heavier than the rest of the sentence
  (`titleSegments`). That last one finds the lobby name by matching the title
  wording the triggers write, so **change the trigger text and
  `lobbyNamePosition` together**.

`ToastHost` is mounted once in the root layout — don't add another.

**Live updates.** A Server Component page that should follow the database gets
`<LiveRefresh subscriptions={[{ table, filter }]} />` (`src/components/LiveRefresh.tsx`):
it re-renders the page on any change to those rows, debounced and paused while
the tab is hidden. Used on the lobby page, the LFG lists, and (as client
refetches via `useRealtimeChanges` / `useFriendshipChanges`) the navbar lobby
chip and the Social lists and pending count. Needs the table in the realtime
publication (`20261007000100`, `20261011000000`, `20261016000000`, `20261117000000`); realtime
obeys RLS, so people only get changes to rows they can read, and a signed-out
visitor gets none.

Join requests and lobby invites are **actionable**: they render accept /
decline icon buttons in the row (`actionableKinds` in
`src/data/notifications.ts`) and store the outcome on `resolution`. A join
request answers the real application and a lobby invite the real invite; the
database resolves the notification itself. Friend
requests deliberately aren't — `/social/pending` already owns that action,
and having it in two places invites them drifting apart.

## Messages: DMs and lobby chat are both real

Two different entities, deliberately split so two people can work at once:

- **Direct messages** are rows in `public.direct_messages`
  (`20261007000000_direct_messages.sql`), read and written through
  `src/lib/direct-messages.ts`. Exactly the proposal's entity: sender,
  receiver, body, timestamp — no `conversations` table, because a
  conversation is just every row between two people. RLS lets only the two
  participants read it, only the sender insert, and only the receiver set
  `read_at`. **No delete policy**: a sent message can't be unsent.
- **Lobby chat** is `lobby_messages`
  (`20261011000000_lobby_messages.sql`), read and written through
  `src/lib/lobby-chat.ts` and the `useLobbyChat` hook, drawn by `RealLobbyChat`
  (the shared `LobbyChat` panel). Only the leader and accepted members of an
  open lobby (live, scheduled or started) can read or write; a pending
  applicant, someone who left, and everyone else cannot. **When the lobby ends
  the chat closes for players but the rows are kept, and an admin can read
  them** as evidence for reports (the opposite of DMs, which nobody can read
  through the API). Rows are `message` (a player) or `system` ("X joined the
  lobby", "The lobby has started"); system rows are written only by triggers, so
  nobody can fake one. There is no edit or delete, and 30 messages a minute is
  the limit per player. Unread counts for lobby chat are not built (the
  navbar badge counts DMs only).

`/messages` shows both in one list: lobby chats on top, DMs below. The `?user=<username>` deep link resolves to a real
profile; names that only exist in the social mock data get an empty state
saying so, rather than opening a conversation that can't be sent to.

An admin **cannot** read DMs through the API — there's no policy for it.
That's deliberate: if reporting a DM is added later, the reporter should
attach the specific messages to the report instead of handing moderators a
window into every private conversation.

## PWA

TemanGame installs as an app (proposal: PWA). Pieces:

- `src/app/manifest.ts` serves `/manifest.webmanifest` (standalone, dark
  theme colour). Icons in `public/pwa/` are drawn from the logo mark by
  `node scripts/generate-pwa-icons.mjs`; rerun it if the logo changes. iOS
  gets `apple-touch-icon.png` and `appleWebApp` in the root layout.
- `public/sw.js` is the service worker, deliberately small: **pages always
  come from the network** (lobbies and slots must be current), with the static
  `/offline` screen as the fallback when there is none; hashed build files are
  cached for good, `public/` images are served from the cache and refreshed in
  the background (so a replaced logo shows on the next visit); Supabase, `/api`
  and Server Component payloads are never touched. Bump its `VERSION` when changing it. `next.config.ts`
  serves it with `no-store` so updates reach players at once.
- `src/lib/pwa.ts` registers it (**production builds only**, so it never
  fights `npm run dev`'s hot reload; test with `npm run build && npx next
  start`) and keeps the browser's `beforeinstallprompt` so "Install app" (the
  account menu, and the App card in Settings) can open the install dialog.
  Safari on iPhone has no such dialog, so there the UI shows Share → Add to
  Home Screen, which iOS also requires before it allows push.
- The Claude desktop app's browser pane can't register service workers; check
  the PWA in real Chrome (DevTools → Application) or on a phone.

**Push (FCM)**, `20261119000000_push_notifications.sql`:

1. Settings → Notifications → "Turn on for this device" (`PushSettingsCard`,
   `lib/push.ts`): browser permission, then an FCM token tied to **our**
   service worker (no `firebase-messaging-sw.js`), stored with
   `register_push_token` in `push_tokens` (key = token, one row per device).
   `PwaSetup` refreshes it on each start; logout removes it first, so the next
   person on that device gets nothing of the last one's.
2. A trigger on `notifications` insert posts the row and the player's tokens
   to `/api/push` through `pg_net` (asynchronous: a failed push never blocks
   the insert). URL and shared secret come from **Supabase Vault**
   (`push_webhook_url`, `push_webhook_secret`); without them it does nothing.
3. `src/app/api/push/route.ts` checks `x-push-secret`, sends a **data-only**
   message with `firebase-admin`, and reports dead tokens back through
   `forget_push_tokens` (which checks the same secret).
4. `public/sw.js` draws it (`push`) and opens `href` on tap
   (`notificationclick`), reusing an open window.
5. **Chat** (`20261119000100_chat_push.sql`): DMs and lobby chat lines push
   straight from their own triggers (`send_push_to`), not through
   `notifications`. One push per player per conversation per cooldown (1 min
   DM, 3 min lobby chat; `push_throttle`, `push_slot_free`), and a `tag` per
   conversation so the newest replaces the last on the device. In-app, chat
   still doesn't pop up a toast.

Settings: `NEXT_PUBLIC_FIREBASE_CONFIG` (the web app's config as JSON) and
`NEXT_PUBLIC_FIREBASE_VAPID_KEY` are public; `FIREBASE_SERVICE_ACCOUNT` (JSON,
one line) and `PUSH_WEBHOOK_SECRET` are server-only, on Vercel and never in
the repo. Push only works in production builds (the service worker isn't
registered in dev), and on iPhone only in the home-screen app (iOS 16.4+).

## Settings

`/settings` covers what belongs to the *login*, not the player profile:
email, password, the app and push on this device, logout, and where account
deletion goes. Profile fields stay on `/profile/me/edit`, so there's one
place to edit who you are. Laid out like GitHub's settings: sections listed on
the left (a scrolling strip on phones), one at a time on the right, each a
set of rows (label and explanation, then the control). The open section is
the URL hash (`#account`, `#password`, `#app`, `#session`).

**Push prompt** (`components/PushPrompt.tsx`, root layout): a signed-in
player whose push is off on this device gets a small "Get notified on this
device?" card once, 2.5 s after a page loads. "Turn on" is the tap Safari
needs before it shows the permission dialog (and asking on load would make
Chrome hide it); "Not now" waits 14 days. Quiet on onboarding, settings,
auth, admin and offline pages; never where push can't work.

**No new table, on purpose.** Everything there is already owned by Supabase
Auth. Notification preferences and profile visibility would each need
storage the proposal doesn't model — add them when a screen actually reads
them, not before. **Account deletion is self-service**
(`DeleteAccountSection`, `delete_my_account()` in
`20261119000300_delete_own_account.sql`): the player types their username and
re-enters their password; the app removes their avatar files and push token,
then the function deletes only the caller, refusing staff accounts and running
suspensions. It clears the reports and sanctions that would block the delete,
cascades everything else, and recomputes the reputation of everyone they had
rated.

## Admin console

**Read [`docs/admin-console.md`](docs/admin-console.md) before touching
`/admin`.** Short version:

- Admins are **separate staff accounts**, signed in through the normal
  `/login`. Staff identity is a row in `public.admins`, added by hand in the
  SQL editor — there is no admin sign-up. `AuthContext` reads that table on
  every session load, so a new row only takes effect after a fresh login.
  `AuthUser.role` is `"player" | "admin"`; missing means player. The emails in
  `src/data/admin-accounts.ts` are **mock display data only** and are not
  checked at login; the real accounts live in the database, and their
  passwords are not in this repo.
- Staff accounts are exempt from the onboarding gate in `src/proxy.ts`: they
  have no playstyle and no personality tags, and shouldn't be asked for any.
- **Checked on the server**: `app/admin/layout.tsx` (a Server Component)
  looks the caller up in `admins` and calls `notFound()` otherwise, so a
  visitor gets the ordinary 404 and no console markup. `AdminGate` (client)
  stays as a second, cosmetic check.
- The console has its own shell (sidebar, no public Navbar/Footer) and a
  wider container (`max-w-[1160px]`) for tables. Reuse the primitives in
  `components/admin/AdminUi.tsx` and the modals in `AdminModal.tsx`.
- **Real data** (`20261119000200_admin_moderation.sql`): `AdminDataContext`
  reads everything through `lib/admin-data.ts` (`reports`, `sanction` with
  `sanction_reports`, `lobby` with members and chat, `admin_actions`, plus
  `admin_accounts()` for emails and sign-in dates and `admin_low_ratings()`
  for the reasons behind 1–2 star ratings, raters never named). Every action
  is a database function (`admin_claim_report`, `admin_dismiss_report`,
  `admin_issue_sanction`, `admin_lift_sanction`, `admin_close_lobby`,
  `admin_remove_member`) that checks the caller is an admin, requires a reason
  of 10+ characters and writes the audit entry in the same transaction; the
  direct write grants on the moderation tables are revoked. After each action
  the context re-reads everything. Nothing is deleted: lobbies close,
  sanctions get lifted. Suspensions are 1, 3, 7 or 30 days; there is no ban.
- Account status is **derived** from sanctions in `src/lib/admin.ts`. Staff
  names on cases and the log are `admins.display_name` (`setStaffNames`).
- Evidence files open through a five-minute signed link (`EvidenceFile`).
- Staff accounts see no player controls in the public Navbar (bell,
  messages), and `UserMenu` links them to the console instead.
- Suspended players get **no session**: after sign-in `signOutIfSuspended()`
  (`lib/suspension.ts`, reading `my_active_suspension()`) signs them out and
  shows `/account-restricted` (rule + dates only, never the internal note or
  reporter). A session already open when the suspension starts is sent there
  by `proxy.ts` on a full page load (`profiles.is_suspended`) and by
  `SuspensionWatcher` (root layout) on every page change, on returning to the
  tab and once a minute, because link navigation is never a full load. **Writes
  are refused by the database** whatever the app does: PostgREST runs
  `refuse_suspended()` before each request (`20261124000100_refuse_suspended.sql`,
  `account_suspended`, HTTP 403; `lib/supabase/client.ts` leaves the page on
  it). Reads pass. supabase-js calls functions with POST, so **a new read-only
  function that a suspended player must reach goes on that migration's list**.
- `lib/admin-store.ts` and the seed in `data/admin-moderation.ts` are left only
  for the mock lobby's invite picker, and go with step 8.

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

## Languages and schedules

One list of languages (`languageOptions` in `src/data/profile-options.ts`) feeds
profiles, onboarding and lobbies, all through `LanguagesField` (a lobby takes up
to 4, the database limit). Regional languages like Javanese were dropped on
purpose; values are plain names so older saved ones still show.

A lobby's schedule is a **day plus a start and end time**, on the UTC+7 clock:
the next seven days as chips above the time selects, like the profile's day
chips. An end before the start means the next day (23:00 to 01:00). A start that
has already passed is refused in the form. The lobby badge shows the **mode's own
name** ("Competitive", "Premier"), coloured by its kind (ranked, casual,
tournament).

## Onboarding

Steps: **about you → playstyle** (the compulsory ones, first) → games → rank
& role (skipped when no game is picked) → accounts. `AboutYouStep` collects date of birth, gender,
languages and play hours; it shares its inputs and validation with the edit
form through `components/profile/DossierFields.tsx`, so the two can't drift.

**Three things are compulsory: date of birth ("About you", 18+ under UU PDP)
and the playstyle step; every other step is optional.** "Skip and finish"
appears only on the optional steps after them: it saves what is required and
finishes, recording nothing for the step on screen (skipping games drops the
picked games, skipping rank keeps the games without details). The edit form
refuses to clear the date of birth. On onboarding the logo is not a link
(`<Logo asLink={false} />`): a click home lost every answer and, as a
client-side navigation, slipped past `proxy.ts` (which only checks full page
loads). The compulsory steps show "Log out" in the corner instead. That step holds the two things the recommendation formula reads
from the player — the 1–5 playstyle (`Pa`, Persamaan 3.2) and 3–5 personality
tags (Persamaan 3.14) — so "Skip for now" is hidden there and Continue stays
disabled until both are set. Nothing is pre-selected: playstyle starts `null`,
because the old `useState(3)` wrote "Seimbang" for players who never chose it,
straight into the heaviest-weighted term of the score.

`src/proxy.ts` is the other half: a signed-in player whose profile is missing
playstyle, tags or a date of birth (`profile_private`) is sent back to `/onboarding`, so closing the tab halfway doesn't
get an account with no `Pa` into the scoring. Staff accounts and the auth,
settings, admin and legal routes are exempt, and the check only runs on page
navigations.

`finish()` writes playstyle, gender, languages and the play window to
`profiles`, the tags to `user_tag`, and the date of birth to `profile_private`
(private — only the derived age is public). Each picked game is saved through `saveGameSetup()` (see "Games,
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
`profile_age()`, and not even that when the player unticks "Show my age on my
profile" in Edit profile: `profile_private.show_age`,
`20261123000100_hide_age.sql`; the owner still sees it). **Personality tags are rows in `tag` + `user_tag`**
(`20261116000000_personality_tags.sql`), read and written through
`src/lib/tags.ts`; `profiles.personality_tags` is dead and no longer read
anywhere, pending a migration that drops it. A deferred constraint trigger
holds the set at 3–5 or empty — deferred because a row-level check would
reject the first of three rows before the other two arrive. Region, rank, linked
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
Match history is real for real players (see "Reporting and reviewing");
mock profiles keep their mock history. Reports on real players are saved.

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
- **One form for a game's details** (`components/profile/GameDetailsFields`, used by
  onboarding with the auth look and by the edit form compactly): the account the
  game asks for (Riot ID, or nickname plus an ID; formats and checks in
  `src/data/game-accounts.ts`, stored in `in_game_name`, `account_id`, `zone_id`),
  region and rank as dropdowns (rank shows its badge for the games with badge art:
  Valorant, League), and roles as chips that cycle off, picked, favourite (★, a
  yellow badge on the chip), off (`user_game_roles.is_favorite`). A mistyped ID
  blocks Save with a message rather than failing in the database. The IDs and
  favourites show on the profile's game card. Migration
  `20261015000000_game_account_details.sql`.
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
- **The LFG list is ranked and filtered on the server** (`lib/lobby-ranking.ts`,
  proposal 3.3.1.2): hard filters (game, then the rank range the lobby accepts),
  the optional ones the player picked, then `S_total` for that player, with
  `R` as `R_lobi` (the members' mean R*). The filters live in the URL
  (`?q=&region=&mode=&rank=&role=&sort=`, `lib/lobby-filters.ts`). **Rank**:
  "Fits my rank" (default), "All ranks", or a tier, each meaning "lobbies that
  accept it". **Role is optional on purpose**: lobbies that name no role always
  stay. Players see the order, never the scores. What the lobby *asked for* is
  shown, though: `LobbyLookingFor` puts "Plays <Pb label> · Looking for <tags>"
  under the lobby header and in the Join popup ("Who they're looking for";
  `LfgTeam.wantedTags`, Pb falling back to the leader's playstyle). Not on the
  card: it has a fixed height on desktop and its "Looking for" row is roles. The same list is JSON at
  `/api/lobbies/recommended?game=<slug>` for k6 and Precision@5. The create form
  shows "Seeking Roles" only for games that have roles. Only the lobby *leader*
  sets a min–max range (form: "Rank Requirement", default "Any rank").
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
- **No mock lobbies any more** (step 8): `lobby-1`… and their screens
  (`LobbyDetail`, `LobbyChatRoom`, `InvitePlayersModal`), the session store,
  the mock profiles, teams, candidates, match history, Social data and the
  admin seed are gone; the `src/data/` files keep only their types and option
  lists. An unknown lobby id or username is a 404. Profile links are the
  username (`profileHrefFor`).
- **A pending request can be cancelled from the LFG card** ("Cancel", which
  asks in a pop-up; `CancelRequestButton`) as well as from the lobby page ("Cancel
  request"). **The leader's join-request list is ranked** by S_total with the
  applicant's own R (proposal's reciprocal side), never showing the score.
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
  and can remove a member (they may apply again). The chat on the lobby page is
  live. **Invites are real** (`lobby_invites`; `invite_to_lobby`,
  `respond_to_invite`, `cancel_invite`): a pending invite does not hold a slot
  (two per open slot may be out), accepting joins as an accepted application and re-checks capacity, rank and the
  one-live-lobby rule, a declined invite can't be repeated, and invites lapse when
  the lobby starts or ends. The invited player answers on the lobby page or the
  bell. Starting a live lobby or being accepted into one withdraws the player's
  other pending requests to live lobbies (`20261118000300_withdraw_other_requests.sql`),
  since those could only fail on Accept. **A player already leading or playing
  in a live lobby can't apply to another live one** (`apply_to_lobby`,
  `20261123000000_one_lobby_apply.sql`, `already_in_live_lobby`; the join
  dialog says so up front with a link to their lobby). Scheduled lobbies stay
  open to them. **Ending or closing a lobby asks in a pop-up**
  (`EndLobbyDialog`), which warns when it has run under 15 minutes that no one
  will be able to rate (`LfgTeam.startedAt`, same rule as `submit_review`). The lobby page re-reads itself when the lobby, its applications, invites
  or system chat lines change (`LiveRefresh`, below). Once a lobby has ended,
  the people who played rate each other from its page. The navbar lobby button
  and the "Your lobby" banner read the player's real lobbies
  (`fetchMyCurrentLobby`, `fetchMyLobbies`) and show nothing when they are in none.
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
that gets picked back up. Reviews and reports are separate tables.

**Both are real** for real lobbies. Pass `onSaveReview` / `onSaveReport`
(from `useRating`, `lib/use-rating.ts`) and the queue saves each teammate as
it goes, staying on them if the database refuses; without them it only
collects (the mock lobbies). The database owns every rule (`submit_review`):
the lobby ended after at least 15 minutes, both people played, one rating per
teammate, and 1–2 stars need a reason (`data/review-options.ts`). The tags
offered are the ten personality tags (`tag`; names mirrored in
`personalityTagOptions`, so add one in both), strongest first for that teammate,
none pre-picked. Ratings are anonymous: `reviews` has no read policy, so
"have I rated them" comes from `player_matches()`
(`20261118000000_match_history.sql`), which answers only for the caller's own
ratings. `lib/matches.ts` turns it into `MatchRecord`s for the profile, the
match list and the match page. Reports insert only their own columns, and an
evidence file goes to the private `report-evidence` bucket under the
reporter's folder (`20261118000100_report_evidence.sql`, `lib/reports.ts`).

Friends can be removed from the friend list (the person-minus icon, then
"Remove?") and from their profile (the "Friends" button, then "Remove
friend?"). Avatars and names open the player's profile everywhere people are
listed: Social lists, pending and blocked rows, the DM thread header and
message bubbles, lobby chat and rosters.

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
two-bubble icon competed with the bell. Below `lg` the game links move into
`MobileNavMenu` and the wordmark drops below `xs` — see "Responsive layout".

Use **`<UserAvatar src name />`** for any person whose picture may be
missing — which is every real account, since `avatar_path` starts null and
`avatarUrl()` returns "". An `<img src="">` makes the browser re-request the
current page (React warns about it), so an empty source has to render the
initial tile instead. Mock data always has an avatar, so the plain `<img>`
in those components is fine.

## Speed

Pages that load data are Server Components, so keep them to **two rounds**: read
what everything else depends on together (`Promise.all([fetchGameCatalog(), getUserId()])`),
then everything that depends on it together. Lists are one nested PostgREST
select, not a query per table (`LOBBY_SELECT` in `lib/lobbies.ts`); stale lobbies
are expired once per request (`expireStaleLobbies`); the game catalog is cached
for ten minutes in memory (`fetchGameCatalog`). Each slow route has a
`loading.tsx` using `PageSkeleton`. A route that serves both prerendered and
per-request pages (`generateStaticParams` plus `cookies()`) fails in production
with `DYNAMIC_SERVER_USAGE`; don't mix them.

## Back navigation

`BackLink` is the shared back control. It's **sticky under the 60px
navbar** (`top-[60px]`), so on long pages — lobby, profile, match detail —
you don't scroll to the top just to go back. Sticky strip rather than a
floating button: it keeps its place in the layout, covers no content, and
sits where the eye already looks for back.

**Back goes to the page you came from** (the default): a profile opened from a
lobby returns to that lobby. `href` is only the fallback when there is no
earlier page of the app (opened directly, from outside, new tab), detected with
the Navigation API's `canGoBack` (falling back to `history.length`); the label
reads "Back" once it knows. Pass `useHistory={false}` for a section that has to
leave itself, like Social below.

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
npm test        # Vitest: the formula and the list's filters and sort
```

Tests sit next to the code they cover (`src/lib/*.test.ts`); shared fixtures are
in `src/test/`. Test cases follow the proposal's boundary values (rating 0, 1,
5, 6; playstyle 1–5; `|B| = 0`) so BAB 4 can report them directly.
`supabase/dev-seed/seed.sql` holds the test lobbies for Precision@5: five open
ones per game, varied on playstyle, wanted tags, rank range and reputation.

**The evaluation the proposal promises is planned in
[`docs/test-plan.md`](docs/test-plan.md)** — black-box (boundary values,
decision tables, state transitions) and the non-functional run first and
internally, then one session per pair of UAT participants produces UAT, SUS,
the UI/UX items and Precision@5 together. Every boundary value in it is taken
from a real constraint, with the migration named, so don't change a limit in
the database without changing that table too.

The black-box cases on the **API path** run automatically:
`testing/api/setup.sql` (SQL Editor) → `node testing/api/run-api-tests.mjs` →
`testing/api/cleanup.sql`. The script signs in with the accounts in
`testing/api-accounts.local.json` (git-ignored) and matches each refusal on the
database's own error code, so **renaming an error code or constraint breaks
its case**; change the script with it. All its data is `TC-API …` / `tc_api_…`.

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
