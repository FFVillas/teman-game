# Work log: November 2026, from the proposal to UAT

What has been built since the 14 October proposal revision, and what is left.
It continues `docs/proposal-revision-2026-10.md` (the plan your teammate wrote,
in Indonesian): Phase 1 there, the database side of the reputation engine, was
done by 16 November. This file covers the app side that followed.

**Status on 19 November 2026:** steps 1 to 4 done, step 5 built (push waits
on the Firebase setup and a phone test), steps 6 to 8 not started.

---

## The plan

Built from the revised proposal, in this order because each step unblocks the
evaluation the proposal promises (UAT, black-box, k6, Precision@5).

| # | Step | Status |
|---|------|--------|
| 1 | Ranked and filtered LFG list (S_total for the applicant, R_lobi, filters) | ✅ Done |
| 2 | Real match history, ratings after a real lobby, reports saved | ✅ Done |
| 3 | Reputation on screen: new-player label, sanction history, suspended players left out | ✅ Done (member stars on the card removed for now, see "Open") |
| 4 | Deploy (Vercel) | ✅ https://teman-game.vercel.app, region `sin1` next to Supabase |
| 5 | PWA (manifest, service worker) and FCM push | ◐ PWA done and installed on Windows; push built, needs Firebase setup and phone tests |
| 6 | Admin console on Supabase, admin check on the server | ◐ Built; run the migration and test with an admin account |
| 7 | Evaluation kit: Precision@5 seed ✅, Vitest ✅, sensitivity-analysis script, black-box table with traceability matrix, k6 scripts | ◐ Partly |
| 8 | Remove the mock lobby routes and data before UAT | ✅ 19 Nov |

---

## Step 1: ranked and filtered lobby list

Proposal 3.3.1.2: hard filters, then lobbies ordered by S_total.

- **Filters**, all in the URL (`?q=&region=&mode=&rank=&role=&sort=`):
  - The rank range the lobby accepts is a hard filter, default "Fits my rank".
  - Role is optional: lobbies that name no role always stay.
  - Region, mode and text search narrow the list.
  - Sort: Recommended (default), Latest, Most players, Open slots.
- **Score** on the server for the signed-in player:
  - `P` uses the lobby's playstyle, falling back to the leader's.
  - `R` is `R_lobi`, the members' mean R* (Persamaan 3.4).
  - `T` uses the lobby's wanted tags weighted by tag strength; with no wanted tags it uses Persamaan 3.15.
  - Players see only the order, never the numbers.
- **Endpoint** `GET /api/lobbies/recommended?game=<slug>` returns the same list as JSON, for k6 and Precision@5.
- **Files:** `lib/lobby-ranking.ts`, `lib/lobby-filters.ts`, `lib/use-lobby-filters.ts`, `components/lfg/LfgSearchBar.tsx`, `LfgSort.tsx`, `app/api/lobbies/recommended/route.ts`. `teamJoinBounds` moved to `lib/ranks.ts`, so the join dialog and the filter share one rule.
- **Verified:** for Test5 (very casual, Gold 2) the order matched hand-computed scores:

  | Lobby | S_total |
  |---|---|
  | Chill Unrated Night | 0.90 |
  | Balanced Swiftplay | 0.69 |
  | Spike Rush Warmup | 0.58 |
  | My Demo Lobby | 0.50 |

## Step 2: match history, ratings, reports

- **Match history:** a match is a completed lobby. `player_matches()` lists a player's matches and teammates, and for your own history which teammates you have rated. It never reveals who rated you.
- **Rating:**
  - When a lobby has ended, everyone who played sees "Rate teammates" on the lobby page, or later on their match page.
  - The queue saves each teammate as it goes.
  - 1–2 stars need a reason (AFK, flaming, trolling, verbal abuse).
  - The tags offered are the five personality tags, strongest first for that teammate, none pre-picked.
  - A note says ratings are anonymous and the score updates once everyone has rated or after 48 hours.
- **Reports:**
  - Saved from the rating queue and from `/profile/<user>/report`, with the lobby attached when reporting from a match.
  - An evidence file goes to a private bucket that only the reporter and admins can read.
  - Players can insert only the descriptive columns, so they can't file a report already marked resolved. Self-reports are refused.
- **Files:** `lib/matches.ts`, `lib/reviews.ts`, `lib/reports.ts`, `lib/use-rating.ts`, `data/review-options.ts`, `RatingModal.tsx`, `MatchDetailView.tsx`, `ReportPlayerPanel.tsx`. The match and profile pages now read real data first and fall back to mock.
- **Verified end to end:**
  1. Test5 rated demo_neon 5★ with Chill, and demo_brim 2★ with AFK.
  2. Both teammates showed as Reviewed on the match page.
  3. The report on demo_brim saved.

## Step 3: reputation on screen

- **Profile header:**
  - The star average with "x ratings from y players".
  - A **New player** label when fewer than 5 different players rated them (proposal: "Pemain Baru").
