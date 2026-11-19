"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import AuthField from "./AuthField";
import { createClient } from "@/lib/supabase/client";

/**
 * Step one of a password reset: Supabase emails a link to /reset-password.
 * The answer is the same whether or not the address has an account, so the
 * form can't be used to find out who is registered.
 */
export default function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const address = email.trim();
    if (!/^\S+@\S+\.\S+$/.test(address)) {
      setError("Enter the email address you signed up with.");
      return;
    }
    setError(null);
    setSending(true);
    const { error: failure } = await createClient().auth.resetPasswordForEmail(address, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setSending(false);
    // Too many requests is the one failure worth telling apart.
    if (failure && failure.status === 429) {
      setError("Too many requests. Wait a minute, then try again.");
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <div className="flex flex-col gap-4">
        <p className="rounded-lg border border-border-strong bg-white/[0.03] px-4 py-3 text-sm text-text-subtle">
          If an account uses <span className="font-semibold text-white">{email.trim()}</span>,
          a link to choose a new password is on its way. Check your inbox and spam folder;
          the link works once.
        </p>
        <Link
          href="/login"
          className="flex h-11 items-center justify-center rounded-lg border border-border-strong text-sm font-semibold text-text-subtle transition-colors hover:text-white"
        >
          Back to log in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      <AuthField
        label="Email"
        type="email"
        value={email}
        onChange={setEmail}
        placeholder="you@example.com"
        autoComplete="email"
        error={error ?? undefined}
      />
      <button
        type="submit"
        disabled={sending}
        className="mt-1 flex h-11 items-center justify-center rounded-lg bg-brand text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {sending ? "Sending…" : "Send reset link"}
      </button>
      <p className="text-center text-[13px] text-text-muted">
        Remembered it?{" "}
        <Link href="/login" className="font-semibold text-brand hover:opacity-80">
          Log in
        </Link>
      </p>
    </form>
  );
}
