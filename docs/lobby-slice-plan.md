# Lobby slice plan (database written and tested locally, not run on Supabase)

Migration written on 2026-10-06: `supabase/migrations/20261006000000_lobbies.sql`.
It has been run against a local PostgreSQL (PGlite) with 46 behaviour checks and
600 randomised comparisons against `src/lib/ranks.ts` (all passing), but **not yet
against Supabase**. The screens still run on mock data. Divergences from the proposal are tracked in
[`thesis-divergences.md`](thesis-divergences.md); update it when this is built.

## Scope

**In:** create a lobby, real lobby lists on all six LFG pages, apply, the
leader accepts or declines, members, leave and close.
**Out (stay mock until a later slice):** ratings. (Chat and invites were built
later; see below.)

## Tables

| Table | One row is | Notes |
|---|---|---|
| `game_modes` | one mode of one game (value, label, kind, max party, rotating) | Moved out of `src/data/game-modes.ts`. A lobby points at a row, so mode names stay consistent and the party limit travels with the mode. |
| `lobbies` | one lobby | Leader, game, mode, region, language, mic required, schedule, capacity, status (`live`, `scheduled`, `closed`; `open` was dropped, it meant the same as `live`), and an optional accepted rank range (lowest and highest rank, both nullable; both empty means "Any rank"). |
| `lobby_roles` | one role a lobby is looking for | Only for games that have roles. |
| `applications` | one application to a lobby | Status: `pending`, `accepted`, `declined`, `left`. In the proposal. |

**Members are the leader plus every accepted application.** No `lobby_members`
table, which keeps the model closer to the proposal.

Table count with this slice: 21. `lobbies` and `applications` are already in
the proposal's 13, so the new ones are `game_modes` and `lobby_roles`, on top
of the 19 in `thesis-divergences.md` (22 if `game_regions` is added later).
Update that count and rows 10 and 11 there when this is built.

## Enforced in the database, not only in the UI

- **Rank eligibility at apply time** (the leader's range plus the game's party
  rule applied to who is already in), in a security-definer function. The
  TypeScript in `src/lib/ranks.ts` keeps driving the screens; the SQL must
  agree with it, so change both together.
- **One live lobby per player**, via a unique index.
- Only the leader accepts or declines; only the applicant can withdraw
  (row level security).

## Before starting

1. Manual test of onboarding, edit profile and the LFG rank filter with a real
   account (nobody has exercised the merged save paths while signed in).
2. Confirm nobody else is building lobbies, so tables don't collide again.
3. Run migrations by hand in the SQL editor, as before.

## What was built, and what is still to wire

- **Database:** the four tables, the `lobby_members` view, the eligibility
  functions and five write functions. Error messages are stable codes
  (`rank_not_eligible`, `lobby_full`, `already_in_live_lobby`, …) listed at the top of
  the write functions; the app maps them to wording.
- **Party rules are data** (`game_modes.party_*`, `game_ranks.party_band`). Next
  step in the app: read them from the catalog and delete `partyRuleFor()`.
- **To wire:** modes from the catalog, create form calling `create_lobby`, real
  lists on the LFG pages, apply and accept in the dialogs, cover choice (random
  default, stored as `cover`, e.g. `valorant/3`).
- **Lifecycle added later** (`20261007000000_lobby_start.sql`, then
  `20261008000000_lobby_lifecycle.sql`; run both, in order). Statuses: `live`,
  `scheduled`, `started`, `completed`, `closed`. Start takes no new members and
  leaves the list; reopen goes back to recruiting; ending a started lobby
  completes it (ratings will hang off that), closing an unstarted one cancels
  it. Safety net: 6 hours after started or opened, 3 hours after a scheduled
  one was due (`expire_stale_lobbies`, no scheduler). `joined_at` / `left_at`
  record who played, so leavers after the start stay ratable. Optional private
  Discord link (`lobby_voice_link`).
- **Notifications** (`20261010000000_lobby_notifications.sql`, needs the
  teammates' notifications migration): triggers on `applications` and `lobbies`
  tell the leader about applications, the applicant about the answer, and
  members when the lobby starts. The navbar button and the "Your lobby" banner
  now read the player's real lobbies.
- **Chat** (`20261011000000_lobby_messages.sql`): the `lobby_messages` table with
  realtime. Members of an open lobby read and write; after it ends the chat is
  closed for players, kept for admins. System lines come from triggers. Shown on
  the lobby page, `/lfg/<game>/lobby/<id>/chat` and `/messages`.
- **Invites** (`20261012000000_lobby_invites.sql`, run after the notifications
  one): the `lobby_invites` table and `invite_to_lobby` / `respond_to_invite` /
  `cancel_invite`. The leader picks players in `RealInvitePlayersModal` (the
  recommendation order, over real profiles); each pending invite holds an open
  slot. The player answers from the bell or the lobby page; accepting is an
  accepted application. Pending invites lapse when the lobby starts or ends.
  The same migration drops the `message` notification kind and limits
  `notify_user` to friend requests. Gaps: the leader gets no notification when
  an invite is accepted or declined (the roster shows it), an invited player
  can't pick a role on accepting, and the picker has no online or mic filters.
- **Editing** (`20261009000000_lobby_edit.sql`): `update_lobby()` and
  `remove_member()`; the create form doubles as the edit form at
  `/lfg/<game>/lobby/<id>/edit`. Run it after the lifecycle migration.
- **Known gaps:** the create form collects times of day, not a date; no editing
  a lobby yet; ratings, history and notifications are not built.
