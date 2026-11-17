import Image from "next/image";
import Link from "next/link";
import type { LfgTeam } from "@/data/lfg-teams";
import { modeBadgeLabel } from "@/data/mode-badges";
import { findProfileByUsername } from "@/data/player-profiles";
import type { GameInfo } from "@/lib/games";
import RankRangeBadge from "./RankRangeBadge";
import PlayerAvatar from "./PlayerAvatar";

export const modeStyles: Record<LfgTeam["mode"], { label: string; className: string }> = {
  ranked: {
    label: "Ranked",
    className: "border-brand text-brand bg-[rgba(15,23,42,0.8)]",
  },
  casual: {
    label: "Casual",
    className: "border-text-muted text-text-muted bg-bg-card-alt",
  },
  tournament: {
    label: "Tournament",
    className: "border-[#ebc15d] text-[#ebc15d] bg-[rgba(15,23,42,0.8)]",
  },
};

/** The button says what the viewer can do here, not always "Join". */
const joinLabel: Record<NonNullable<LfgTeam["viewerState"]> | "none", string> = {
  none: "Join",
  leader: "Manage",
  member: "Open",
  pending: "Pending",
  declined: "Declined",
};

interface LfgTeamCardProps {
  team: LfgTeam;
  onOpenDetails?: () => void;
  /** The game's ladder, so the accepted range can show real divisions. */
  game?: GameInfo;
}

export default function LfgTeamCard({
  team,
  onOpenDetails,
  game,
}: LfgTeamCardProps) {
  const mode = modeStyles[team.mode];
  const hasOpenSlots = team.slotsFilled < team.slotsTotal;
  // Real lobbies link to the leader's real profile; mock ones only when a mock
  // profile exists.
  const leaderSlug = team.leaderId
    ? team.leaderName
    : findProfileByUsername(team.leaderName)?.slug;
  // CS2, PUBG Mobile and Free Fire have no roles, so nothing to look for.
  const hasRoles = (game?.roles.length ?? 1) > 0;

  return (
    <div
      onClick={onOpenDetails}
      className="flex cursor-pointer flex-col overflow-hidden rounded-xl border border-white/15 bg-bg-card-alt transition-colors hover:border-white/25 sm:h-[231px] sm:flex-row"
    >
      <div className="relative h-[130px] w-full shrink-0 overflow-hidden sm:h-auto sm:w-[128px]">
        <Image
          src={team.cover}
          alt={team.name}
          fill
          sizes="128px"
          className="object-cover object-top"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-transparent from-45% to-bg-card-alt to-85%" />
        <div className="absolute inset-0 flex flex-col justify-between gap-1 p-3">
          <span
            title={team.modeLabel ?? mode.label}
            className={`inline-flex w-fit items-center whitespace-nowrap rounded-full border px-2.5 py-1 text-[9px] font-semibold uppercase tracking-wide ${mode.className}`}
          >
            {modeBadgeLabel(team.modeValue, team.modeLabel ?? mode.label)}
          </span>
          <span className="w-fit rounded border border-white/10 bg-[rgba(15,23,42,0.6)] px-2 py-1 text-[11px] font-semibold text-white opacity-80">
            {team.slotsFilled}/{team.slotsTotal}
          </span>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3.5 p-4 sm:gap-0">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-bold tracking-tight text-white">
              {team.name}
            </h3>
            <span className="flex items-center gap-1.5 text-xs text-text-muted">
              {/* eslint-disable-next-line @next/next/no-img-element -- static SVG icon, no benefit from next/image optimization */}
              <img
                src={
                  team.status.isLive
                    ? "/icons/status-dot-online.svg"
                    : "/icons/status-dot-scheduled.svg"
                }
                alt=""
                className="size-1.5"
              />
              {team.status.label}
            </span>
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-3 text-[10px] text-white/60">
            <span className="flex items-center gap-1.5">
              {/* eslint-disable-next-line @next/next/no-img-element -- static SVG icon, no benefit from next/image optimization */}
              <img src="/icons/lfg-region.svg" alt="" className="size-3" />
              {team.region}
            </span>
            {team.languages && (
              <span className="flex items-center gap-1.5">
                {/* eslint-disable-next-line @next/next/no-img-element -- static SVG icon, no benefit from next/image optimization */}
                <img
                  src="/icons/lfg-language.svg"
                  alt=""
                  className="h-3 w-3.5"
                />
                {team.languages}
              </span>
            )}
            {team.micRequired && (
              <span className="flex items-center gap-1 text-[#10b981]">
                {/* eslint-disable-next-line @next/next/no-img-element -- static SVG icon, no benefit from next/image optimization */}
                <img src="/icons/lfg-mic.svg" alt="" className="h-2.5 w-2" />
                Mic Req.
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-1 flex-wrap items-center gap-x-2.5 gap-y-2">
          <div className="flex items-center">
            {team.members.map((member, index) => (
              <PlayerAvatar
                key={member.id}
                src={member.avatar}
                name={member.name}
                style={{ zIndex: team.members.length - index }}
                className="-ml-3.5 size-10 border-2 border-bg-card-alt text-sm first:ml-0"
              />
            ))}
            {hasOpenSlots && (
              <div className="-ml-3.5 flex size-10 items-center justify-center rounded-full border-2 border-bg-card-alt bg-[#272c33]">
                {/* eslint-disable-next-line @next/next/no-img-element -- static SVG icon, no benefit from next/image optimization */}
                <img src="/icons/lfg-avatar-more.svg" alt="" className="size-3" />
              </div>
            )}
          </div>
          <div className="flex min-w-0 flex-col gap-0.5">
            <p className="text-[11px] text-white/50">
              Led by{" "}
              {leaderSlug ? (
                <Link
                  href={`/profile/${leaderSlug}`}
                  onClick={(event) => event.stopPropagation()}
                  className="text-white hover:text-brand hover:underline"
                >
                  {team.leaderName}
                </Link>
              ) : (
                <span className="text-white">{team.leaderName}</span>
              )}
            </p>
            {/* The one rank thing a card shows: what the leader accepts. The
                leader's own rank lives in the details, and only orders results. */}
            <RankRangeBadge
              range={team.rankRange}
              ranks={game?.ranks}
              gameSlug={team.game}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          {hasRoles ? (
          <div className="flex items-center gap-2">
            <span className="w-[84px] text-[10px] font-medium uppercase tracking-wider text-white/70">
              Looking for:
            </span>
            <div className="flex items-center gap-1.5">
              {team.lookingFor.map((role) => (
                <div
                  key={role.name}
                  title={role.name}
                  className="flex size-7 items-center justify-center rounded-md border border-brand/30 bg-brand/10"
                >
                  {role.icon ? (
                    // eslint-disable-next-line @next/next/no-img-element -- static SVG icon, no benefit from next/image optimization
                    <img src={role.icon} alt={role.name} className="size-3.5" />
                  ) : (
                    <span className="text-[9px] font-bold text-brand">
                      {role.name.slice(0, 2)}
                    </span>
                  )}
                </div>
              ))}
              {team.lookingFor.length === 0 && (
                <span className="text-[11px] text-white/60">Any role</span>
              )}
            </div>
          </div>
          ) : (
            <span />
          )}
          <button
            type="button"
            onClick={onOpenDetails}
            className="flex h-6 min-w-[64px] items-center justify-center rounded-md bg-[#272c33] px-2 text-xs font-bold text-white transition-opacity hover:opacity-90"
          >
            {joinLabel[team.viewerState ?? "none"]}
          </button>
        </div>
      </div>
    </div>
  );
}
