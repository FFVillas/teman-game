"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNotifications } from "@/contexts/NotificationContext";
import { createClient } from "@/lib/supabase/client";
import {
  acceptFriendRequest,
  removeFriendship,
  sendFriendRequest,
} from "@/lib/social";

type Relation =
  | { kind: "loading" }
  | { kind: "none" }
  | { kind: "sent"; friendshipId: string }
  | { kind: "incoming"; friendshipId: string }
  | { kind: "friends"; friendshipId: string };

const buttonClass =
  "flex h-10 items-center justify-center gap-2 rounded-lg border px-4 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60";

/**
 * "Add friend" on someone else's profile. Reads the friendship between the
 * viewer and this player first, so the button says where things stand: add,
 * request sent (click to cancel), accept their request, or already friends.
 * Mock profiles have no account to befriend, so they keep the old toast.
 */
export default function ProfileFriendButton({
  targetId,
  targetName,
}: {
  /** The player's account id; undefined for mock profiles. */
  targetId?: string;
  targetName: string;
}) {
  const { user, isReady } = useAuth();
  const { toast, notifyPlayer } = useNotifications();
  const [loaded, setRelation] = useState<Relation>({ kind: "loading" });
  const [busy, setBusy] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const viewerId = user?.id;
  const pathname = usePathname();
  const relation: Relation =
    isReady && (!targetId || !viewerId) ? { kind: "none" } : loaded;

  useEffect(() => {
    if (!isReady) return;
    // Nothing to look up for a mock profile or a signed-out visitor.
    if (!targetId || !viewerId) return;
    let cancelled = false;
    createClient()
      .from("friendships")
      .select("id, requester_id, status")
      .or(
        `and(requester_id.eq.${viewerId},addressee_id.eq.${targetId}),and(requester_id.eq.${targetId},addressee_id.eq.${viewerId})`,
      )
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        if (!data) setRelation({ kind: "none" });
        else if (data.status === "accepted")
          setRelation({ kind: "friends", friendshipId: data.id as string });
        else if (data.requester_id === viewerId)
          setRelation({ kind: "sent", friendshipId: data.id as string });
        else setRelation({ kind: "incoming", friendshipId: data.id as string });
      });
    return () => {
      cancelled = true;
    };
  }, [isReady, targetId, viewerId]);

  // Signed out: the button leads to login and back here.
  if (isReady && !user) {
    return (
      <Link
        href={`/login?next=${encodeURIComponent(pathname)}`}
        className={`${buttonClass} border-border-strong text-text-subtle hover:text-white`}
      >
        <AddIcon />
        Add friend
      </Link>
    );
  }

  async function handleClick() {
    if (!user) return;

    if (!targetId) {
      // Mock profile: nobody real to send to.
      toast({
        tone: "success",
        title: "Friend request sent",
        body: `${targetName} has been notified.`,
      });
      return;
    }

    const supabase = createClient();
    setBusy(true);

    if (relation.kind === "none") {
      const ok = await sendFriendRequest(supabase, user.id, targetId);
      if (ok) {
        const { data } = await supabase
          .from("friendships")
          .select("id")
          .eq("requester_id", user.id)
          .eq("addressee_id", targetId)
          .maybeSingle();
        setRelation({ kind: "sent", friendshipId: (data?.id as string) ?? "" });
        notifyPlayer(targetId, {
          kind: "friend_request",
          title: `${user.name} sent you a friend request`,
          href: "/social/pending",
        });
      } else {
        toast({
          tone: "danger",
          title: "Couldn't send that request",
          body: "You may have blocked each other. Try again later.",
        });
      }
    } else if (relation.kind === "sent") {
      const ok = await removeFriendship(supabase, relation.friendshipId);
      if (ok) setRelation({ kind: "none" });
      else toast({ tone: "danger", title: "Couldn't cancel the request", body: "Try again in a moment." });
    } else if (relation.kind === "incoming") {
      const ok = await acceptFriendRequest(supabase, relation.friendshipId);
      if (ok) setRelation({ kind: "friends", friendshipId: relation.friendshipId });
      else toast({ tone: "danger", title: "Couldn't accept the request", body: "Try again in a moment." });
    }

    setBusy(false);
  }

  if (relation.kind === "friends") {
    const friendshipId = relation.friendshipId;
    // "Friends" until clicked; a second click removes them, so a stray tap
    // doesn't end a friendship.
    return (
      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          if (!confirmRemove) {
            setConfirmRemove(true);
            setTimeout(() => setConfirmRemove(false), 4000);
            return;
          }
          setBusy(true);
          const ok = await removeFriendship(createClient(), friendshipId);
          setBusy(false);
          setConfirmRemove(false);
          if (ok) setRelation({ kind: "none" });
          else toast({ tone: "danger", title: "Couldn't remove them", body: "Try again in a moment." });
        }}
        title={confirmRemove ? "Click again to remove" : "Click to remove this friend"}
        className={`${buttonClass} ${
          confirmRemove
            ? "border-danger bg-danger/10 text-danger"
            : "border-success/40 text-success hover:border-danger hover:text-danger"
        }`}
      >
        {confirmRemove ? null : <CheckIcon />}
        {confirmRemove ? "Remove friend?" : "Friends"}
      </button>
    );
  }

  const label =
    relation.kind === "sent"
      ? "Request sent"
      : relation.kind === "incoming"
        ? "Accept request"
        : "Add friend";

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={busy || relation.kind === "loading"}
      title={relation.kind === "sent" ? "Click to cancel the request" : undefined}
      className={`${buttonClass} ${
        relation.kind === "incoming"
          ? "border-brand text-white hover:bg-brand/10"
          : relation.kind === "sent"
            ? "border-border-strong text-text-muted hover:border-danger hover:text-danger"
            : "border-border-strong text-text-subtle hover:border-white/30 hover:text-white"
      }`}
    >
      {relation.kind === "sent" ? <CheckIcon /> : <AddIcon />}
      {label}
    </button>
  );
}

function AddIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="6.5" cy="5.5" r="2.75" stroke="currentColor" strokeWidth="1.3" />
      <path d="M1.5 15C1.5 12 3.75 9.75 6.5 9.75C9.25 9.75 11.5 12 11.5 15" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M13.25 5V9M11.25 7H15.25" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M3 8.5L6.5 12L13 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
