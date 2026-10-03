-- Staff identity — the "role" piece needed for login to work: same
-- /login for everyone, this is what decides whether someone lands on
-- the normal app or on /admin. Split out from the rest of the
-- moderation schema (reports/sanctions/audit log) so it can be run now,
-- without needing the report feature to exist yet.
--
-- DIVERGENCE FROM PROPOSAL: the proposal's ERD models admin access via
-- `role` + `user_role_mapping` — an admin is a user account that also
-- holds the "admin" role. This does NOT build that. Instead: admin
-- identity lives in its own `admins` table, entirely independent of
-- `profiles`. Reasoning (industry-standard, not just preference): a
-- role-flag-on-account design means a compromised player password also
-- grants moderation power, and it creates a self-moderation conflict (an
-- admin could end up judging a report filed against their own account).
-- Separating staff identity from player identity is the same pattern
-- real platforms use (no company's support/moderation tooling is gated
-- by a flag on the employee's personal account on the product itself).
-- `role`/`user_role_mapping` from the proposal are therefore not built —
-- flag this to your advisor as an intentional adaptation, not a gap.
--
-- Admins still authenticate through the same Supabase Auth (same
-- `auth.users`, same /login) — only the *permission check* is separate,
-- not the whole auth system. There is no self-signup path to this
-- table; rows are inserted by hand (matches admin-console.md exactly:
-- "There is no admin sign-up; accounts are created by hand").
create table public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  created_at timestamptz not null default now()
);

alter table public.admins enable row level security;

-- security definer + stable: bypasses RLS internally (it's the function
-- owner's privileges, not the caller's), so it's safe to use inside a
-- policy on `admins` itself without Postgres reporting "infinite
-- recursion detected in policy" — which a raw self-referencing subquery
-- in the policy below would trigger. Cheap too: one indexed lookup.
-- Also the seam any future table's RLS calls to check "is this user
-- staff" — the reports/sanctions/audit-log schema (when that's added
-- later) reuses this same function rather than redefining the check.
create function public.is_admin(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admins where user_id = uid);
$$;

-- Only admins can see the staff list (who exists) — not exposed to
-- regular players.
create policy "Admins can view the staff list"
  on public.admins for select
  to authenticated
  using (public.is_admin(auth.uid()));

grant select on public.admins to authenticated;
-- Deliberately no insert/update/delete policy for any client role —
-- staff provisioning only happens via the SQL editor / service_role.
