"use client";

import { useAdminData } from "@/contexts/AdminDataContext";
import { lowRatingReasons } from "@/data/review-options";
import { formatAgo } from "@/lib/admin";
import { AdminCard } from "./AdminUi";

/**
 * The reasons other players gave with 1–2 star ratings of this player
 * (proposal 3.3.1.2: the reason "menjadi catatan untuk keperluan moderasi").
 * A pattern here (three AFKs in a week) backs up a report; one is noise.
 * Raters are never named, so ratings stay anonymous to staff as well.
 */
export default function LowRatingsCard({ playerId, name }: { playerId: string; name: string }) {
  const { lowRatings, lobbies } = useAdminData();
  const rows = lowRatings.filter((row) => row.playerId === playerId);
  const label = (value: string) =>
    lowRatingReasons.find((reason) => reason.value === value)?.label ?? value;

  const counts = new Map<string, number>();
  for (const row of rows) counts.set(row.reason, (counts.get(row.reason) ?? 0) + 1);

  return (
    <AdminCard title={`Low ratings ${name} received`}>
      {rows.length === 0 ? (
        <p className="text-[11px] text-text-muted">
          No 1–2 star ratings. Reasons appear here when teammates give one.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-1.5">
            {[...counts].map(([reason, count]) => (
              <span
                key={reason}
                className="rounded-full bg-danger/10 px-2.5 py-1 text-[11px] font-semibold text-danger"
              >
                {label(reason)} × {count}
              </span>
            ))}
          </div>
          <ul className="flex flex-col divide-y divide-border-subtle">
            {rows.slice(0, 8).map((row, index) => (
              <li key={`${row.lobbyId}-${index}`} className="flex items-center justify-between gap-3 py-2 text-xs">
                <span className="text-text-subtle">
                  {"★".repeat(row.stars)} {label(row.reason)}
                  <span className="text-text-muted">
                    {" "}
                    · {lobbies.find((lobby) => lobby.id === row.lobbyId)?.name ?? "a past lobby"}
                  </span>
                </span>
                <span className="shrink-0 text-[11px] text-text-muted">{formatAgo(row.at)}</span>
              </li>
            ))}
          </ul>
          <p className="text-[11px] text-text-muted">Raters stay anonymous, to staff as well.</p>
        </div>
      )}
    </AdminCard>
  );
}
