"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useNotifications } from "@/contexts/NotificationContext";
import { createClient } from "@/lib/supabase/client";
import BackLink from "@/components/BackLink";
import { controlClass, labelClass } from "@/components/profile/DossierFields";

const MIN_PASSWORD_LENGTH = 8;

/**
 * Account settings — the things that belong to the *login*, not the player
 * profile: email, password, sign-out, and where account deletion goes.
 *
 * Deliberately no new table. Everything here is already owned by Supabase
 * Auth (`auth.users`), and anything that looks like a "preference" (which
 * notifications to receive, profile visibility) would be a column or table
 * the proposal doesn't have — worth adding only when a screen actually
 * reads it. Profile fields stay on /profile/me/edit so there's one place to
 * edit who you are.
 */
function Card({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-border-strong bg-bg-card-alt p-5">
      <div className="flex flex-col gap-1">
        <h2 className={labelClass}>{title}</h2>
        {description && (
          <p className="text-[11px] leading-relaxed text-text-muted">
            {description}
          </p>
        )}
      </div>
      {children}
    </section>
  );
}

export default function SettingsView({ email }: { email: string }) {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { toast } = useNotifications();

  const [newEmail, setNewEmail] = useState(email);
  const [emailSaving, setEmailSaving] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  async function handleEmail(event: FormEvent) {
    event.preventDefault();
    setEmailError(null);

    const next = newEmail.trim();
    if (!next) return setEmailError("Enter an email address.");
    if (next === email) return setEmailError("That's already your email.");

    setEmailSaving(true);
    const { error } = await createClient().auth.updateUser({ email: next });
    setEmailSaving(false);

    if (error) return setEmailError(error.message);
    toast({
      tone: "info",
      title: "Check your inbox",
      // Supabase sends a confirmation link; the address doesn't change
      // until it's clicked, so saying "saved" here would be a lie.
      body: `Confirm the change from the link sent to ${next}.`,
    });
  }

  async function handlePassword(event: FormEvent) {
    event.preventDefault();
    setPasswordError(null);

    if (password.length < MIN_PASSWORD_LENGTH) {
      return setPasswordError(`Use at least ${MIN_PASSWORD_LENGTH} characters.`);
    }
    if (password !== confirm) return setPasswordError("The two don't match.");

    setPasswordSaving(true);
    const { error } = await createClient().auth.updateUser({ password });
    setPasswordSaving(false);

    if (error) return setPasswordError(error.message);
    setPassword("");
    setConfirm("");
    toast({ tone: "success", title: "Password updated" });
  }

  function handleLogout() {
    logout();
    router.push("/");
  }

  return (
    <div className="flex flex-col gap-4">
      <BackLink label="Back to profile" href="/profile/me" />

      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-extrabold tracking-tight text-white">
          Settings
        </h1>
        <p className="text-xs text-text-muted">
          Your login and account. Everything other players see lives on{" "}
          <Link href="/profile/me/edit" className="text-brand hover:underline">
            your profile
          </Link>
          .
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-4">
          <Card
            title="Email"
            description="Used to sign in and to recover your account. Changing it needs confirmation from the new address."
          >
            <form onSubmit={handleEmail} className="flex flex-col gap-3" noValidate>
              <input
                type="email"
                value={newEmail}
                onChange={(event) => {
                  setNewEmail(event.target.value);
                  setEmailError(null);
                }}
                autoComplete="email"
                aria-label="Email address"
                className={
                  emailError
                    ? `${controlClass} border-danger focus:ring-danger`
                    : controlClass
                }
              />
              {emailError && (
                <p className="text-[11px] text-danger">{emailError}</p>
              )}
              <button
                type="submit"
                disabled={emailSaving}
                className="flex h-10 w-fit items-center justify-center rounded-lg bg-brand px-5 text-xs font-bold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {emailSaving ? "Sending…" : "Change email"}
              </button>
            </form>
          </Card>

          <Card
            title="Password"
            description="Pick something you don't use anywhere else."
          >
            <form
              onSubmit={handlePassword}
              className="flex flex-col gap-3"
              noValidate
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex flex-col gap-1.5">
                  <span className={labelClass}>New password</span>
                  <input
                    type="password"
                    value={password}
                    onChange={(event) => {
                      setPassword(event.target.value);
                      setPasswordError(null);
                    }}
                    autoComplete="new-password"
                    className={controlClass}
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className={labelClass}>Repeat it</span>
                  <input
                    type="password"
                    value={confirm}
                    onChange={(event) => {
                      setConfirm(event.target.value);
                      setPasswordError(null);
                    }}
                    autoComplete="new-password"
                    className={controlClass}
                  />
                </label>
              </div>
              {passwordError && (
                <p className="text-[11px] text-danger">{passwordError}</p>
              )}
              <button
                type="submit"
                disabled={passwordSaving}
                className="flex h-10 w-fit items-center justify-center rounded-lg bg-brand px-5 text-xs font-bold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {passwordSaving ? "Saving…" : "Change password"}
              </button>
            </form>
          </Card>

          <Card
            title="Delete account"
            description="Deleting removes your profile, your games and your messages. It can't be undone, and it isn't self-service yet — ask an admin, who will confirm it's you first."
          >
            <p className="rounded-lg border border-dashed border-border-default px-4 py-3 text-[11px] text-text-muted">
              Not available in-app yet. A player-facing delete needs a
              server-side job (a signed-in browser can&apos;t be trusted to
              remove its own auth record), so it&apos;s handled by an admin
              for now.
            </p>
          </Card>
        </div>

        <aside className="flex flex-col gap-4">
          <Card title="Account">
            <dl className="flex flex-col gap-2.5 text-xs">
              <div className="flex justify-between gap-3">
                <dt className="text-text-muted">Username</dt>
                <dd className="font-semibold text-white">{user?.name}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-text-muted">Signed in as</dt>
                <dd className="truncate font-semibold text-white">{email}</dd>
              </div>
            </dl>
            <Link
              href="/profile/me/edit"
              className="flex h-10 items-center justify-center rounded-lg border border-border-strong text-xs font-semibold text-text-subtle transition-colors hover:text-white"
            >
              Edit profile
            </Link>
          </Card>

          <Card
            title="Notifications"
            description="Join requests, invites and reviews always arrive in the app. Choosing which ones reach you by push comes with the PWA work — nothing to set yet."
          >
            <Link
              href="/notifications"
              className="flex h-10 items-center justify-center rounded-lg border border-border-strong text-xs font-semibold text-text-subtle transition-colors hover:text-white"
            >
              Open notifications
            </Link>
          </Card>

          <Card title="Session">
            <button
              type="button"
              onClick={handleLogout}
              className="flex h-10 items-center justify-center rounded-lg border border-border-strong text-xs font-semibold text-danger transition-colors hover:border-danger"
            >
              Log out
            </button>
          </Card>
        </aside>
      </div>
    </div>
  );
}
