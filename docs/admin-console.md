# Admin console

The moderation side of TemanGame: the **Admin** actor from the proposal
(moderation, sanctions, bans). Frontend only for now — every screen runs on
mock data in `src/data/admin-moderation.ts`, persisted to `localStorage`.

## Decisions (agreed with the team)

1. **Separate staff accounts.** Admins are not players with an extra flag.
   A moderator shouldn't rule on reports from the account they queue ranked
   with. There is no admin sign-up; accounts are created by hand.
2. **Same `/login`, role decides where you land.** Admins go to `/admin`.
   Anyone else who opens `/admin/*` gets the normal **404** (not "access
   denied"), so the console doesn't advertise itself.
3. **Option B for the data model** — two new tables on top of the 13-entity
   ERD: `sanctions` and `admin_actions`. The ERD / class diagram in the thesis
   need updating to match (15 entities).
4. **Report queue first.** Players and lobbies pages exist, but they're mostly
   reached *from* a report, to check context before deciding.

## Demo login

| Email | Admin |
| --- | --- |
| `admin@temangame.dev` | Rani |
| `arga@temangame.dev` | Arga |

Any password. Defined in `src/data/admin-accounts.ts`. Every other email logs
in as the usual mock player. To reset the demo data, clear the
`temangame:admin-data:v1` key in localStorage.

## Pages

| Route | Purpose |
| --- | --- |
| `/admin` | Overview: unresolved reports, longest wait, active lobbies, restricted accounts, repeat-report players, recent activity |
| `/admin/reports` | Queue. High severity first, then oldest first. Tabs by status, search, reason filter |
| `/admin/reports/[id]` | Case: statement + evidence, lobby chat (reported player's lines highlighted), other reports against them, player standing, reporter credibility, decision |
| `/admin/players` | Every player with derived account status, reputation, unresolved reports, sanctions |
| `/admin/players/[id]` | Sanction history (lift), reports received / filed, lobbies, issue sanction |
| `/admin/lobbies` | Every lobby, live first. Tabs by status |
| `/admin/lobbies/[id]` | Roster (remove member), reports from this lobby, read-only chat log, close lobby |
| `/admin/audit-log` | Append-only list of every decision, filter by action and admin |

## Moderation rules the UI enforces

- **Graduated sanctions:** warning → suspension (1/3/7/30 days) → permanent
  ban. `suggestedSanction()` proposes the next step from history; the admin
  still chooses.
- **Every action records a reason** (min. 10 characters) and writes an
  `admin_actions` row. The note is internal; the player sees the rule broken,
  never who reported them.
- **Nothing is deleted.** Lobbies are *closed*, sanctions are *lifted*, and
  both stay on record.
- **Account status is derived** from sanctions (`accountStatus()` in
  `src/lib/admin.ts`): active ban → banned, unexpired suspension → suspended,
  warning within 90 days → warned. Store a copy on `user` for the login check
  if needed, but `sanctions` is the source of truth.
- **Severity triage:** hate speech, harassment and cheating are high severity
  (`reasonSeverity()`).
- **Claiming a case** sets it to *In review* with the admin's name, so two
  moderators don't work the same report.
- **One decision can close several reports** against the same player (tick
  them on the case page).
- **Reporter credibility:** flagged when at least two of their reports were
  decided and most were dismissed.

## Data model additions

```
reports        + status (open | in_review | resolved | dismissed)
               + assigned_to  → admin user id
               + resolution_outcome, resolution_note, resolved_by, resolved_at
               + sanction_id  → sanctions.id (nullable)

sanctions      id, player_id → user.id, type (warning | suspension | ban),
               duration_days, reason, note, issued_by → user.id, issued_at,
               expires_at, lifted_at, lifted_by, lift_reason
               (+ join table sanction_reports if one sanction closes many reports)

admin_actions  id, admin_id → user.id, type, target_type (player | lobby | report),
               target_id, summary, reason, created_at      -- insert-only

lobby          + status gains 'closed', + closed_at, closed_by, closed_reason
```

Types mirroring these live in `src/data/admin-moderation.ts`. The mutations
in `src/contexts/AdminDataContext.tsx` are the seams for the real API — each
one should become a single transaction that also inserts its `admin_actions`
row.

## Not built yet

- Server-side protection: `AdminGate` is a client check. Move it to
  middleware (Supabase session + role) and protect the tables with RLS.
- Notifying players about sanctions / closed lobbies (FCM). Marked `TODO`.
- Evidence preview (needs a storage bucket).

Appeals are **out of scope** by team decision (not in the proposal's use
cases).

## Suspended / banned login

Logging in with a player email that has an active suspension or ban (see
`restrictionForEmail()` in `src/lib/admin-store.ts`) creates **no session**
and routes to `/account-restricted`, which shows the rule broken and the
dates. It never shows the moderator's note, the moderator, or the reporter.
The notice is passed through sessionStorage, not the URL. It reads the same
localStorage the console writes, so a sanction issued in `/admin` applies on
the next login in that browser, and an expired or lifted one stops applying.

Demo: `carrypotter@mail.com` (3-day suspension), `lagswitch@mail.com`
(banned). Any password.

Still TODO once Supabase exists: reject the sign-in server-side, and revoke
sessions that are already open when a sanction is issued.
