"use client";

import { fieldBaseClass, fieldLabelClass, fieldStateClass } from "@/components/auth/fieldStyles";
import FormDropdown from "@/components/FormDropdown";
import { formatFor } from "@/data/game-accounts";
import { regionsFor } from "@/data/game-regions";
import { rankIconFor } from "@/data/rank-icons";
import { roleIconFor } from "@/data/role-icons";
import type { GameProfile } from "@/lib/game-profile";
import type { GameInfo } from "@/lib/games";
import { controlClass, labelClass } from "./DossierFields";

/**
 * The fields for one game, shared by onboarding ("md", the auth look) and the
 * edit form ("sm", the compact profile look) so the two can't drift:
 *
 *  - the account the game asks for (a Riot ID, or a nickname plus an ID), with
 *    a hint on where to find it and a check on its shape;
 *  - region and rank as dropdowns, the rank with its badge for the games that
 *    have badge art;
 *  - roles, only for games that have them.
 *
 * Everything is picked or typed by the player; nothing here is verified.
 */
export default function GameDetailsFields({
  game,
  profile,
  onUpdate,
  size = "sm",
}: {
  game: GameInfo;
  profile: GameProfile;
  onUpdate: (patch: Partial<GameProfile>) => void;
  size?: "sm" | "md";
}) {
  const format = formatFor(game.slug);
  const regionList = regionsFor(game.slug);
  const label = size === "md" ? fieldLabelClass : labelClass;
  const values = { ign: profile.username, id: profile.accountId, zone: profile.zoneId };
  const patchKey = { ign: "username", id: "accountId", zone: "zoneId" } as const;

  function inputClass(invalid: boolean) {
    if (size === "md") return `${fieldBaseClass} ${fieldStateClass(invalid)}`;
    return invalid
      ? controlClass
          .replace("border-border-strong", "border-danger")
          .replace("focus:ring-brand", "focus:ring-danger")
      : controlClass;
  }

  /** off → picked → favourite → off */
  function cycleRole(role: string) {
    const picked = profile.roles.includes(role);
    const favourite = profile.favoriteRoles.includes(role);
    if (!picked) {
      onUpdate({ roles: [...profile.roles, role] });
    } else if (!favourite) {
      onUpdate({ favoriteRoles: [...profile.favoriteRoles, role] });
    } else {
      onUpdate({
        roles: profile.roles.filter((entry) => entry !== role),
        favoriteRoles: profile.favoriteRoles.filter((entry) => entry !== role),
      });
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <div className="grid gap-3 sm:grid-cols-2">
          {format.fields.map((field) => {
            const value = values[field.key];
            const invalid = Boolean(
              value.trim() && field.pattern && !field.pattern.test(value.trim()),
            );
            // A lone field, or the name above two IDs, takes the full row.
            const wide =
              format.fields.length === 1 ||
              (format.fields.length === 3 && field.key === "ign");
            return (
              <div
                key={field.key}
                className={`flex flex-col gap-1.5 ${wide ? "sm:col-span-2" : ""}`}
              >
                <span className={label}>{field.label}</span>
                <input
                  value={value}
                  onChange={(event) =>
                    onUpdate({ [patchKey[field.key]]: event.target.value })
                  }
                  inputMode={field.numeric ? "numeric" : undefined}
                  placeholder={field.placeholder}
                  maxLength={field.key === "zone" ? 8 : field.key === "id" ? 20 : 40}
                  aria-invalid={invalid || undefined}
                  className={inputClass(invalid)}
                />
                {invalid && field.error && (
                  <span className="text-[11px] text-danger">{field.error}</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <span className={label}>Region</span>
          <FormDropdown
            size={size}
            label={`${game.name} region`}
            value={profile.region || regionList.default}
            onChange={(region) => onUpdate({ region })}
            options={regionList.options}
            allowEmpty={false}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <span className={label}>Current rank</span>
          <FormDropdown
            size={size}
            label={`${game.name} rank`}
            placeholder="Not sure yet"
            value={profile.rank}
            onChange={(rank) => onUpdate({ rank })}
            options={game.ranks.map((rank) => ({
              value: rank.name,
              label: rank.name,
              icon: rankIconFor(game.slug, rank),
            }))}
          />
        </div>
      </div>

      {game.roles.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <span className={label}>Roles you play</span>
          <div className="flex flex-wrap gap-1.5">
            {game.roles.map((role) => {
              const selected = profile.roles.includes(role.name);
              const favourite = selected && profile.favoriteRoles.includes(role.name);
              const icon = roleIconFor(game.slug, role.name);
              return (
                <button
                  key={role.id}
                  type="button"
                  onClick={() => cycleRole(role.name)}
                  aria-pressed={selected}
                  title={
                    !selected
                      ? "Tap to add"
                      : favourite
                        ? "Favourite. Tap to remove"
                        : "Tap again to make it a favourite"
                  }
                  className={`relative flex items-center gap-1.5 rounded-full border transition-colors ${
                    size === "md" ? "px-4 py-1.5 text-xs" : "px-3 py-1.5 text-[11px]"
                  } ${
                    selected
                      ? "border-brand bg-brand/10 text-brand"
                      : "border-border-strong text-text-muted hover:border-white/30"
                  }`}
                >
                  {icon && (
                    // eslint-disable-next-line @next/next/no-img-element -- static icon, no benefit from next/image optimization
                    <img src={icon} alt="" className="size-3.5" />
                  )}
                  {role.name}
                  {favourite && (
                    <span
                      aria-label="Favourite"
                      className="absolute -right-1.5 -top-1.5 flex size-4 items-center justify-center rounded-full bg-star text-[13px] leading-none text-bg-page"
                    >
                      ★
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <p className="text-[11px] text-text-muted">
            Tap once to add a role, twice to make it a favourite (★), a third time to remove it.
          </p>
        </div>
      )}
    </div>
  );
}
