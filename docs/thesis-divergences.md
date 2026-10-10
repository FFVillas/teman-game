# Divergences from the proposal (running log)

A working list of every place the build differs from the written proposal, so
nothing has to be reconstructed from memory when it is time for BAB 4 or the
advisor meeting. Temporary by intent: once the advisor has seen it, fold what
matters into the thesis text and retire this file.

The reasoning behind the first four items is argued in full in
[`thesis-spec.md`](thesis-spec.md) ("Divergences from the proposal"). This file
is the index plus everything decided since. When you add a divergence, add a
row here and, if it needs an argument, a paragraph there.

**How to read the columns**

- **Proposal**: what the written proposal says. Where this was not re-checked
  against the PDF, it says "not rechecked".
- **Build**: what the code or schema does.
- **Kind**: *Addition* (extra thing), *Substitution* (different way to reach the
  same goal), *Narrowing* (less than the proposal), *Open* (not decided).
- **Status**: *Live* (in the database or app), *Written* (migration exists, not
  run), *Planned* (decided, not built).

## A. Data model

| # | Area | Proposal | Build | Kind | Status | Where |
|---|------|----------|-------|------|--------|-------|
| 1 | Admin identity | Admin is a `role` mapped to a user (`role`, `user_role_mapping`) | Separate `admins` table, independent of `profiles`; no `role` / `user_role_mapping` | Substitution | Live | `20260919000100_admin_roles.sql` |
| 2 | Moderation tables | `reports` only | Adds `sanctions`, `sanction_reports`, `admin_actions`; `reports` gains status / assignee / resolution columns | Addition | Written, not run | `20260919000200_reports_moderation.sql` |
| 3 | Age | A stored age (not rechecked) | Date of birth in private table `profile_private`; others only see derived age via `profile_age()`; 13+ enforced by trigger | Substitution + Addition (1 table) | Live | `20261003000000_profiles_dossier.sql` |
| 4 | Profile fields | Not rechecked | `gender`, `languages` (list), structured schedule (`play_days`, `play_start`, `play_end`, `timezone`) instead of free-text availability | Addition | Live | `20261003000100_profiles_schedule_languages.sql` |
| 5 | Profile picture | Not rechecked | File in Storage bucket `avatars`; `profiles.avatar_path` stores a path, never a URL | Addition | Live | `20261004000000_avatars.sql` |
| 6 | Ranks | `user_game_mapping` holds a rank | Rank is a row of `game_ranks` with an `ordinal`, so ΔR in `M_rank` is a subtraction | Addition (1 table) | Live | `20261003000200_games.sql` |
| 7 | Roles per game | One "favorite role" per game | Several roles per game via `user_game_roles`; in-game roles named `game_roles` to avoid clashing with the proposal's account `role` | Addition (2 tables) | Live | `20261003000200_games.sql` |
| 8 | Games that have no roles | A role for every game (not rechecked) | CS2, PUBG Mobile and Free Fire have no official roles, so none is stored or asked | Narrowing | Live | `20261003000200_games.sql` |
| 9 | Region | Per user (not rechecked) | Per game, as text on `user_game_mapping`; regional groups, never countries | Substitution | Live | `src/data/game-regions.ts` |
| 10 | Game modes | Not specified | Table `game_modes` (37 rows, six games); a lobby points at a mode. Region lists stay app-side; `game_regions` is still undecided | Addition (1 table) | Written, not run | `20261006000000_lobbies.sql` |
| 11 | Lobby rank range | Only the leader's own rank (`M_rank`) | Lobby gets an optional accepted range (`min_rank_id`, `max_rank_id`, nullable, no new table) | Addition | Written, not run (UI on mock data) | `20261006000000_lobbies.sql`, `src/lib/ranks.ts` |
| 11a | Roles a lobby seeks | Not rechecked | Join table `lobby_roles` (a lobby can look for several roles) | Addition (1 table) | Written, not run | `20261006000000_lobbies.sql` |

**Table count:** 13 in the proposal, 22 once the model above is built: the 19
in `thesis-spec.md` plus `game_modes`, `lobby_roles` and `lobby_invites` (23 if
`game_regions` is added). `lobbies` and `applications` are already among the proposal's 13.

