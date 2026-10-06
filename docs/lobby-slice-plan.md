# Lobby slice plan (agreed, not built)

Parked on 2026-10-06 while the game images are collected. Nothing here exists
in the database yet. Divergences from the proposal are tracked in
[`thesis-divergences.md`](thesis-divergences.md); update it when this is built.

## Scope

**In:** create a lobby, real lobby lists on all six LFG pages, apply, the
leader accepts or declines, members, leave and close.
**Out (stay mock until a later slice):** chat, ratings, invites, the full lobby
detail screen.

## Tables

| Table | One row is | Notes |
|---|---|---|
| `game_modes` | one mode of one game (value, label, kind, max party, rotating) | Moved out of `src/data/game-modes.ts`. A lobby points at a row, so mode names stay consistent and the party limit travels with the mode. |
| `lobbies` | one lobby | Leader, game, mode, region, language, mic required, schedule, capacity, status (`open`, `live`, `scheduled`, `closed`), and an optional accepted rank range (lowest and highest rank, both nullable; both empty means "Any rank"). |
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
