"use client";

import { useEffect, useState } from "react";
import UserAvatar from "@/components/UserAvatar";
import { EmptyState } from "@/components/EmptyState";
import { useAuth } from "@/contexts/AuthContext";
import { useNotifications } from "@/contexts/NotificationContext";
import { createClient } from "@/lib/supabase/client";
import { fetchBlocked, unblockUser, type BlockedRow } from "@/lib/social";

export default function SocialBlockedPanel() {
  const { user, isReady } = useAuth();
  const { toast } = useNotifications();
  const [blocked, setBlocked] = useState<BlockedRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isReady) return;
    let cancelled = false;
    const load = user
      ? fetchBlocked(createClient(), user.id)
      : Promise.resolve<BlockedRow[]>([]);
    load.then((rows) => {
      if (!cancelled) {
        setBlocked(rows);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [isReady, user]);

  async function handleUnblock(row: BlockedRow) {
    const ok = await unblockUser(createClient(), row.blockId);
    if (!ok) {
      toast({
        tone: "danger",
        title: "Couldn't unblock that player",
        body: "Try again in a moment.",
      });
      return;
    }
    // No pop-up: the row leaves the blocked list.
    setBlocked((prev) => prev.filter((b) => b.blockId !== row.blockId));
  }

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <div className="flex items-center gap-2 border-b border-border-default px-6 py-4">
        {/* eslint-disable-next-line @next/next/no-img-element -- static SVG icon, no benefit from next/image optimization */}
        <img src="/icons/social-blocked.svg" alt="" className="h-auto w-4 opacity-70" />
        <span className="text-sm font-bold text-white">Blocked</span>
      </div>

      <div className="px-6 pb-2 pt-4">
        <p className="text-sm text-text-muted">
          Players you&apos;ve blocked can&apos;t send you friend requests.
          They&apos;re not told they&apos;ve been blocked.
        </p>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto p-6 pt-2">
        {loading ? null : blocked.length === 0 ? (
          <EmptyState
            fill
            icon="/icons/social-blocked.svg"
            title="No blocked players"
            description="Players you block will show up here."
          />
        ) : (
          blocked.map((row) => (
            <div
              key={row.blockId}
              className="flex items-center justify-between gap-3 rounded-xl px-3 py-3 transition-colors hover:bg-white/5"
            >
              <div className="flex items-center gap-3">
                <UserAvatar src={row.avatar} name={row.username} className="size-10" />
                <span className="text-sm font-bold text-white">{row.username}</span>
              </div>
              <button
                type="button"
                onClick={() => handleUnblock(row)}
                className="flex h-8 items-center justify-center rounded-lg border border-border-strong px-3 text-xs font-semibold text-text-muted transition-colors hover:border-brand/60 hover:text-white"
              >
                Unblock
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
