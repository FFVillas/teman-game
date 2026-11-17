import { NotSet, NotSetOrAdd } from "@/components/EmptyState";
import { formatFor } from "@/data/game-accounts";
import { roleIconFor } from "@/data/role-icons";

/** One game on a profile, as the card draws it. */
export interface GameSummary {
  slug: string;
  name: string;
  inGameName: string;
  accountId: string;
  zoneId: string;
  /** Display label, e.g. "Asia Pacific (AP)". */
  region: string;
  /** Rank name, e.g. "Gold 2"; empty when not set. */
  rank: string;
  /** Badge art for the rank; empty for games without art yet. */
  rankIcon: string;
  roles: string[];
  /** The favourites among `roles`. */
  favoriteRoles: string[];
}

const label = "text-[9px] font-bold uppercase tracking-wider text-text-muted";

/** "Player ID", "UID", "Character ID": what this game calls its account number. */
function accountIdLabel(slug: string): string {
  return formatFor(slug).fields.find((field) => field.key === "id")?.label ?? "Account ID";
}

/** "Gold Lane" becomes "GL", "Roam" becomes "Ro": a stand-in for roles with no icon. */
function initials(role: string): string {
  const words = role.split(/\s+/).filter(Boolean);
  return words.length > 1
    ? words
        .slice(0, 2)
        .map((word) => word.charAt(0).toUpperCase())
        .join("")
    : role.slice(0, 2);
}

function RoleTile({
  slug,
  role,
  favorite = false,
}: {
  slug: string;
  role: string;
  favorite?: boolean;
}) {
  const icon = roleIconFor(slug, role);
  return (
    <span
      title={role}
      className="relative flex h-8 min-w-8 items-center justify-center rounded-lg border border-border-strong bg-bg-page px-2 text-[9px] font-bold text-text-subtle"
    >
      {icon ? (
        // eslint-disable-next-line @next/next/no-img-element -- static role icon, no benefit from next/image optimization
        <img src={icon} alt={role} className="size-3.5" />
      ) : (
        initials(role)
      )}
      {favorite && (
        <span
          aria-label="Favourite"
          className="absolute -right-1.5 -top-1.5 flex size-3 items-center justify-center rounded-full bg-star text-[10px] leading-none text-bg-page"
        >
          ★
        </span>
      )}
    </span>
  );
}

/**
 * A player's setup for one game, laid out like the design: the rank badge in a
 * circle on the left with its name under it, and on the right the in-game
 * name, where they play, and the roles they take. There is no win rate or
 * level: nothing reads those from the game yet, so showing them would be
 * showing something nobody checked.
 */
export default function GameSummaryCard({
  game,
  isOwner,
  editHref,
}: {
  game: GameSummary;
  isOwner: boolean;
  editHref: string;
}) {
  const main = game.roles.filter((role) => game.favoriteRoles.includes(role));
  const others = game.roles.filter((role) => !game.favoriteRoles.includes(role));
  const account = game.accountId
    ? `${accountIdLabel(game.slug)} ${game.accountId}${game.zoneId ? ` (${game.zoneId})` : ""}`
    : "";
  const where = [game.region, account].filter(Boolean);

  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
      <div className="flex w-[104px] shrink-0 flex-col items-center gap-2.5">
        <div className="flex size-20 items-center justify-center rounded-full border border-border-strong bg-bg-page shadow-lg shadow-black/30">
          {game.rankIcon ? (
            // eslint-disable-next-line @next/next/no-img-element -- rank badge art, no benefit from next/image optimization
            <img src={game.rankIcon} alt="" className="size-14 object-contain" />
          ) : game.rank ? (
            <span className="text-xl font-extrabold text-text-subtle">
              {game.rank.charAt(0)}
            </span>
          ) : (
            <span className="text-[10px] font-semibold uppercase tracking-wide text-text-muted">
              Unranked
            </span>
          )}
        </div>
        <div className="text-center">
          {game.rank ? (
            <span className="text-[11px] font-bold uppercase tracking-widest text-white">
              {game.rank}
            </span>
          ) : (
            <NotSetOrAdd isOwner={isOwner} href={editHref} action="Add rank" label="Rank not set" />
          )}
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-4">
        <div className="flex min-w-0 flex-col gap-1">
          {game.inGameName ? (
            <h3 className="truncate text-base font-semibold leading-6 text-white">
              {game.inGameName}
            </h3>
          ) : (
            <NotSetOrAdd
              isOwner={isOwner}
              href={editHref}
              action="Add your in-game name"
              label="In-game name not set"
            />
          )}
          {where.length > 0 ? (
            <p className="text-xs text-text-muted">{where.join(" · ")}</p>
          ) : (
            <NotSet label="Region not set" />
          )}
        </div>

        {game.roles.length > 0 && (
          <div className="flex flex-wrap items-start gap-x-6 gap-y-3">
            {main.length > 0 && (
              <div className="flex flex-col gap-2">
                <span className={label}>Main role</span>
                <div className="flex flex-wrap gap-1.5">
                  {main.map((role) => (
                    <RoleTile key={role} slug={game.slug} role={role} favorite />
                  ))}
                </div>
              </div>
            )}
            {others.length > 0 && (
              <div className="flex flex-col gap-2">
                <span className={label}>{main.length > 0 ? "Also plays" : "Roles"}</span>
                <div className="flex flex-wrap gap-1.5">
                  {others.map((role) => (
                    <RoleTile key={role} slug={game.slug} role={role} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
