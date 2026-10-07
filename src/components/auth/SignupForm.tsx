"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import AuthField from "./AuthField";
import OAuthButtons from "./OAuthButtons";
import { authLegal } from "@/data/auth";
import { createClient } from "@/lib/supabase/client";
import { sanitizeNextPath, withNext } from "@/lib/auth-redirect";
import { validateUsername } from "@/lib/username";

const MIN_PASSWORD_LENGTH = 8;

export default function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Where the user was before they hit the auth screens.
  const next = sanitizeNextPath(searchParams.get("next"));

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<{
    username?: string;
    email?: string;
    password?: string;
    terms?: string;
    form?: string;
  }>({});

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    const nextErrors: typeof errors = {};
    const usernameError = validateUsername(username);
    if (usernameError) nextErrors.username = usernameError;
    if (!email.trim()) nextErrors.email = "Enter your email address.";
    if (password.length < MIN_PASSWORD_LENGTH) {
      nextErrors.password = `Use at least ${MIN_PASSWORD_LENGTH} characters.`;
    }
    if (!acceptedTerms) {
      nextErrors.terms = "Accept the terms to continue.";
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    const supabase = createClient();
    // The `on_auth_user_created` trigger (see the profiles migration)
    // reads raw_user_meta_data.username to seed the profile row — that's
    // why it's passed as `options.data` here rather than written to
    // `profiles` directly from the client.
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { username: username.trim() } },
    });

    if (error || !data.user) {
      setSubmitting(false);
      // The profile row is created by a trigger inside the signup itself, so
      // a username that's already taken (the unique index is case-insensitive)
      // surfaces as this generic message rather than a clear one.
      const usernameTaken = error?.message
        ?.toLowerCase()
        .includes("database error saving new user");
      setErrors(
        usernameTaken
          ? { username: "That username is already taken." }
          : {
              form: error?.message ?? "Couldn't create that account. Try again.",
            },
      );
      return;
    }

    // New accounts go through onboarding next (games/rank/playstyle —
    // region is collected there too, per game, not once at account
    // level). It carries the original ?next= along so it can hand off
    // there once the user finishes or skips.
    router.push(withNext("/onboarding", next));
  }

  return (
    <div className="flex flex-col gap-6">
      <OAuthButtons verb="sign up" />

      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        <AuthField
          label="Username"
          value={username}
          onChange={setUsername}
          placeholder="eg. Yonziii"
          autoComplete="username"
          error={errors.username}
        />

        <AuthField
          label="Email"
          type="email"
          value={email}
          onChange={setEmail}
          placeholder="you@example.com"
          autoComplete="email"
          error={errors.email}
        />

        <AuthField
          label="Password"
          type="password"
          value={password}
          onChange={setPassword}
          placeholder="Create a password"
          autoComplete="new-password"
          hint={`At least ${MIN_PASSWORD_LENGTH} characters.`}
          error={errors.password}
        />

        <div className="flex flex-col gap-1.5">
          <label className="flex cursor-pointer items-start gap-2.5 text-xs leading-relaxed text-text-muted">
            <input
              type="checkbox"
              checked={acceptedTerms}
              onChange={(event) => setAcceptedTerms(event.target.checked)}
              className="mt-0.5 size-4 shrink-0 rounded accent-brand"
            />
            <span>
              I agree to the{" "}
              <Link
                href={authLegal.termsHref}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-brand transition-opacity hover:opacity-80"
              >
                {authLegal.termsLabel}
              </Link>{" "}
              and{" "}
              <Link
                href={authLegal.privacyHref}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-brand transition-opacity hover:opacity-80"
              >
                {authLegal.privacyLabel}
              </Link>
              .
            </span>
          </label>
          {errors.terms && (
            <p className="text-xs text-danger">{errors.terms}</p>
          )}
        </div>

        {errors.form && <p className="text-xs text-danger">{errors.form}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="mt-1 flex h-11 items-center justify-center rounded-lg bg-brand text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "Creating account…" : "Create account"}
        </button>
      </form>

      <p className="text-center text-[13px] text-text-muted">
        Already have an account?{" "}
        <Link
          href={withNext("/login", next)}
          className="font-semibold text-brand transition-opacity hover:opacity-80"
        >
          Log in
        </Link>
      </p>
    </div>
  );
}