## B. Behaviour and rules

| # | Area | Proposal | Build | Kind | Status |
|---|------|----------|-------|------|--------|
| 12 | Rank matching | Rank closeness scores a candidate (`M_rank = max(0.30, 1 − 0.07·ΔR)`) | Kept as the *ordering*. Added a separate yes/no *eligibility* step: leader's optional range plus each game's party rule applied to who is already in the lobby | Addition | Logic built and tested, UI on mock data |
| 12a | Where the eligibility rule lives | Not specified | In the database: `lobby_join_bounds()` and `can_join_lobby()`, checked again when the leader accepts, because who is already in has changed. The app's `src/lib/ranks.ts` computes the same thing for the screens; 600 random scenarios give identical results in both | Addition | Written, not run | `20261006000000_lobbies.sql` |
| 12b | How lobby data is written | Not specified | Only through functions (`create_lobby`, `apply_to_lobby`, `respond_to_application`, `leave_lobby`, `close_lobby`); clients have no INSERT/UPDATE on these tables | Substitution | Written, not run | `20261006000000_lobbies.sql` |
| 12c | Lobby lifecycle | Not rechecked | Five statuses: `live` (recruiting), `scheduled`, `started` (playing, no new members), `completed` (a started lobby that was ended) and `closed` (cancelled before it started). The leader starts, reopens, ends or closes; a player may be in one live or started lobby at a time but several scheduled ones | Addition | Written, not run | `20261006000000_lobbies.sql`, `20261007000000_lobby_start.sql`, `20261008000000_lobby_lifecycle.sql` |
| 12d | Automatic ending | Not rechecked | Safety net for leaders who forget: a started lobby completes 6 hours after it started, a recruiting one is cancelled after 6 hours, a scheduled one that was never started is cancelled 3 hours after it was due. Provisional limits, kept in one function (`expire_stale_lobbies`); no scheduler, it runs whenever a list or lobby is loaded | Addition | Written, not run | `20261008000000_lobby_lifecycle.sql` |
| 12e | Who played together | Not rechecked | `applications.joined_at` / `left_at` record when a player was in. Someone who leaves after the lobby started still played and stays ratable; one who leaves before it started never did. Only `completed` lobbies will allow ratings and reports between members, so nobody can rate a player they never played with | Addition | Recorded now; rating itself not built | `20261008000000_lobby_lifecycle.sql` |
| 12g | Editing a lobby, removing a member | Not rechecked | `update_lobby()`: the leader edits text, region, languages, mic, tags and the voice link any time the lobby is not over; group size, rank range, roles and schedule only while it is recruiting (locked once started); the game and mode never change. `remove_member()`: recorded like leaving, and the player may apply again | Addition | Written, not run | `20261009000000_lobby_edit.sql` |
| 12h | Lobby notifications | `notifications` is a teammate's table; the proposal's notification system (requirement 5, §3.2.4) | Written by database triggers on `applications` and `lobbies` rather than by the app, so a player cannot post as someone else: join request to the leader, accepted or declined to the applicant, started to members. `notifications.ref_id` ties a request to its application | Addition | Written, not run | `20261010000000_lobby_notifications.sql` |
| 12i | Lobby chat | `lobby_messages` (lobby, sender, content, time) | Same entity with two additions: a `kind` (`message` or `system`; system lines such as "X joined the lobby" come only from triggers) and retention: when a lobby ends the chat is closed for players but the rows are kept and readable by an admin, as evidence for reports. Flood guard of 30 messages a minute. Direct messages stay unreadable to admins | Addition | Written, not run | `20261011000000_lobby_messages.sql` |
| 12j | Lobby invitations | The proposal's notification flow mentions a join invitation (requirement 5) and the ERD has no invite entity | Table `lobby_invites` (lobby, invitee, inviter, status `pending` / `accepted` / `declined` / `cancelled` / `expired`), written only through `invite_to_lobby`, `respond_to_invite` and `cancel_invite`. A pending invitation holds an open slot; accepting re-checks capacity, rank and the one-live-lobby rule, and joins as an accepted application, so the roster, chat and ratings have no second path. A declined invitation can't be repeated for that lobby; invitations lapse when the lobby starts or ends. The invitee is told through a trigger, like 12h | Addition (1 table) | Written, not run | `20261012000000_lobby_invites.sql` |
| 12k | Notification kinds | Not rechecked | `message` removed (direct messages have their own unread count; nothing wrote one). `notify_user` now accepts only `friend_request`: `lobby_invite` and `join_request` are written by triggers, because leaving them open let any player forge one with their own title and link | Narrowing | Written, not run | `20261012000000_lobby_invites.sql` |
| 12f | Voice link | Not rechecked (the proposal mentions an optional Discord link) | `lobbies.discord_url`, an optional Discord invite readable only by the leader and members: the column is closed to the API and `lobby_voice_link()` answers only for them | Addition | Written, not run | `20261008000000_lobby_lifecycle.sql` |
| 13 | Party rules | Not specified | Stored as data on `game_modes` (and `game_ranks.party_band` for Free Fire), approximated from guides: Valorant ≤1 tier apart (not for a 5-stack), LoL Solo/Duo ≤1 tier, MLBB ≤2 tiers, PUBG Mobile ≤10 divisions, Free Fire two bands, CS2 none modelled | Addition | Built; ⚠️ not verified in-game |
| 14 | Lobby card | Not specified | Shows one rank fact, the leader's accepted range as icons and tier names ("Bronze to Gold", "Any rank"); the leader's own rank is not shown | Substitution | Built |
| 15 | Rank filter | Rank / role / region filtering (UI wording not rechecked) | One Rank dropdown: "Fits my rank", "All ranks", or a tier, meaning "lobbies that would accept it". Filters are not yet wired to the list | Substitution | Built, not wired |
| 16 | Score visibility | Not rechecked | Players never see `S_total` or its breakdown, only the resulting order | Narrowing | Built |
| 17 | Rank source | Not rechecked | Rank, role and in-game name are self-reported picks from the ladder; there is no Riot/Moonton integration and the UI says so | Narrowing | Live |
| 18 | CS2 ladder | Not rechecked | Models the 18-rank Competitive ladder, not the numeric Premier rating | Narrowing | Live |
| 19 | Free Fire ladder | Not rechecked | 20 steps; sources disagree (some list 23) | Open | Live; ⚠️ check in-game |
| 20 | Lobby chat | `lobby_messages` (persistence not rechecked) | Chats are temporary: ending a lobby clears them. Backend TODO: keep a moderator-only copy, since reports use chat as evidence | Open | Mock only |
| 21 | Landing page | Not specified | No survey figures, no comparison against Discord/Lita, no formula on the public page | Narrowing | Built |

