"use client";

import type { LobbyViewerRole } from "@/data/lfg-lobby";

const roles: { id: LobbyViewerRole; label: string }[] = [
  { id: "leader", label: "Leader" },
  { id: "member", label: "Member" },
];

/**
 * DEMO ONLY. In the real system your role is decided by the data — you lead
 * the lobby you created, and you're a member of one you applied to. There's
 * no signed-in user yet, so this exposes both screens for review.
 *
 * Delete this component once Supabase Auth lands and derive the role from
 * `lobby.leaderId === session.user.id` instead.
 */
export default function RoleSwitcher({
  role,
  onChange,
}: {
  role: LobbyViewerRole;
  onChange: (role: LobbyViewerRole) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
        Preview as
      </span>
      <div
        role="radiogroup"
        aria-label="Preview lobby as"
        className="flex gap-1 rounded-lg border border-dashed border-border-strong p-1"
      >
        {roles.map((option) => (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={role === option.id}
            onClick={() => onChange(option.id)}
            className={`rounded-md px-3 py-1 text-[11px] font-semibold transition-colors ${
              role === option.id
                ? "bg-white/10 text-white"
                : "text-text-muted hover:text-white"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
