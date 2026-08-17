"use client";

import { useState } from "react";
import type { PendingRequest } from "@/data/social-pending";

export default function PendingRequestRow({
  request,
}: {
  request: PendingRequest;
}) {
  const [resolved, setResolved] = useState<"accepted" | "declined" | null>(
    null
  );

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl px-3 py-3 transition-colors hover:bg-white/5">
      <div className="flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element -- small avatar thumbnail, no benefit from next/image optimization */}
        <img
          src={request.avatar}
          alt=""
          className="size-10 rounded-full object-cover"
        />
        <div className="flex flex-col">
          <span className="text-sm font-bold text-white">{request.name}</span>
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
            onClick={() => setResolved("accepted")}
            aria-label="Accept"
            className="flex size-8 items-center justify-center rounded-full text-text-muted transition-colors hover:bg-white/10 hover:text-[#10b981]"
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
            onClick={() => setResolved("declined")}
            aria-label="Decline"
            className="flex size-8 items-center justify-center rounded-full text-text-muted transition-colors hover:bg-white/10 hover:text-[#ef4444]"
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
