"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import AuthField from "./AuthField";
import OAuthButtons from "./OAuthButtons";
import { useAuth } from "@/contexts/AuthContext";
import { playerProfiles } from "@/data/player-profiles";
import { sanitizeNextPath, withNext } from "@/lib/auth-redirect";

export default function LoginForm() {
  const router = useRouter();
  const { login } = useAuth();
  const searchParams = useSearchParams();
  // Where the user was before they hit the auth screens.
  const next = sanitizeNextPath(searchParams.get("next"));

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>(
    {}
  );

  function handleSubmit(event: FormEvent) {
    event.preventDefault();

    const nextErrors: typeof errors = {};
    if (!email.trim()) nextErrors.email = "Enter your email address.";
    if (!password) nextErrors.password = "Enter your password.";

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    // TODO: wire up to Supabase Auth signInWithPassword once the backend exists.
    const me = playerProfiles.fayaz_ilovelittle;
    login({
      name: me.username,
      avatar: me.avatar,
      profileHref: "/profile/me",
    });
    router.push(next);
  }

  return (
    <div className="flex flex-col gap-6">
      <OAuthButtons verb="log in" />

      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
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
          placeholder="Enter your password"
          autoComplete="current-password"
          error={errors.password}
        />

        <div className="flex items-center justify-between">
          <label className="flex cursor-pointer items-center gap-2 text-xs text-text-muted">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(event) => setRememberMe(event.target.checked)}
              className="size-4 rounded accent-brand"
            />
            Keep me logged in
          </label>
          <Link
            href="/forgot-password"
            className="text-xs font-bold text-brand transition-opacity hover:opacity-80"
          >
            Forgot password?
          </Link>
        </div>

        <button
          type="submit"
          className="mt-1 flex h-11 items-center justify-center rounded-lg bg-brand text-sm font-bold text-white transition-opacity hover:opacity-90"
        >
          Log in
        </button>
      </form>

      <p className="text-center text-[13px] text-text-muted">
        Don&apos;t have an account?{" "}
        <Link
          href={withNext("/signup", next)}
          className="font-semibold text-brand transition-opacity hover:opacity-80"
        >
          Sign up
        </Link>
      </p>
    </div>
  );
}
