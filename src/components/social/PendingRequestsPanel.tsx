"use client";

import { useEffect, useState } from "react";
import PendingRequestRow from "./PendingRequestRow";
import { EmptyState } from "@/components/EmptyState";
import { useAuth } from "@/contexts/AuthContext";
import { createClient } from "@/lib/supabase/client";
import { fetchIncomingRequests, type IncomingRequestRow } from "@/lib/social";

export default function PendingRequestsPanel() {
  const { user, isReady } = useAuth();
  const [requests, setRequests] = useState<IncomingRequestRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isReady) return;
    let cancelled = false;
    const load = user
      ? fetchIncomingRequests(createClient(), user.id)
      : Promise.resolve<IncomingRequestRow[]>([]);
    load.then((rows) => {
      if (!cancelled) {
        setRequests(rows);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [isReady, user]);

  function handleResolved(friendshipId: string) {
    setRequests((prev) => prev.filter((r) => r.friendshipId !== friendshipId));
  }

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <div className="flex items-center gap-2 border-b border-border-default px-6 py-4">
        {/* eslint-disable-next-line @next/next/no-img-element -- static SVG icon, no benefit from next/image optimization */}
        <img src="/icons/social-inbox.svg" alt="" className="h-auto w-4 opacity-70" />
        <span className="text-base font-bold text-white">Pending Requests</span>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto p-6">
        {loading ? null : requests.length === 0 ? (
          <EmptyState
            icon="/icons/social-inbox.svg"
            title="No pending requests"
            description="Friend requests you receive will show up here."
          />
        ) : (
          requests.map((request) => (
            <PendingRequestRow
              key={request.friendshipId}
              request={request}
              onResolved={() => handleResolved(request.friendshipId)}
            />
          ))
        )}
      </div>
    </div>
  );
}
