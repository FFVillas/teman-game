"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useNotifications } from "@/contexts/NotificationContext";
import { createClient } from "@/lib/supabase/client";
import { disablePush } from "@/lib/push";
import { controlClass, labelClass } from "@/components/profile/DossierFields";

const errorWords: Record<string, string> = {
  staff_account: "Staff accounts are removed by another admin.",
  suspended:
    "You can't delete your account while it's suspended. You can once the suspension ends.",
  not_signed_in: "Your session ended. Log in again, then try once more.",
};

/**
 * Self-service account deletion (`delete_my_account()`,
 * 20261119000300_delete_own_account.sql). Deliberately hard to do by
 * accident: the player types their username and their password, which is
 * checked again before anything is removed.
 */
export default function DeleteAccountSection({
  username,
  email,
}: {
  username: string;
  email: string;
}) {
  const router = useRouter();
  const { toast } = useNotifications();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const matches = typed.trim().toLowerCase() === username.toLowerCase();

  async function handleDelete(event: FormEvent) {
    event.preventDefault();
    if (!matches || !password || deleting) return;
    setError(null);
    setDeleting(true);
    const supabase = createClient();

    // The password again, so a borrowed, unlocked phone isn't enough.
    const { data: auth, error: wrong } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (wrong || !auth.user) {
      setDeleting(false);
      setError("That password isn't right.");
      return;
    }

    // The profile picture is a Storage file: removed through the Storage API.
    const folder = auth.user.id;
    const { data: files } = await supabase.storage.from("avatars").list(folder);
    if (files?.length) {
      await supabase.storage
        .from("avatars")
        .remove(files.map((file) => `${folder}/${file.name}`))
        .catch(() => {});
    }
    await disablePush(supabase).catch(() => {});

    const { error: failure } = await supabase.rpc("delete_my_account");
    if (failure) {
      setDeleting(false);
      const key = Object.keys(errorWords).find((code) => failure.message.includes(code));
      setError(key ? errorWords[key] : "Your account couldn't be deleted. Try again in a moment.");
      return;
    }

    // The account no longer exists; clear what this browser still holds.
    await supabase.auth.signOut({ scope: "local" }).catch(() => {});
    toast({
      tone: "info",
      title: "Account deleted",
      body: "Your profile and data have been removed. Thanks for playing.",
    });
    router.replace("/");
    router.refresh();
  }

  return (
    <div className="mt-2 rounded-xl border border-danger/40 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1">
          <h3 className="text-sm font-semibold text-danger">Delete account</h3>
          <p className="text-xs leading-relaxed text-text-muted">
            Removes your account for good: your profile, games, lobbies you lead, friends,
            messages, ratings you gave and received, and reports and sanctions on record. It
            can&apos;t be undone.
          </p>
        </div>
        {!open && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="flex h-10 shrink-0 items-center justify-center rounded-lg border border-danger/60 px-4 text-xs font-bold text-danger transition-colors hover:bg-danger/10"
          >
            Delete my account
          </button>
        )}
      </div>

      {open && (
        <form onSubmit={handleDelete} className="mt-4 flex flex-col gap-3 border-t border-danger/20 pt-4" noValidate>
          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>
              Type <span className="font-bold normal-case text-white">{username}</span> to confirm
            </span>
            <input
              value={typed}
              onChange={(event) => setTyped(event.target.value)}
              autoComplete="off"
              className={controlClass}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>Your password</span>
            <input
              type="password"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                setError(null);
              }}
              autoComplete="current-password"
              className={controlClass}
            />
          </label>
          {error && <p className="text-[11px] text-danger">{error}</p>}
          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={!matches || !password || deleting}
              className="flex h-10 items-center justify-center rounded-lg bg-danger px-4 text-xs font-bold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {deleting ? "Deleting…" : "Delete my account forever"}
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setTyped("");
                setPassword("");
                setError(null);
              }}
              className="flex h-10 items-center justify-center rounded-lg px-3 text-xs font-semibold text-text-muted hover:text-white"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
