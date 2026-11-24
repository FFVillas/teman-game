"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNotifications } from "@/contexts/NotificationContext";
import { createClient } from "@/lib/supabase/client";
import { sendFriendRequest } from "@/lib/social";

type Relation = "loading" | "none" | "sent" | "other";

/**
 * The add-friend icon in the rating pop-up, shown only while there is no
 * friendship either way: right after playing together is when a good
 * teammate is worth keeping. Once sent it stays as a tick ("Request sent").
 * Friends, and requests already pending from either side, show nothing;
 * those are answered on the profile and in Social.
 */
export default function RatingFriendButton({
  targetId,
  className,
}: {
  targetId: string;
  className: string;
}) {
  const { user } = useAuth();
  const { toast, notifyPlayer } = useNotifications();
  const [relation, setRelation] = useState<Relation>("loading");
  const [busy, setBusy] = useState(false);
  const viewerId = user?.id;

  useEffect(() => {
    if (!viewerId) return;
    let cancelled = false;
    createClient()
      .from("friendships")
      .select("id")
      .or(
        `and(requester_id.eq.${viewerId},addressee_id.eq.${targetId}),and(requester_id.eq.${targetId},addressee_id.eq.${viewerId})`,
      )
      .maybeSingle()
      .then(({ data, error }) => {
        if (!cancelled) setRelation(error ? "other" : data ? "other" : "none");
      });
    return () => {
      cancelled = true;
    };
  }, [viewerId, targetId]);

  if (!user || relation === "loading" || relation === "other") return null;

  async function add() {
    if (!user || busy) return;
    setBusy(true);
    const ok = await sendFriendRequest(createClient(), user.id, targetId);
    setBusy(false);
    if (!ok) {
      toast({
        tone: "danger",
        title: "Couldn't send that request",
        body: "You may have blocked each other. Try again later.",
      });
      return;
    }
    setRelation("sent");
    notifyPlayer(targetId, {
      kind: "friend_request",
      title: `${user.name} sent you a friend request`,
      href: "/social/pending",
    });
  }

  const sent = relation === "sent";
  return (
    <button
      type="button"
      onClick={add}
      disabled={busy || sent}
      aria-label={sent ? "Friend request sent" : "Add friend"}
      title={sent ? "Friend request sent" : "Add friend"}
      className={`${className} ${sent ? "border-success/50" : "hover:border-brand"}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- static SVG icon, no benefit from next/image optimization */}
      <img
        src={sent ? "/icons/action-accept.svg" : "/icons/social-add-friend.svg"}
        alt=""
        className="size-4"
      />
    </button>
  );
}
