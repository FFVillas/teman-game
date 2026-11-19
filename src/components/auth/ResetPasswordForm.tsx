"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AuthField from "./AuthField";
import { createClient } from "@/lib/supabase/client";
import { useNotifications } from "@/contexts/NotificationContext";

const MIN_PASSWORD_LENGTH = 8;

/**
 * Step two: the emailed link lands here signed in for this one purpose.
 * Supabase sends either `?code=` (PKCE, exchanged here) or a `#access_token`
 * the client picks up by itself; either way, once a session exists the player
 * picks a new password.
 */
export default function ResetPasswordForm() {
  const router = useRouter();
  const { toast } = useNotifications();
  const [state, setState] = useState<"checking" | "ready" | "invalid">("checking");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    let done = false;
    const ready = () => {
      if (!done) {
        done = true;
        setState("ready");
      }
    };
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) ready();
    });

    void (async () => {
      const code = new URLSearchParams(window.location.search).get("code");
      if (code) {
        const { error: failure } = await supabase.auth.exchangeCodeForSession(code);
        if (!failure) return ready();
      }
      const { data: current } = await supabase.auth.getSession();
      if (current.session) return ready();
      // Give a token in the URL hash a moment to be picked up.
      setTimeout(() => {
        if (!done) setState("invalid");
      }, 1500);
    })();

    return () => data.subscription.unsubscribe();
  }, []);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (password.length < MIN_PASSWORD_LENGTH) {
      return setError(`Use at least ${MIN_PASSWORD_LENGTH} characters.`);
    }
    if (password !== confirm) return setError("The two don't match.");
    setError(null);
    setSaving(true);
    const { error: failure } = await createClient().auth.updateUser({ password });
    setSaving(false);
    if (failure) return setError(failure.message);
    toast({ tone: "success", title: "Password changed", body: "You're logged in with it now." });
    router.replace("/");
  }

  if (state === "checking") {
    return <p className="text-sm text-text-muted">Checking your link…</p>;
  }

  if (state === "invalid") {
    return (
      <div className="flex flex-col gap-4">
        <p className="rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          This link has expired or was already used. Ask for a new one.
        </p>
        <Link
          href="/forgot-password"
          className="flex h-11 items-center justify-center rounded-lg bg-brand text-sm font-bold text-white hover:opacity-90"
        >
          Send a new link
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      <AuthField
        label="New password"
        type="password"
        value={password}
        onChange={setPassword}
        autoComplete="new-password"
      />
      <AuthField
        label="Repeat it"
        type="password"
        value={confirm}
        onChange={setConfirm}
        autoComplete="new-password"
        error={error ?? undefined}
      />
      <button
        type="submit"
        disabled={saving}
        className="mt-1 flex h-11 items-center justify-center rounded-lg bg-brand text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {saving ? "Saving…" : "Save new password"}
      </button>
    </form>
  );
}
