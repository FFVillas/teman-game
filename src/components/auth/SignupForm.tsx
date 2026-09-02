"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import AuthField from "./AuthField";
import AuthSelect from "./AuthSelect";
import OAuthButtons from "./OAuthButtons";
import { authLegal } from "@/data/auth";
import { regions, defaultRegion } from "@/data/regions";
import { useAuth } from "@/contexts/AuthContext";
import { playerProfiles } from "@/data/player-profiles";
import { sanitizeNextPath, withNext } from "@/lib/auth-redirect";

const MIN_PASSWORD_LENGTH = 8;

export default function SignupForm() {
  const router = useRouter();
  const { login } = useAuth();
  const searchParams = useSearchParams();
  // Where the user was before they hit the auth screens.
  const next = sanitizeNextPath(searchParams.get("next"));

  const [username, setUsername] = useState("");
  const [region, setRegion] = useState<string>(defaultRegion);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [errors, setErrors] = useState<{
    username?: string;
    email?: string;
    password?: string;
    terms?: string;
  }>({});

  function handleSubmit(event: FormEvent) {
    event.preventDefault();

    const nextErrors: typeof errors = {};
    if (!username.trim()) nextErrors.username = "Pick a username.";
    if (!email.trim()) nextErrors.email = "Enter your email address.";
    if (password.length < MIN_PASSWORD_LENGTH) {
      nextErrors.password = `Use at least ${MIN_PASSWORD_LENGTH} characters.`;
    }
    if (!acceptedTerms) {
      nextErrors.terms = "Accept the terms to continue.";
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    // TODO: wire up to Supabase Auth signUp once the backend exists. Until
    // then, new accounts land on the same mock "own profile" record — the
    // chip shows the name just entered, but the linked profile page is Fayaz's.
    const me = playerProfiles.fayaz_ilovelittle;
    login({
      name: username.trim() || me.username,
      avatar: me.avatar,
      profileHref: "/profile/me",
    });
    // New accounts go through onboarding first (games/rank/playstyle) —
    // it carries the original ?next= along so it can hand off there once
    // the user finishes or skips.
    router.push(withNext("/onboarding", next));
  }

  return (
    <div className="flex flex-col gap-6">
      <OAuthButtons verb="sign up" />

      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_140px]">
          <AuthField
            label="Username"
            value={username}
            onChange={setUsername}
            placeholder="eg. Yonziii"
            autoComplete="username"
            error={errors.username}
          />
          <AuthSelect
            label="Region"
            value={region}
            onChange={setRegion}
            options={regions}
          />
        </div>

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
                className="font-semibold text-brand transition-opacity hover:opacity-80"
              >
                {authLegal.termsLabel}
              </Link>{" "}
              and{" "}
              <Link
                href={authLegal.privacyHref}
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

        <button
          type="submit"
          className="mt-1 flex h-11 items-center justify-center rounded-lg bg-brand text-sm font-bold text-white transition-opacity hover:opacity-90"
        >
          Create account
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
