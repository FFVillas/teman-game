import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Refreshes the Supabase session cookie on every request. Without this,
 * a session nearing expiry never gets renewed for someone just browsing
 * Server Components (which can't write cookies themselves — see
 * src/lib/supabase/server.ts) and they'd get silently signed out.
 *
 * This is also where real route protection eventually belongs — see the
 * TODO on AdminGate (src/components/admin/AdminGate.tsx): hiding the
 * /admin UI client-side isn't security, RLS on the moderation tables is
 * what actually keeps players out of that data. Redirecting non-admins
 * away from /admin here would be the other half.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Just touching the session is enough to trigger a refresh when needed.
  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
