/**
 * Mock display data for the admin console's UI (names shown on cases,
 * audit log entries, etc.) — not the real login check anymore.
 *
 * Admins are deliberately *separate* accounts, not players with an extra
 * role: a moderator shouldn't be ruling on reports from the same account they
 * queue ranked with, next to people they may know. There is no admin
 * sign-up — real admin rows are added by hand directly in Supabase's SQL
 * editor, into their own `admins` table (not `user_role_mapping` — see
 * docs/thesis-spec.md's "Divergences from the proposal"). `LoginForm`
 * checks that real table now; `findAdminByEmail` here is unused by login
 * and only kept for the admin console's own mock UI needs.
 */

export interface AdminAccount {
  id: string;
  name: string;
  email: string;
}

export const adminAccounts: AdminAccount[] = [
  { id: "adm-1", name: "Rani", email: "admin@temangame.dev" },
  { id: "adm-2", name: "Arga", email: "arga@temangame.dev" },
];

export function findAdminByEmail(email: string): AdminAccount | undefined {
  const target = email.trim().toLowerCase();
  return adminAccounts.find((account) => account.email === target);
}

export function adminName(id: string | undefined): string {
  return adminAccounts.find((account) => account.id === id)?.name ?? "Admin";
}

/** Where an admin lands after logging in when no admin page was requested. */
export const ADMIN_HOME = "/admin";
