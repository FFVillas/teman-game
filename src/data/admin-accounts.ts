/**
 * Staff accounts for the admin console.
 *
 * Admins are deliberately *separate* accounts, not players with an extra
 * role: a moderator shouldn't be ruling on reports from the same account they
 * queue ranked with, next to people they may know. There is no admin sign-up
 * — in production these rows are created by hand in Supabase and given the
 * `admin` role through `user_role_mapping`.
 *
 * Until the backend exists, logging in on the normal /login page with one of
 * these emails (any password) starts an admin session.
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
