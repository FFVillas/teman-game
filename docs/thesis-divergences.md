# Divergences from the proposal

Every place the build differs from the written proposal, so nothing has to be
reconstructed from memory for BAB 4 or the advisor meeting.

**Checked against:** *Clean Proposal Revisi 14 Oktober DOCS (1).pdf* (the copy
received 19 November 2026; its text is the same as the 17 November copy, only
some Lampiran 2 figures moved), section by section: 1.3 scope, 3.1.6
evaluation, 3.2.4 requirements, 3.3.1 formula and reputation rules, 3.3.2 use
cases, state diagram and class diagram, 3.3.4 database. **Code as of:** 19
November 2026, branch `fabian`.

When you add or change a divergence, edit the row here. The longer arguments
for the early data-model choices are in [`thesis-spec.md`](thesis-spec.md).

**Kind:** *Addition* (more than the proposal), *Substitution* (a different way
to the same goal), *Narrowing* (less than the proposal), *Not built* (in the
proposal, missing from the code). **Status:** *Live* (in the database and the
app), *Written* (migration exists, not yet run), *Planned*.

---

## A. Data model (3.3.4, class diagram, ERD)

The proposal's ERD has 22 tables: `user`, `access_role`, `user_access_role`,
`connected_accounts`, `game`, `rank_tier`, `game_role`, `user_game_mapping`,
`tag`, `user_tag`, `lobby`, `lobby_member`, `lobby_required_role`, `lobby_tag`,
`applications`, `friendships`, `direct_messages`, `lobby_messages`, `reviews`,
`review_tag`, `reports`, `sanction`. Names below are the database's.

