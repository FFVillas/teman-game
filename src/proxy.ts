import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { MIN_PERSONALITY_TAGS } from "@/data/profile-options";
import { withNext } from "@/lib/auth-redirect";

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

  // Verifies the token locally and refreshes the cookie when it is close to
  // expiring, without asking Supabase's auth server on every request.
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims.sub;

  if (userId && needsSetupGate(request)) {
    // Two tiny indexed lookups, and only on real page navigations — never on
    // the data fetches this matcher also sees.
    const [{ data: profile }, { data: admin }] = await Promise.all([
      supabase
        .from("profiles")
        .select("playstyle, is_suspended, user_tag (tag_id)")
        .eq("id", userId)
        .maybeSingle(),
      supabase.from("admins").select("user_id").eq("user_id", userId).maybeSingle(),
    ]);

    // A suspension that began while this session was open: the restricted
    // page ends the session and says why. Nothing else is reachable meanwhile.
    if (profile?.is_suspended) {
      const url = request.nextUrl.clone();
      url.pathname = "/account-restricted";
      url.search = "";
      return NextResponse.redirect(url);
    }

    // Staff accounts don't play, so they have no playstyle and no tags.
    // Redirect only on a definite answer: if the profile row couldn't be read
    // the player keeps browsing rather than getting trapped in a loop.
    const incomplete =
      !admin &&
      profile != null &&
      (profile.playstyle == null ||
        (profile.user_tag?.length ?? 0) < MIN_PERSONALITY_TAGS);

    if (incomplete) {
      const url = request.nextUrl.clone();
      // Where they were trying to go, so onboarding can hand off there when
      // it finishes. This is the only way an OAuth signup keeps its
      // destination: the email form passes `?next=` to /onboarding itself,
      // but an OAuth account arrives via /auth/callback and is bounced here
      // on its first page load instead.
      const intended = url.pathname + url.search;
      url.pathname = "/onboarding";
      url.search = "";
      const target = withNext(url.toString(), intended);
      return NextResponse.redirect(target);
    }
  }

  return response;
}

/**
 * Playstyle and personality tags are the two things a player supplies that the
 * recommendation formula reads — Pa in Persamaan 3.2 and the tag set in
 * Persamaan 3.14. Onboarding makes both compulsory, but a player could still
 * close the tab halfway and start browsing without them, which would put an
 * account with no Pa into the scoring. This sends them back.
 *
 * Everything else onboarding asks for stays optional.
 */
const SETUP_EXEMPT = [
  "/onboarding",
  "/login",
  "/signup",
  // Google and Discord come back to /auth/callback, which has to be allowed
  // to finish the code exchange before any gate looks at the account.
  "/auth",
  "/logout",
  "/account-restricted",
  "/settings",
  "/admin",
  "/terms",
  "/privacy",
  "/support",
  "/offline",
  "/forgot-password",
  "/reset-password",
];

function needsSetupGate(request: NextRequest): boolean {
  // Only page loads. The matcher below also catches Server Component data
  // requests, and paying for two queries on each of those would be waste.
  if (!request.headers.get("accept")?.includes("text/html")) return false;

  const path = request.nextUrl.pathname;
  return !SETUP_EXEMPT.some(
    (exempt) => path === exempt || path.startsWith(`${exempt}/`),
  );
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sw.js|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
