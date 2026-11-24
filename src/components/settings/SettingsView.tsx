"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useNotifications } from "@/contexts/NotificationContext";
import { createClient } from "@/lib/supabase/client";
import BackLink from "@/components/BackLink";
import UserAvatar from "@/components/UserAvatar";
import { controlClass, labelClass } from "@/components/profile/DossierFields";
import InstallAppCard from "@/components/InstallAppCard";
import PushSettingsCard from "@/components/PushSettingsCard";
import DeleteAccountSection from "./DeleteAccountSection";

const MIN_PASSWORD_LENGTH = 8;

/**
 * Account settings: what belongs to the *login*, not the player profile
 * (email, password, the app on this device, sign-out, deletion). Profile
 * fields stay on /profile/me/edit so there's one place to edit who you are.
 *
 * Laid out like GitHub's settings: a list of sections on the left, one
 * section at a time on the right, each made of rows with the label and its
 * explanation on one side and the control on the other. The open section is
 * in the URL hash (#account, #password, #app, #session), so a link can point
 * at one (the account menu's "Install app" opens #app).
 *
 * Deliberately no new table: everything here is already owned by Supabase
 * Auth, plus the device push token. Deleting the account is self-service
 * (`DeleteAccountSection`, `delete_my_account()`).
 */

type SectionId = "account" | "password" | "app" | "session";

const sections: { id: SectionId; label: string; icon: ReactNode }[] = [
  {
    id: "account",
    label: "Account",
    icon: <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm-5.5 6c0-2.5 2.46-4 5.5-4s5.5 1.5 5.5 4" />,
  },
  {
    id: "password",
    label: "Password",
    icon: (
      <>
        <rect x="3" y="7" width="10" height="7" rx="1.5" />
        <path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" />
      </>
    ),
  },
  {
    id: "app",
    label: "App & notifications",
    icon: <path d="M4 6.5a4 4 0 0 1 8 0c0 3.5 1.5 4.5 1.5 4.5h-11S4 10 4 6.5ZM6.5 13.5a1.6 1.6 0 0 0 3 0" />,
  },
  {
    id: "session",
    label: "Session & account",
    icon: <path d="M6 3H3.5A1.5 1.5 0 0 0 2 4.5v7A1.5 1.5 0 0 0 3.5 13H6M10.5 11 13.5 8l-3-3M13.5 8H6" />,
  },
];

function isSection(value: string): value is SectionId {
  return sections.some((section) => section.id === value);
}

/** A section's title row, like GitHub's: heading over a thin rule. */
function SectionHeading({ title, description }: { title: string; description?: string }) {
  return (
    <div className="flex flex-col gap-1 border-b border-border-strong pb-3">
      <h2 className="text-lg font-bold text-white">{title}</h2>
      {description && <p className="text-xs text-text-muted">{description}</p>}
    </div>
  );
}

/** One setting: what it is on the left, the control on the right (stacked on phones). */
function Row({
  label,
  description,
  children,
}: {
  label: string;
  description?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-3 border-b border-border-default py-5 last:border-b-0 md:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] md:gap-8">
      <div className="flex flex-col gap-1">
        <h3 className="text-sm font-semibold text-white">{label}</h3>
        {description && (
          <p className="text-xs leading-relaxed text-text-muted">{description}</p>
        )}
      </div>
      <div className="flex min-w-0 flex-col gap-3">{children}</div>
    </div>
  );
}

const primaryButton =
  "flex h-10 w-fit items-center justify-center rounded-lg bg-brand px-5 text-xs font-bold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60";
const secondaryButton =
  "flex h-10 w-fit items-center justify-center rounded-lg border border-border-strong px-5 text-xs font-semibold text-text-subtle transition-colors hover:text-white";

