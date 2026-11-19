import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sanitizeNextPath } from "@/lib/auth-redirect";
import { ADMIN_HOME } from "@/data/admin-accounts";

/**
 * Where Google and Discord land after a player approves the sign-in.
 *
 * The chain is: `OAuthButtons` calls `signInWithOAuth` with this route as its
 * `redirectTo` → the browser goes to the provider → the provider returns to
 * Supabase → Supabase returns **here** with `?code=`. That code is swapped for
 * a session, which is what writes the auth cookies.
 *
 * Why the exchange runs on the server and not in a page the way
 * `/reset-password` does it: these cookies have to exist before the first
 * navigation, because `src/proxy.ts` is what sends a brand-new account to
 * `/onboarding` and a suspended one to `/account-restricted`. A client-side
 * exchange would have the player land on a page while still signed out, and
 * the gate would only fire on the navigation after that.
 *
 * `@supabase/ssr`'s browser client keeps the PKCE code verifier in a cookie,
 * so this route can read it even though the sign-in started in the browser.
 *
 * Suspended accounts are deliberately **not** checked here. `LoginForm` calls
 * `signOutIfSuspended`, but that writes the notice to `sessionStorage`, which
 * a Route Handler has no access to. `proxy.ts` catches `profiles.is_suspended`
 * on the very next page load and `/account-restricted` ends the session
 * itself — the path that already exists for a session that was open when the
 * suspension began.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const origin = resolveOrigin(request);

  const failure = (reason: string) =>
    NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(reason)}`,
    );

  // The provider or Supabase refused: the player pressed Cancel, or the
  // provider isn't enabled in the Supabase dashboard. It comes back as query
  // params rather than an exception, so it has to be read before the code.
  const providerError =
    searchParams.get("error_description") ?? searchParams.get("error");
  if (providerError) return failure(providerError);

  const code = searchParams.get("code");
  if (!code) return failure("That sign-in link was incomplete. Try again.");

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.user) {
    return failure(
      error?.message ?? "Couldn't finish signing you in. Try again.",
    );
  }

  // Same rule as LoginForm: staff identity is a row in `admins`, never the
  // email, and a staff account only works inside the console — so an ordinary
  // ?next= (a lobby, a profile) is ignored in favour of the admin home.
  const { data: admin } = await supabase
    .from("admins")
    .select("user_id")
    .eq("user_id", data.user.id)
    .maybeSingle();

  const next = sanitizeNextPath(searchParams.get("next"));
  const target = admin
    ? next.startsWith("/admin")
      ? next
      : ADMIN_HOME
    : next;

  return NextResponse.redirect(`${origin}${target}`);
}

/**
 * The redirect has to be absolute, and behind Vercel's proxy the request's own
 * host is the internal one — sending the player to that would break the link.
 * `x-forwarded-host` is the public host; it is only trusted in production,
 * where the platform sets it, and ignored locally where anyone could.
 */
function resolveOrigin(request: NextRequest): string {
  if (process.env.NODE_ENV === "development") return request.nextUrl.origin;
  const forwardedHost = request.headers.get("x-forwarded-host");
  if (!forwardedHost) return request.nextUrl.origin;
  const proto = request.headers.get("x-forwarded-proto") ?? "https";
  return `${proto}://${forwardedHost}`;
}
