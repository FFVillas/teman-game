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
  );
}
