import { cache } from "react";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * For Server Components, Server Actions, and Route Handlers. Cookie writes
 * are wrapped in try/catch because Server Components can't set cookies —
 * only Server Actions/Route Handlers and the middleware below can. When
 * called from a Server Component this silently no-ops on writes, which is
 * fine as long as the proxy is refreshing the session on every request
 * (it is — see src/proxy.ts).
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component — no-op, middleware handles it.
          }
        },
      },
    },
  );
}

/**
 * The signed-in user's id, or null. The token's signature and expiry are
 * checked locally against the project's public key, so this costs no round
 * trip to Supabase, and it is computed once per request however many
 * components ask. Use it to scope queries; RLS is what actually protects data.
 */
export const getUserId = cache(async (): Promise<string | null> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return data?.claims.sub ?? null;
});