| # | Area | Proposal | Build | Kind | Status | Where |
|---|------|----------|-------|------|--------|-------|
| A1 | User table | `user` | `profiles`, one row per Supabase Auth user (same id) | Substitution (name) | Live | `20260919000000_profiles.sql` |
| A2 | Access roles | `access_role` + `user_access_role` (user or admin) | One `admins` table; a player is anyone not in it. Staff have no player profile | Substitution | Live | `20260919000100_admin_roles.sql` |
| A3 | Connected accounts | `connected_accounts` (Discord, Steam); use case "Mengelola Profil" links third-party accounts | Not built. Onboarding's "Connect your accounts" step and the profile card only *look* connected and save nothing | Not built | Open decision | `components/onboarding/ConnectStep.tsx` |
| A4 | Age | An age attribute on `user`, minimum 18 | Date of birth in owner-only `profile_private`; others see only the derived age (`profile_age()`); 18+ enforced in the database | Substitution + Addition (1 table) | Live | `20261003000000_profiles_dossier.sql`, `20261115000000_minimum_age_18.sql` |
| A5 | Profile extras | `gender`, `available_time` | Same, with play time structured (`play_days`, `play_start`, `play_end`, `timezone`) and `languages` (list); picture in Storage (`avatar_path`) | Addition | Live | `20261003000100`, `20261004000000` |
| A6 | Role per game | `user_game_mapping` holds the main role (`game_role`) | `user_game_roles`: several roles per game, any of them marked favourite | Addition (1 table) | Live | `20261003000200_games.sql`, `20261015000000` |
| A7 | Game account IDs | In-game name | Plus `account_id` and `zone_id`, since the mobile games identify players by number | Addition (2 columns) | Live | `20261015000000_game_account_details.sql` |
| A8 | Rank order | `rank_tier.tier_order` | Column is `ordinal`; same meaning (0 = lowest) | Substitution (name) | Live | `20261003000200_games.sql` |
| A9 | Game modes | Not modelled | `game_modes` (each game's group modes, max party, party rule); a lobby points at one | Addition (1 table) | Live | `20261006000000_lobbies.sql` |
| A10 | Lobby members | `lobby_member` table with join time | A **view** over accepted `applications` (`joined_at` / `left_at` on the application), so membership has one source | Substitution | Live | `20261008000000`, `20261115000100_thesis_naming.sql` |
| A11 | Lobby slots | `max_slots` | `capacity` (2–5, capped by the mode) | Substitution (name) | Live | `20261006000000_lobbies.sql` |
| A12 | Invitations | Use case "Add Pemain"; no invite entity | `lobby_invites` (pending / accepted / declined / cancelled / expired); an invite holds a slot, accepting becomes an accepted application | Addition (1 table) | Live | `20261012000000_lobby_invites.sql` |
| A13 | Notifications | Notification feature (3.2.4 no. 5), no table in the ERD | `notifications` rows, written by database triggers so nobody can forge one | Addition (1 table) | Live | `20261006000000`, `20261010000000` |
| A14 | Blocks | Not modelled | `blocks` (a player hides another from their Social lists) | Addition (1 table) | Live | `20261007010000_social.sql` |
| A15 | News | Not modelled | `news` per game on the LFG page | Addition (1 table) | Live | `20261007000000_news.sql` |
| A16 | Moderation records | `reports`, `sanction` | Plus `sanction_reports` (which reports a sanction answers) and `admin_actions` (audit log); `reports.status` has an extra `in_review` (a moderator has claimed it). Written only through admin functions that require a reason and log themselves | Addition (2 tables) | Written (functions) | `20260919000200_reports_moderation.sql`, `20261119000200_admin_moderation.sql` |
| A17 | Report evidence | `reports` holds "bukti" | A file in the private `report-evidence` bucket, path in `reports.evidence_path`; players insert only the descriptive columns; no self-reports | Substitution | Live | `20261118000100_report_evidence.sql` |
| A18 | Push devices | FCM named, no table | `push_tokens` (one row per device, moved on sign-in, removed on logout) | Addition (1 table) | Written | `20261119000000_push_notifications.sql` |
| A19 | Push cooldown | Not specified | `push_throttle` (when each player was last pushed about each chat) | Addition (1 table) | Written | `20261119000100_chat_push.sql` |

**Table count:** 22 in the proposal. The build has 18 of them as tables
(`lobby_member` is a view; `access_role`, `user_access_role` and
`connected_accounts` don't exist) plus 12 of its own: `admins`,
`profile_private`, `user_game_roles`, `game_modes`, `lobby_invites`,
`notifications`, `blocks`, `news`, `sanction_reports`, `admin_actions`,
`push_tokens`, `push_throttle`. That is 30 tables once the two push
migrations run.

## B. Recommendation and reputation (3.3.1.2, Persamaan 3.1 to 3.15)

| # | Area | Proposal | Build | Kind | Status | Where |
|---|------|----------|-------|------|--------|-------|
| B1 | Formula | S_total = 0.40P + 0.30R + 0.30T; Persamaan 3.15 when \|B\| = 0 | As written; tested with the proposal's worked example (T = 0.83) and boundaries | Same | Live | `lib/recommendation.ts`, `lib/lobby-ranking.ts`, `*.test.ts` |
| B2 | Hard filters | Game and the lobby's rank range | Same, plus each game's **party rule** (how far apart ranks may be in a group, given who is already in), checked again when the leader accepts | Addition | Live | `lib/ranks.ts`, `lobby_join_bounds()` |
| B3 | Optional filters | Role (lobbies needing other roles still show) | Same, plus region, mode and text search, and sort (Recommended, Latest, Most players, Open slots) | Addition | Live | `lib/lobby-filters.ts` |
| B4 | Lobby playstyle (Pb) | Pre-filled from the leader's profile playstyle, changeable | As written (since 19 Nov). Older lobbies saved without one fall back to the leader's profile playstyle | Same | Live | `CreateTeamForm.tsx`, `fetchMyPlaystyle()` |
| B5 | Reciprocal ranking (leader's side) | When the leader reviews applicants, R is the applicant's reputation and applicants are ranked | As written (since 19 Nov): the join-request list and the invite picker are both ordered by S_total with the applicant's own R; the score is never shown | Same | Live | `fetchLobbyDetail` (`applicantScore`), `RealInvitePlayersModal` |
| B6 | Neutral prior m | Average of all ratings on the platform; 3 at launch | Fixed at 3 | Narrowing | Live | `20261116000300_reputation_bayes.sql` |
| B7 | Rating weight w_i | Computed and **stored** when the review is sent | Bias and corrected rating are stored then; the weight (1/k per rater in the window) is computed when reputation is recomputed, from the current window | Substitution | Live | `review_weight()` |
| B8 | Release of ratings | After everyone rated or 48 hours | Same; released on the next read (`release_due_reviews()`), no scheduler | Substitution (mechanism) | Live | `20261116000300` |
| B9 | Member reputation on the card | The lobby card shows every member's reputation | Removed on request; the data is still on `LfgTeam.members` | Narrowing | Open decision | `LfgTeamCard.tsx` |
| B10 | Score visibility | Not specified | Players never see S_total, only the order | Narrowing | Live | |
| B11 | Rank source | Self-declared (scope 1.3 a) | Same; the fake "detect rank automatically (preview)" was removed because it invented a rank | Same | Live | `RankRoleStep.tsx` |
| B12 | Sensitivity analysis | Weights ±0.10 and the equal-interval playstyle assumption tested at evaluation | Not built yet | Not built | Planned (step 7) | |

## C. Lobby, rating and social rules

| # | Area | Proposal | Build | Kind | Status | Where |
|---|------|----------|-------|------|--------|-------|
| C1 | Lobby states | scheduled / open → in_progress → completed, or cancelled; completed and cancelled final | Same five; **plus** reopen (in_progress → open, when someone left and needs replacing) | Addition | Live | `20261008000000_lobby_lifecycle.sql` |
| C2 | Automatic ending | Not specified | A started lobby completes after 6 h, a recruiting one is cancelled after 6 h, an unstarted scheduled one 3 h after it was due (`expire_stale_lobbies`, run on read) | Addition | Live | `20261008000000` |
| C3 | One lobby at a time | Not specified | One live or in-progress lobby per player, several scheduled ones. Starting or joining a live lobby withdraws the player's other pending requests | Addition | Live / Written | `20261118000300_withdraw_other_requests.sql` (Written) |
| C4 | Lobby edits and removal | Not specified | The leader edits a lobby (size, range, roles, schedule locked once started) and can remove a member | Addition | Live | `20261009000000_lobby_edit.sql` |
| C5 | Writes | Not specified | Lobby, application, invite and review writes only through database functions; clients can't insert directly | Substitution | Live | |
| C6 | Rating rules | Completed lobby, ≥ 15 minutes in progress, one rating per member, 1–2 stars need a reason, anonymous | As written | Same | Live | `submit_review` |
| C7 | Rating pop-up | Shown to every member when the lobby completes | A "Rate teammates" banner on the lobby page and the match page; skippable, picked up later | Substitution | Live | `RealLobbyDetail.tsx` |
| C8 | Lobby chat kept | Not specified | Kept after the lobby ends (closed to players, readable by admins as evidence); `system` lines from triggers; 30 messages a minute | Addition | Live | `20261011000000_lobby_messages.sql` |
| C9 | Direct messages | Between players who are **already friends** | Any signed-in player can message any other; the database does not check friendship or blocks | Narrowing | Live | `20261007000000_direct_messages.sql` |
| C10 | Voice | Optional Discord link on the lobby | Same, readable only by the leader and members | Same | Live | `lobby_voice_link()` |
| C12 | Deleting an account | Not specified | Self-service from Settings (username typed, password re-entered); refused while suspended and for staff; removes the player's reports and sanctions with everything else, and recomputes the reputation of players they rated (their ratings go with them). Backs the UU PDP right to erasure | Addition (function) | Written | `20261119000300_delete_own_account.sql` |
| C11 | Match history | Not an entity | A match is a completed lobby, read through `player_matches()` | Addition (function) | Live | `20261118000000_match_history.sql` |

## D. Notifications, PWA, push

| # | Area | Proposal | Build | Kind | Status | Where |
|---|------|----------|-------|------|--------|-------|
| D1 | Install | PWA, "tanpa perlu instalasi" but installable to the home screen | Manifest, icons, service worker, offline screen, "Install app" | Same | Live | `app/manifest.ts`, `public/sw.js` |
| D2 | Push path | FCM sends push, e.g. on application or invite | Same, via a database trigger → `/api/push` (Next.js) → FCM; opt-in per device in Settings | Same + detail | Written (needs the Firebase setup) | `20261119000000` |
| D3 | What pushes | Join invitations, applications | Every bell notification: join request, accepted, declined, invite, lobby started, removed, friend request | Addition | Written | |
| D4 | Chat push | Not specified | DMs and lobby chat push too, one per conversation per cooldown (1 min DM, 3 min lobby) | Addition | Written | `20261119000100_chat_push.sql` |

## E. In the proposal, not built yet

| # | What | Plan |
|---|------|------|
| E1 | Admin console on real data | Built 19 Nov (step 6), waits on migration `20261119000200`. Admin check on the server, real reports, sanctions, lobbies and audit log; suspension enforced at sign-in. Gap: an already-open tab keeps API access until its token expires (≤ 1 h) |
| E2 | Connected accounts (A3) | Open decision: build or narrow the proposal |
| E3 | Join-request list ranked by S_total (B5) | Done 19 Nov |
| E4 | Sensitivity analysis (B12), black-box table with traceability matrix, k6 scripts | Step 7 |
| E5 | Adding a game "only by adding data" (scope 1.3) | Nearly: game, ranks, roles and modes are data, but regions (`data/game-regions.ts`), account-ID formats (`data/game-accounts.ts`) and the navbar list (`data/games.ts`) are in code |
| E6 | Google / Discord sign-in | Not in the proposal; buttons shown but not wired (`OAUTH_ENABLED`) |

## F. Questions for the advisor

1. The ERD has 22 tables; the build replaces three (A1–A3) and adds 12
   (section A). Revise the ERD in BAB 4, or describe the additions there?
2. Is the party-rule eligibility step (B2) within scope, or does it need its
   own paragraph in 3.3.1.2?
3. B6 and B7: is a fixed m = 3 and a weight computed at recompute time
   acceptable, given C is already fixed at 5 for the same reason (too little
   UAT data)?
4. C9: should DMs be limited to friends as written, or should 3.3.4.3 drop
   "yang sudah berteman"?
5. Are the researched rank ladders and party rules enough evidence, or must
   they be verified in each game first? (`game-reference.md`)

## Decision log (internal)

- **2026-10-06, games schema.** A teammate built a parallel games slice with
  rank stored as free text (`20261005000000_user_games.sql`). It was never
  applied to the shared database and was dropped in favour of the catalog
  schema, because text cannot be compared, which the rank filter needs. Their
  UI (games editor, "About you" onboarding step, profile layout) was kept and
  connected to the catalog.
- **2026-11-16, thesis names.** Tables and lobby statuses renamed to the
  proposal's (`20261115000100_thesis_naming.sql`); `access_role` was not
  adopted (A2), and `lobby_member` stayed a view (A10).
- **2026-11-19, fake actions removed.** Friend-list invites, Recent
  Teammates and rank detection used to pretend; the first two are real now,
  the third is gone.
