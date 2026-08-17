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
S_total = (weighted combination of P, R, T) × M_rank
```

`S_total` lands in 0.00–1.00. Components:

| Sym | Meaning | Formula |
| --- | --- | --- |
| `P` | Playstyle proximity | `1 − |P_a − P_b| / 4` over a 1–5 Likert scale ("Sangat Kasual" → "Sangat Kompetitif"). Identical = 1.00; 5-vs-1 = 0.00. |
| `R` | Reputation | `avg_stars / 5`. A 5.0 player contributes 1.00; a 1.5 player contributes 0.30. |
| `T` | Personality tag match | `|A ∩ B| / |B|`, where A = applicant's tags, B = tags the lobby asks for (max 3). **Edge case: when `|B| = 0`, `T = 1`** — no criteria means the leader is flexible. |
| `M_rank` | Rank distance penalty | Linear decay on `ΔR` = absolute sub-rank distance, tolerance `ΔR = 10`, degrading to a **floor of 0.30** (never 0 or negative). |

Personality tags: Shot Caller, PMA (Positive Mental Attitude), Chill,
Never Surrender, Flex Player.

> The exact weights on P/R/T are in the proposal's Persamaan 3.1, which
> is a rendered image — not transcribed here. Get them from the PDF
> before implementing.

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
| Lobbies ranked by `S_total` | "Recommended Teams" is a static label; `lfgTeams` renders in array order |
| Reputation (stars, sanctions, tags) | no reputation field on `LfgTeam` |
| Playstyle 1–5 Likert | closest is free-text `vibeTags` in the create form |
| Personality tags | not modeled |
| PWA (service worker, manifest, FCM) | none present |
| Supabase + Auth + RLS | no backend; submit handlers are `// TODO` + `router.push` |
| Rank/role/region filtering | `LfgToolbar` has a hardcoded `resultCount={128}`; `SortDropdown` not wired |

**Terminology drift:** the proposal says **lobby**, the code says
**team** (`LfgTeam`, `lfg-teams.ts`). Same concept. Worth unifying
before the backend lands.

**Rank ladder gap:** `lfg-ranks.ts` holds 4 Valorant ranks with no
ordinal value. The `ΔR` penalty needs a fully ordered sub-rank ladder
(Iron 1 … Radiant) to compute distance against.

## Source material

- Proposal PDF — held by the team, not in this repo. Contains the
  figures (ERD, class/activity/sequence diagrams, data dictionaries,
  and the Persamaan 3.1 weights) as images.
- Figma `CQg1F1t0GJh5BmiDacwNvC` — holds both the UI design and the UML
  diagrams. See `AGENTS.md` for the node map.