- **Sanction history card on the profile:**
  - Shows each warning or suspension with the rule broken, the dates, and "Active" while running.
  - The moderator's note is never shown, and lifted sanctions are left out.
- **Suspended players are left out of recommendations:** their lobbies drop off the list, and they don't appear in the invite picker.
- **Computed columns:** `rater_count` and `is_suspended` are database functions that the lobby query can ask for like ordinary columns, so they cost no extra request.
- **Files:** `lib/reputation.ts`, `PlayerProfileView.tsx`, `lib/profiles.ts` (`fetchSanctionHistory`), `lib/lobbies.ts`, `lib/invite-candidates.ts`.
- **Removed on request:** each member's stars under their face on the LFG card. The data is still on `LfgTeam.members` (`rating`, `isNew`), ready for a better placement.

## Wording review (18 Nov)

| Where | Change |
|---|---|
| Create form, LFG page | "Team" became "Lobby" (Create a Lobby, Lobby name, Recommended Lobbies, Search Lobbies) |
| Create form | "Gamemode Selection" became "Game Mode"; a truthful subtitle |
| Navbar, Social | "CSGO 2" became "CS2" |
| Footer | Honest tagline; typo "Moible" fixed; "PUBG: BATTLEGROUNDS" became "PUBG Mobile"; game links go to each LFG page. The placeholder links (About Us, Tournaments, Community, Twitter, Twitch, Cookie Policy) were restored on request |
| Landing | No schedule or playstyle *filter* claims (playstyle orders, it doesn't filter) |
| LFG description | No "professional teams" |
| Privacy, Terms | Minimum age 13 became **18** (UU PDP No. 27/2022); no "Ban" sanction; sanction history is public; ratings are anonymous, need a reason at 1–2 stars, and need 15 minutes of play |
| Support FAQ | Explains the real recommendation: filters, then playstyle, reputation and tags |
| Profile of someone else | "teammates rate **you**" is shown only to the owner |
| Notifications, Settings | No promised notification kinds that don't exist; no "PWA work" jargon |
| Join pop-up | No invented "leaders respond within 5–10 minutes"; bigger text in the right card |
| LFG card | Mode badge on one line with short names for long modes (`data/mode-badges.ts`); no "Looking for" in games without roles; "Any role" when a lobby names none |

## Also changed along the way

- **Merge with main (17 Nov):** your teammate renamed tables to the thesis names (`lobby`, `game`, `rank_tier`, …) and statuses (`open`, `in_progress`, `cancelled`). While merging I updated the live-update subscriptions to the new names and fixed a `games(slug)` left in `lib/lobby-chat.ts`.
- **Vitest:** `npm test` runs 39 tests, including the proposal's worked example (T = 0.83) and its boundary values.
- **Demo seed rewritten** (`supabase/dev-seed/seed.sql`):
  - 51 demo players and 5 open test lobbies in each of the six games, which double as the Precision@5 test lobbies.
  - Reputation comes from real rating rows, so the counts agree.
  - `cleanup.sql` removes all of it, demo reports and sanctions included.

---

## After step 3 (18 Nov)

- **Create form:** hint lines removed; "Any rank" / "Any role" are pills
  instead of checkboxes; languages are added with a "+ Add" pill; the mic icon
  is no longer stretched; group size can't go below 2 (the database already
  refused it).
- **Add friend on a profile works** (it had no click handler): add, request
  sent (click to cancel), accept their request, or friends.
- **Pointer cursor** on everything clickable (Tailwind v4 had dropped it).
- **Empty lobby list** is quieter.
- **Filters** show the new choice at once; the list follows when the server
  answers.
- **Pending join requests** are withdrawn automatically when the player starts
  a live lobby or is accepted into one (`20261118000300`).
- **Performance check:** each Supabase round trip costs 80–300 ms from
  Indonesia, so pages are slow because of trips in a row, not missing indexes.
  The main queries are all indexed. Kept for later: pg_cron for
  `expire_stale_lobbies` (one trip less per lobby page) and an index on
  `sanction(player_id)`.

## Step 5A: PWA

- Installable: manifest, icons, iOS home-screen tags, "Install app" in the
  account menu and an App card in Settings (with the iPhone steps).
- Service worker: offline screen when there is no network, cached build files
  and images. Pages and data are never cached.
- Verified on a production build: manifest served, `sw.js` sent uncached,
  `/offline` and every file it needs load. The desktop app's browser pane
  can't register service workers, so installing must be checked in Chrome or
  on a phone.

## Step 5B: push (FCM)

- Opt-in per device in Settings → Notifications; iPhone needs the home-screen
  app first, and the card says so.
- Every new notification row is pushed: join requests, answers, invites,
  lobby started, friend requests. Tapping opens the same page the bell would.
- Path: `notifications` insert → trigger (pg_net) → `/api/push` → FCM → the
  service worker shows it. Secrets: Firebase service account on Vercel,
  webhook URL and secret in Supabase Vault.
