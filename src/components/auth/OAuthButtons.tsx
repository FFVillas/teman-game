"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { oauthProviders, type OAuthProvider } from "@/data/auth";
import { createClient } from "@/lib/supabase/client";

/**
 * Google / Discord sign-in, through Supabase Auth.
 *
 * Clicking one sends the browser to the provider; it comes back to
 * `/auth/callback`, which swaps the code for a session and decides where to
 * go next (see that route). The whole flow is one navigation away from this
 * component, so there is nothing to await here — on success the page is
 * already leaving.
 *
 * Each provider still has to be switched on in the Supabase dashboard with
 * its own client ID and secret (docs/oauth-setup.md). One that isn't comes
 * back as "provider is not enabled", which `message()` below turns into
 * something a player can read.
 *
 * There is no separate signup: a provider the player has never used here
 * creates the account, and `handle_new_user` makes them a username
 * (`20261119000400_oauth_signup.sql`) since they never typed one. They land
 * in `/onboarding` either way, because `src/proxy.ts` sends anyone without a
 * playstyle and personality tags there.
 */
const OAUTH_ENABLED = true;

export default function OAuthButtons({
  verb,
  next,
}: {
  verb: string;
  /** Where to go once signed in, carried through the provider round trip. */
  next: string;
}) {
  const searchParams = useSearchParams();
  // `/auth/callback` reports a failed round trip by sending the player back
  // to /login?error=…, which is here rather than in the forms because this
  // component is the only thing that starts one.
  const [problem, setProblem] = useState<string | null>(
    searchParams.get("error"),
  );
  const [pending, setPending] = useState<OAuthProvider["id"] | null>(null);

  if (!OAUTH_ENABLED) return null;

  async function start(provider: OAuthProvider) {
    setProblem(null);
    setPending(provider.id);

    const unavailable = `${provider.label} sign-in isn't available yet. Use your email for now.`;
    if (!(await isConfigured(provider.id))) {
      setPending(null);
      setProblem(unavailable);
      return;
    }

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: provider.id,
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });

    // Only reached when the redirect never happened — otherwise the browser
    // has already left this page.
    if (error) {
      setPending(null);
      setProblem(message(error.message, provider.label));
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        {oauthProviders.map((provider) => (
          <button
            key={provider.id}
            type="button"
            onClick={() => void start(provider)}
            disabled={pending !== null}
            className="flex h-11 items-center justify-center gap-2.5 rounded-lg border border-border-strong bg-bg-page text-sm font-semibold text-text-subtle transition-colors hover:border-border-strong hover:bg-white/5 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- static SVG icon, no benefit from next/image optimization */}
            <img
              src={provider.icon}
              alt=""
              width={provider.iconWidth}
              height={provider.iconHeight}
            />
            {pending === provider.id ? "Redirecting…" : provider.label}
          </button>
        ))}
      </div>

      {problem && (
        <p className="text-xs text-danger" role="alert">
          {problem}
        </p>
      )}

      <div className="flex items-center gap-3">
        <span className="h-px flex-1 bg-border-default" />
        <span className="text-[11px] uppercase tracking-wider text-text-muted">
          or {verb} with email
        </span>
        <span className="h-px flex-1 bg-border-default" />
      </div>
    </div>
  );
}

/**
 * Is this provider actually switched on in the Supabase dashboard?
 *
 * Asked **before** leaving the page, because of how Supabase answers when it
 * isn't: `/auth/v1/authorize` returns a bare `{"code":400,…"provider is not
 * enabled"}` JSON body rather than sending the player back here with an
 * `?error=`. `signInWithOAuth` can't see that — it only builds the URL and
 * navigates — so without this check the player lands on a page of JSON with
 * no way back and no explanation.
 *
 * `/auth/v1/settings` is read-only and lists every provider's state, so
 * asking it costs one small request at a moment the player is already waiting
 * for a redirect. **Fails open**: if the question can't be answered the
 * sign-in goes ahead and Supabase decides, since a flaky network shouldn't
 * make a working button look broken.
 */
async function isConfigured(provider: OAuthProvider["id"]): Promise<boolean> {
  try {
    const base = process.env.NEXT_PUBLIC_SUPABASE_URL!.replace(/\/+$/, "");
    const response = await fetch(`${base}/auth/v1/settings`, {
      headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY! },
    });
    if (!response.ok) return true;
    const body = (await response.json()) as {
      external?: Record<string, boolean>;
    };
    return body.external?.[provider] !== false;
  } catch {
    return true;
  }
}

/**
 * Supabase's own wording for a provider that hasn't been configured is
 * "Unsupported provider: provider is not enabled", which reads like a bug in
 * the app rather than something the player can route around. Everything else
 * is passed through — it is more use than a generic line.
 */
function message(raw: string, label: string): string {
  if (raw.toLowerCase().includes("not enabled")) {
    return `${label} sign-in isn't available yet. Use your email for now.`;
  }
  return raw;
}