## C. Not built yet (in the proposal, absent from the code)

Tracked in the "Spec vs. code" table of `thesis-spec.md`. Headline items:
lobbies and applications on real data, reviews, friendships and messages on
real data, reports and sanctions (migration written, not run), push (FCM) and
PWA, Discord linking, the recommendation formula wired into the lobby list,
server-side enforcement for the admin console (`AdminGate` is a client check;
RLS is the real protection).

## D. Questions to settle with the advisor

1. Is a 19-table model (13 + 6) acceptable, or should the proposal's ERD be
   revised? (Items 2, 3, 6, 7.)
2. Is an eligibility step beside `M_rank` within the proposal's scope, or does
   it need its own section? (Items 11 to 13.)
3. Are the researched ladders and party rules sufficient evidence, or must they
   be verified in each game before BAB 4? (Items 13, 18, 19; checklist in
   `game-reference.md`.)
4. Is self-reported rank acceptable given the proposal's emphasis on
   trustworthy behaviour data? (Item 17.)

## Decision log (internal)

- **2026-10-06, games schema.** A teammate built a parallel games slice with
  rank stored as free text (`20261005000000_user_games.sql`). It was never
  applied to the shared database and was dropped in favour of the catalog
  schema in item 6, because text cannot be compared, which `M_rank` and the
  eligibility step both need. Their UI (games editor, "About you" onboarding
  step, profile layout) was kept and connected to the catalog.
