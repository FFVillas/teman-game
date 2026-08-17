import Image from "next/image";
import Link from "next/link";
import type { LfgTeam } from "@/data/lfg-teams";
import { findProfileByUsername } from "@/data/player-profiles";

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

interface LfgTeamCardProps {
  team: LfgTeam;
  onOpenDetails?: () => void;
}

export default function LfgTeamCard({ team, onOpenDetails }: LfgTeamCardProps) {
  const mode = modeStyles[team.mode];
  const hasOpenSlots = team.slotsFilled < team.slotsTotal;
  const leaderProfile = findProfileByUsername(team.leaderName);

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
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-transparent from-45% to-bg-card-alt to-85%" />
        <div className="absolute inset-0 flex flex-col justify-between gap-1 p-3">
          <span
            className={`inline-flex w-fit items-center rounded-full border px-3 py-1 text-[9px] font-semibold uppercase tracking-wide ${mode.className}`}
          >
            {mode.label}
          </span>
          <span className="w-fit rounded border border-white/10 bg-[rgba(15,23,42,0.6)] px-2 py-1 text-[11px] font-semibold text-white opacity-80">
            {team.slotsFilled}/{team.slotsTotal}
          </span>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-4">
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

        <div className="flex flex-1 items-center gap-2.5">
          <div className="flex items-center">
            {team.members.map((member) => (
              // eslint-disable-next-line @next/next/no-img-element -- small avatar thumbnails, no benefit from next/image optimization
              <img
                key={member.id}
                src={member.avatar}
                alt=""
                className="-ml-3.5 size-10 rounded-full border-2 border-bg-card-alt object-cover first:ml-0"
              />
            ))}
            {hasOpenSlots && (
              <div className="-ml-3.5 flex size-10 items-center justify-center rounded-full border-2 border-bg-card-alt bg-[#272c33]">
                {/* eslint-disable-next-line @next/next/no-img-element -- static SVG icon, no benefit from next/image optimization */}
                <img src="/icons/lfg-avatar-more.svg" alt="" className="size-3" />
              </div>
            )}
          </div>
          <div className="flex flex-col gap-0.5">
            <p className="text-[11px] text-white/50">
              Led by{" "}
              {leaderProfile ? (
                <Link
                  href={`/profile/${leaderProfile.slug}`}
                  onClick={(event) => event.stopPropagation()}
                  className="text-white hover:text-brand hover:underline"
                >
                  {team.leaderName}
                </Link>
              ) : (
                <span className="text-white">{team.leaderName}</span>
              )}
            </p>
            <div className="flex items-center gap-1">
              {/* eslint-disable-next-line @next/next/no-img-element -- static badge icon, no benefit from next/image optimization */}
              <img src={team.rank.icon} alt="" className="h-3.5 w-3.5" />
              <span className={`text-[11px] font-bold ${team.rank.colorClass}`}>
                {team.rank.name}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="w-[72px] text-[9px] font-medium uppercase tracking-wider text-white/70">
              Looking for:
            </span>
            <div className="flex items-center gap-1.5">
              {team.lookingFor.map((role) => (
                <div
                  key={role.name}
                  title={role.name}
                  className="flex size-6 items-center justify-center rounded-md border border-brand/30 bg-brand/10"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- static SVG icon, no benefit from next/image optimization */}
                  <img src={role.icon} alt={role.name} className="size-2.5" />
                </div>
              ))}
            </div>
          </div>
          <button
            type="button"
            onClick={onOpenDetails}
            className="flex h-6 w-[64px] items-center justify-center rounded-md bg-[#272c33] text-xs font-bold text-white transition-opacity hover:opacity-90"
          >
            Join
          </button>
        </div>
      </div>
    </div>
  );
}