- Verified so far: build passes, `/api/push` refuses calls without the
  secret. Real delivery waits on the Firebase project.

## Fake-action sweep (19 Nov)

Buttons that looked like they worked but saved nothing, now fixed:

- **Invite from the friend list** sends a real lobby invite (to the lobby the
  player leads that is still recruiting), instead of a "sent" toast.
- **Recent Teammates** lists real people from finished lobbies (newest first,
  friends left out), not mock players.
- **"Detect rank automatically (preview)"** in onboarding is gone: it invented
  a rank from the username and saved it as real.
- **Social sidebar** no longer shows a mock player to visitors.

## Step 6: admin console on real data

- `/admin` is a 404 for anyone not in `admins`, decided on the server.
- Reports, sanctions, players, lobbies (with members and chat) and the audit
  log come from the database. Each action is one admin-only database function
  that requires a reason and writes the audit entry itself.
- The case page opens the evidence file (private, 5-minute link) and shows the
  reasons behind 1–2 star ratings the player received (raters not named).
- A suspension works: the player is signed out at login (or on the next page
  load) and sees the rule and dates; their lobbies leave the list; it shows in
  their sanction history. Lengths 1, 3, 7, 30 days; no ban.

## Before UAT (19 Nov)

- **Step 8:** mock lobbies, their screens and every mock dataset removed;
  unknown lobbies and usernames 404.
- **Join requests ranked** for the leader (proposal's reciprocal ranking).
- **Forgot password** (`/forgot-password`, `/reset-password`); the login
  page's link used to lead to a 404.
- **"Couldn't load lobbies"** with Try again, instead of an empty list.
- **Cancel a join request** from the LFG card.
- **Remove friend** from the friend list and the profile.
- **Avatars open profiles** in Social and chat.
- **Settings** redesigned (GitHub-style sections).
- **Push prompt** once after sign-in, again after 14 days on "Not now";
  Settings keeps the switch.

## Migrations

Applied by hand in the Supabase SQL editor; never edit one that has run.

| Migration | What | Run? |
|---|---|---|
| `20261117000000_realtime_lobby_renamed.sql` | Live updates under the new table names | ✅ |
| `20261118000000_match_history.sql` | `player_matches()` | ✅ |
| `20261118000100_report_evidence.sql` | Report insert rights, no self-reports, evidence bucket | ✅ |
| `20261118000200_reputation_display.sql` | `rater_count`, `is_suspended`, `sanction_history()` | ✅ |
| `20261118000300_withdraw_other_requests.sql` | Withdraw pending requests on joining or starting a live lobby | ⬜ run it |
| `20261119000000_push_notifications.sql` | `push_tokens`, the push trigger (pg_net), token functions | ⬜ run it |
| `20261119000100_chat_push.sql` | Push for DMs and lobby chat, with a per-conversation cooldown | ⬜ run it |
| `20261119000300_delete_own_account.sql` | Self-service account deletion | ⬜ run it |
| `20261119000200_admin_moderation.sql` | Admin functions (claim, dismiss, sanction, lift, close lobby, remove member), admin-only reads, suspension notice; direct moderation writes revoked | ⬜ run it |

## Where things are now

- **Test account:** Test5 (onboarded as very casual, Gold 2, Valorant).
- **Seed:** re-run `seed.sql` with `me_username = 'Test5'`. The earlier run failed on the demo report, which is now fixed.
- **Dev server:** `npm run dev` on port 3000.
- **Uncommitted:** everything since step 2, i.e. step 3, the wording review and the latest fixes.

## Open decisions (come back to these after the PWA)

1. **Out-of-scope promises:** onboarding's "Connect your accounts" step, its "Detect rank automatically (preview)" button, and the profile's "Connections" card. The proposal excludes Discord and game-API integration. I'd remove them.
2. **Member reputation on the LFG card:** the proposal says the card shows each member's reputation. Removed for now; it needs a better design.
3. **Footer placeholder links:** they still go nowhere (`#`), and black-box testing will hit them. Hide them before UAT, or give them pages.
4. **Error state:** a failed lobby query still looks like "No lobbies yet". Worth a "Couldn't load lobbies" message before UAT.
5. **Google / Discord login:** the buttons show but do nothing yet (kept
   visible on request; `OAUTH_ENABLED` in `components/auth/OAuthButtons.tsx`
   hides them). To build: enable the providers in Supabase Auth and call
   `signInWithOAuth`.
6. **Still mock, by plan:** the admin console (step 6) and the mock lobby
   routes `lobby-1`… (step 8). The onboarding "Connect your accounts" step
   (item 1) marks accounts "Connected" without linking anything.

## Next

Finish 5B: Firebase project, the four settings on Vercel, the Vault secrets,
then test on Android and a real iPhone (iOS 16.4+, home-screen app). After
that, the open decisions above, then step 6 (admin console on Supabase).
