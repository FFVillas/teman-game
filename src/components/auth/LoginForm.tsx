"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import AuthField from "./AuthField";
import OAuthButtons from "./OAuthButtons";
import { createClient } from "@/lib/supabase/client";
import { sanitizeNextPath, withNext } from "@/lib/auth-redirect";
import { ADMIN_HOME } from "@/data/admin-accounts";

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Where the user was before they hit the auth screens.
  const next = sanitizeNextPath(searchParams.get("next"));

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
    form?: string;
  }>({});

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    const nextErrors: typeof errors = {};
    if (!email.trim()) nextErrors.email = "Enter your email address.";
    if (!password) nextErrors.password = "Enter your password.";

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    const supabase = createClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error || !data.user) {
      setSubmitting(false);
      setErrors({ form: "Wrong email or password." });
      return;
    }

    // Role comes from whether a row exists in `admins`, not from the
    // email — see AuthContext's buildAuthUser for the same check. Done
    // here too so we know where to redirect before the context's own
    // listener has necessarily resolved.
    const { data: admin } = await supabase
      .from("admins")
      .select("user_id")
      .eq("user_id", data.user.id)
      .maybeSingle();

    if (admin) {
      // Staff accounts only work in the console, so an ordinary ?next=
      // (a lobby, a profile) is ignored in favour of the admin home.
      router.push(next.startsWith("/admin") ? next : ADMIN_HOME);
      return;
    }

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

        {errors.form && <p className="text-xs text-danger">{errors.form}</p>}

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
          disabled={submitting}
          className="mt-1 flex h-11 items-center justify-center rounded-lg bg-brand text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "Logging in…" : "Log in"}
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
