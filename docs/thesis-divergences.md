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
| 10 | Region lists and game modes | Not specified | App-side lists for now; `game_modes` / `game_regions` tables are the likely move once lobbies are stored | Open | Planned | `src/data/game-modes.ts` |
| 11 | Lobby rank range | Only the leader's own rank (`M_rank`) | Lobby gets an optional accepted range (two nullable columns on `lobby`, no new table) | Addition | Planned (UI built on mock data) | `src/lib/ranks.ts` |

**Table count:** 13 in the proposal, 19 once the model above is built (20 or 21
if modes and regions become tables). The arithmetic is in `thesis-spec.md`.

## B. Behaviour and rules

| # | Area | Proposal | Build | Kind | Status |
|---|------|----------|-------|------|--------|
| 12 | Rank matching | Rank closeness scores a candidate (`M_rank = max(0.30, 1 − 0.07·ΔR)`) | Kept as the *ordering*. Added a separate yes/no *eligibility* step: leader's optional range plus each game's party rule applied to who is already in the lobby | Addition | Logic built and tested, UI on mock data |
| 13 | Party rules | Not specified | Per game, approximated from guides: Valorant ≤1 tier apart (not for a 5-stack), LoL Solo/Duo ≤1 tier, MLBB ≤2 tiers, PUBG Mobile ≤10 divisions, Free Fire two bands, CS2 none modelled | Addition | Built; ⚠️ not verified in-game |
| 14 | Lobby card | Not specified | Shows one rank fact, the leader's accepted range as icons plus divisions ("Bronze 1 to Gold 3", "Any rank"); the leader's own rank is not shown | Substitution | Built |
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
