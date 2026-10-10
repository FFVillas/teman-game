"use client";

import { useState } from "react";
import UserAvatar from "@/components/UserAvatar";
import { useNotifications } from "@/contexts/NotificationContext";
import { createClient } from "@/lib/supabase/client";
import {
  acceptFriendRequest,
  removeFriendship,
  type IncomingRequestRow,
} from "@/lib/social";

export default function PendingRequestRow({
  request,
  onResolved,
}: {
  request: IncomingRequestRow;
  onResolved: () => void;
}) {
  const { toast } = useNotifications();
  const [resolved, setResolved] = useState<"accepted" | "declined" | null>(
    null
  );
  const [busy, setBusy] = useState(false);

  async function handleAccept() {
    setBusy(true);
    const ok = await acceptFriendRequest(createClient(), request.friendshipId);
    setBusy(false);
    if (!ok) {
      toast({
        tone: "danger",
        title: "Couldn't accept that request",
        body: "Try again in a moment.",
      });
      return;
    }
    setResolved("accepted");
    setTimeout(onResolved, 900);
  }

  async function handleDecline() {
    setBusy(true);
    const ok = await removeFriendship(createClient(), request.friendshipId);
    setBusy(false);
    if (!ok) {
      toast({
        tone: "danger",
        title: "Couldn't decline that request",
        body: "Try again in a moment.",
      });
      return;
    }
    setResolved("declined");
    setTimeout(onResolved, 900);
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl px-3 py-3 transition-colors hover:bg-white/5">
      <div className="flex items-center gap-3">
        <UserAvatar src={request.avatar} name={request.username} className="size-10" />
        <div className="flex flex-col">
          <span className="text-sm font-bold text-white">{request.username}</span>
          <span className="text-xs text-text-muted">
            {resolved === "accepted"
              ? "Friend added"
              : resolved === "declined"
                ? "Request declined"
                : `Sent ${request.sentAgo}`}
          </span>
        </div>
      </div>

      {!resolved && (
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleAccept}
            disabled={busy}
            aria-label="Accept"
            className="flex size-8 items-center justify-center rounded-full text-text-muted transition-colors hover:bg-white/10 hover:text-[#10b981] disabled:pointer-events-none disabled:opacity-40"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M3 8.5L6.5 12L13 4"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <button
            type="button"
            onClick={handleDecline}
            disabled={busy}
            aria-label="Decline"
            className="flex size-8 items-center justify-center rounded-full text-text-muted transition-colors hover:bg-white/10 hover:text-[#ef4444] disabled:pointer-events-none disabled:opacity-40"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M4 4L12 12M12 4L4 12"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
