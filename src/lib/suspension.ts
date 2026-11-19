import type { SupabaseClient } from "@supabase/supabase-js";
import { RESTRICTION_NOTICE_KEY, type RestrictionNotice } from "@/data/account-restriction";
import { avatarUrl } from "@/lib/avatar";

/**
 * A suspended player gets no session (admin-console.md). Called right after
 * signing in, and on /account-restricted for a session that was already open
 * when the suspension began: if a suspension is running, it keeps what the
 * player is entitled to see (the rule and the dates, from
 * `my_active_suspension()`; never the moderator's note or the reporter), signs
 * out and returns true. The caller then shows /account-restricted.
 */
export async function signOutIfSuspended(supabase: SupabaseClient): Promise<boolean> {
  const { data, error } = await supabase.rpc("my_active_suspension");
  const row = (data as { reason: string; issued_at: string; expires_at: string | null }[] | null)?.[0];
  if (error || !row) return false;

  const { data: auth } = await supabase.auth.getUser();
  const { data: profile } = auth.user
    ? await supabase
        .from("profiles")
        .select("username, avatar_path")
        .eq("id", auth.user.id)
        .maybeSingle()
    : { data: null };

  const notice: RestrictionNotice = {
    username: (profile?.username as string | undefined) ?? "",
    avatar: avatarUrl((profile?.avatar_path as string | null | undefined) ?? null),
    type: "suspension",
    reason: row.reason,
    issuedAt: row.issued_at,
    expiresAt: row.expires_at ?? undefined,
  };
  try {
    window.sessionStorage.setItem(RESTRICTION_NOTICE_KEY, JSON.stringify(notice));
  } catch {
    // Private mode: the page then shows its generic message.
  }
  await supabase.auth.signOut();
  return true;
}
