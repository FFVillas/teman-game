import { createBrowserClient } from "@supabase/ssr";

/**
 * For Client Components — reads the session from cookies via the browser.
 * The publishable key (Supabase's current name for what used to be called
 * the "anon" key) is safe to ship here; it has no access on its own, RLS
 * on each table is what actually decides what a request can touch.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { global: { fetch: fetchOrLeave } },
  );
}

/**
 * Plain fetch, plus one thing: when the database refuses a write because the
 * player is suspended (`refuse_suspended`, 20261124000100), leave for the page
 * that says so. Any action anywhere in the app ends up here, so no screen has
 * to know about it.
 */
async function fetchOrLeave(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const response = await fetch(input, init);
  if (response.status === 403 && typeof window !== "undefined") {
    const text = await response.clone().text().catch(() => "");
    if (text.includes("account_suspended")) window.location.replace("/account-restricted");
  }
  return response;
}