export default function SettingsView({ email }: { email: string }) {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { toast } = useNotifications();

  const [section, setSection] = useState<SectionId>("account");

  // The hash picks the section, on load and when a link changes it.
  useEffect(() => {
    const read = () => {
      const hash = window.location.hash.slice(1);
      if (isSection(hash)) setSection(hash);
    };
    read();
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, []);

  function open(id: SectionId) {
    setSection(id);
    window.history.replaceState(null, "", `#${id}`);
  }

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
      // Supabase sends a confirmation link; the address doesn't change until
      // it's clicked, so saying "saved" here would be a lie.
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
    toast({
      tone: "success",
      title: "Password updated",
      body: "Use it the next time you log in.",
    });
  }

  function handleLogout() {
    logout();
    router.push("/");
  }

  return (
    <div className="flex flex-col gap-5">
      <BackLink label="Back to profile" href="/profile/me" />

      {/* Who these settings belong to, like GitHub's header above its menu. */}
      <div className="flex items-center gap-3">
        <UserAvatar src={user?.avatar} name={user?.name ?? "?"} className="size-12" textClassName="text-base" />
        <div className="flex min-w-0 flex-col">
          <h1 className="truncate text-xl font-extrabold tracking-tight text-white">
            {user?.name ?? "Settings"}
          </h1>
          <p className="text-xs text-text-muted">
            Your login and account.{" "}
            <Link href="/profile/me" className="text-brand hover:underline">
              Go to your profile
            </Link>
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-[220px_minmax(0,1fr)]">
        {/* Section list: a column on desktop, a scrolling strip on phones. */}
        <nav aria-label="Settings sections" className="-mx-1 overflow-x-auto md:mx-0 md:overflow-visible">
          <ul className="flex gap-1 px-1 md:flex-col md:px-0">
            {sections.map((item) => {
              const active = item.id === section;
              return (
                <li key={item.id} className="shrink-0">
                  <button
                    type="button"
                    onClick={() => open(item.id)}
                    aria-current={active ? "page" : undefined}
                    className={`relative flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                      active
                        ? "bg-white/[0.07] font-semibold text-white"
                        : "text-text-muted hover:bg-white/[0.04] hover:text-white"
                    }`}
                  >
                    {active && (
                      <span className="absolute inset-y-1.5 left-0 hidden w-[3px] rounded-full bg-brand md:block" />
                    )}
                    <svg
                      viewBox="0 0 16 16"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                      className="size-4 shrink-0"
                    >
                      {item.icon}
                    </svg>
                    <span className="whitespace-nowrap">{item.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        <section className="min-w-0 rounded-2xl border border-border-strong bg-bg-card-alt p-5 sm:p-6">
          {section === "account" && (
            <>
              <SectionHeading title="Account" description="How you sign in. What other players see is on your profile." />
              <Row label="Username" description="Shown everywhere and used in your profile's address.">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="rounded-lg border border-border-default bg-bg-page px-3 py-2 text-sm font-semibold text-white">
                    {user?.name}
                  </span>
                  <Link href="/profile/me/edit" className={secondaryButton}>
                    Edit profile
                  </Link>
                </div>
              </Row>
              <Row
                label="Email"
                description="Used to sign in and to recover your account. A change needs confirming from the new address."
              >
                <form onSubmit={handleEmail} className="flex flex-col gap-3" noValidate>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(event) => {
                      setNewEmail(event.target.value);
                      setEmailError(null);
                    }}
                    // "off": the browser would otherwise put a saved login's
                    // address here, which reads as if the account had changed.
                    autoComplete="off"
                    name="new-account-email"
                    data-1p-ignore
                    data-lpignore="true"
                    aria-label="Email address"
                    className={emailError ? `${controlClass} border-danger focus:ring-danger` : controlClass}
                  />
                  {emailError && <p className="text-[11px] text-danger">{emailError}</p>}
                  <button type="submit" disabled={emailSaving} className={primaryButton}>
                    {emailSaving ? "Sending…" : "Change email"}
                  </button>
                </form>
              </Row>
            </>
          )}

          {section === "password" && (
            <>
              <SectionHeading title="Password" description="Pick something you don't use anywhere else." />
              <Row
                label="Change password"
                description={`At least ${MIN_PASSWORD_LENGTH} characters. Forgot the current one? Log out and use "Forgot password?".`}
              >
                <form onSubmit={handlePassword} className="flex flex-col gap-3" noValidate>
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
                  {passwordError && <p className="text-[11px] text-danger">{passwordError}</p>}
                  <button type="submit" disabled={passwordSaving} className={primaryButton}>
                    {passwordSaving ? "Saving…" : "Change password"}
                  </button>
                </form>
              </Row>
            </>
          )}

          {section === "app" && (
            <>
              <SectionHeading title="App & notifications" description="TemanGame on this device." />
              <Row
                label="Install the app"
                description="Opens in its own window from your home screen. On iPhone it's needed for notifications."
              >
                <InstallAppCard />
              </Row>
              <Row
                label="Push notifications"
                description="Join requests, invites, answers, friend requests and messages reach this device even when TemanGame is closed. Each phone or browser is turned on separately."
              >
                <PushSettingsCard />
              </Row>
              <Row label="Notification history" description="Everything that reached your bell.">
                <Link href="/notifications" className={secondaryButton}>
                  Open notifications
                </Link>
              </Row>
            </>
          )}

          {section === "session" && (
            <>
              <SectionHeading title="Session & account" />
              <Row label="Signed in as" description="The account on this device.">
                <span className="truncate text-sm font-semibold text-white">{email}</span>
              </Row>
              <Row label="Log out" description="Also turns off push notifications on this device.">
                <button
                  type="button"
                  onClick={handleLogout}
                  className={secondaryButton}
                >
                  Log out
                </button>
              </Row>
              <DeleteAccountSection username={user?.name ?? ""} email={email} />
            </>
          )}
        </section>
      </div>
    </div>
  );
}
