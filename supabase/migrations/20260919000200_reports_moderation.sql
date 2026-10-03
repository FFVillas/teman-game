-- Reports/sanctions/moderation — NOT run yet as of 2026-09-19. Hold off
-- applying this migration until the report feature is actually being
-- built; the Account/Login/Profile/Roles slice (this migration's only
-- dependency, `20260919000100_admin_roles.sql`'s `admins` table plus
-- `profiles`) doesn't need any of this to work.
--
-- DIVERGES from the proposal's entity count: adds `sanctions`,
-- `sanction_reports`, and `admin_actions` — three tables not in the
-- original 13-entity ERD — plus extra columns on `reports` beyond what
-- the proposal's data dictionary describes. The proposal's own `reports`
-- entity already covers "status penanganan tiket... catatan resolusi
-- dari administrator," so this is best framed as *detailing* that
-- entity rather than inventing a new one. See docs/thesis-spec.md.

-- ─── Reports ────────────────────────────────────────────────────────
-- The proposal's `reports` entity, built with the full shape
-- admin-console.md actually needs (status/assignment/resolution) rather
-- than a bare version we'd just have to alter later.
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles (id),
  target_id uuid not null references public.profiles (id),
  -- No FK yet — `lobbies` doesn't exist until the Lobby slice lands.
  -- Add `references public.lobbies (id)` then; the column exists now so
  -- reports can already record lobby context.
  lobby_id uuid,
  reason text not null,
  details text,
  evidence_url text,
  status text not null default 'open'
    check (status in ('open', 'in_review', 'resolved', 'dismissed')),
  assigned_to uuid references public.admins (user_id),
  resolution_outcome text,
  resolution_note text,
  resolved_by uuid references public.admins (user_id),
  resolved_at timestamptz,
  -- FK added after `sanctions` is created below (forward reference).
  sanction_id uuid,
  created_at timestamptz not null default now()
);

alter table public.reports enable row level security;

-- Reporter sees their own submissions; the reported player does NOT see
-- reports filed against them (admin-console.md: "the player sees the
-- rule broken, never who reported them") — only admins get full
-- visibility.
create policy "Reporters and admins can view reports"
  on public.reports for select
  to authenticated
  using (reporter_id = auth.uid() or public.is_admin(auth.uid()));

create policy "Players can file reports as themselves"
  on public.reports for insert
  to authenticated
  with check (reporter_id = auth.uid());

create policy "Admins can update report status and resolution"
  on public.reports for update
  to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

grant select, insert on public.reports to authenticated;
grant update (status, assigned_to, resolution_outcome, resolution_note, resolved_by, resolved_at, sanction_id)
  on public.reports to authenticated;

-- ─── Sanctions ──────────────────────────────────────────────────────
create table public.sanctions (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.profiles (id),
  type text not null check (type in ('warning', 'suspension', 'ban')),
  duration_days integer,
  reason text not null,
  note text,
  issued_by uuid not null references public.admins (user_id),
  issued_at timestamptz not null default now(),
  expires_at timestamptz,
  lifted_at timestamptz,
  lifted_by uuid references public.admins (user_id),
  lift_reason text
);

alter table public.sanctions enable row level security;

alter table public.reports
  add constraint reports_sanction_id_fkey
  foreign key (sanction_id) references public.sanctions (id);

-- A player can see their own sanction history (this is exactly the
-- "sanction history" transparency respondents rated highest in the
-- survey — BAB 3.2.1). Admins see everyone's.
create policy "Players can view their own sanctions, admins view all"
  on public.sanctions for select
  to authenticated
  using (player_id = auth.uid() or public.is_admin(auth.uid()));

-- Split into insert/update rather than "for all" deliberately — no
-- delete policy exists at all, so a sanction can never be removed via
-- the API, only "lifted" (an update). Matches admin-console.md: "Nothing
-- is deleted."
create policy "Admins can issue sanctions"
  on public.sanctions for insert
  to authenticated
  with check (public.is_admin(auth.uid()));

create policy "Admins can update sanctions (e.g. lifting one)"
  on public.sanctions for update
  to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

grant select, insert, update on public.sanctions to authenticated;

-- One decision can close several reports against the same player
-- (admin-console.md) — join table rather than a single FK on reports,
-- since it's genuinely many-to-many.
create table public.sanction_reports (
  sanction_id uuid not null references public.sanctions (id),
  report_id uuid not null references public.reports (id),
  primary key (sanction_id, report_id)
);

alter table public.sanction_reports enable row level security;

create policy "Admins manage sanction-report links"
  on public.sanction_reports for all
  to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

grant select, insert on public.sanction_reports to authenticated;

-- ─── Admin actions (audit log) ──────────────────────────────────────
-- Append-only by construction: no update/delete policy exists for any
-- role, so nothing except a direct service_role query can ever change
-- or remove a row here. Matches admin-console.md: "Nothing is deleted."
create table public.admin_actions (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references public.admins (user_id),
  type text not null,
  -- Polymorphic reference (player/lobby/report) — deliberately no FK
  -- constraint, since the target table depends on target_type. Enforced
  -- in application code, not the database.
  target_type text not null check (target_type in ('player', 'lobby', 'report')),
  target_id uuid not null,
  summary text not null,
  reason text not null check (char_length(reason) >= 10),
  created_at timestamptz not null default now()
);

alter table public.admin_actions enable row level security;

-- Internal only — never shown to players.
create policy "Admins can view the audit log"
  on public.admin_actions for select
  to authenticated
  using (public.is_admin(auth.uid()));

create policy "Admins can write audit log entries"
  on public.admin_actions for insert
  to authenticated
  with check (public.is_admin(auth.uid()));

grant select, insert on public.admin_actions to authenticated;
