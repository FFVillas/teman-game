"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { LfgTeam } from "@/data/lfg-teams";
import { findProfileByUsername } from "@/data/player-profiles";
import { modeStyles } from "./LfgTeamCard";
import RankRangeBadge from "./RankRangeBadge";
import PlayerAvatar from "./PlayerAvatar";
import { useNotifications } from "@/contexts/NotificationContext";
import { roleIconFor } from "@/data/role-icons";
import { useAuth } from "@/contexts/AuthContext";
import { createClient } from "@/lib/supabase/client";
import { applyToLobby } from "@/lib/lobbies";
import { withNext } from "@/lib/auth-redirect";
import type { GameInfo } from "@/lib/games";
import {
  OPEN_BOUNDS,
  boundsFromTierRange,
  describeBounds,
  lobbyJoinBounds,
  ordinalFits,
  partyRuleFor,
  tiersOf,
} from "@/lib/ranks";

const viewerStateCopy: Record<
  NonNullable<LfgTeam["viewerState"]>,
  { title: string; body: string }
> = {
  leader: {
    title: "This is your lobby",
    body: "You lead this lobby, so there is nothing to apply for. Open it to manage applications and players.",
  },
  member: {
    title: "You're in this lobby",
    body: "You are on the roster. Open the lobby to see who you're playing with.",
  },
  pending: {
    title: "Application sent",
    body: "The leader hasn't answered yet. You can withdraw it from the lobby page.",
  },
  declined: {
    title: "Application declined",
    body: "The leader declined your application to this lobby.",
  },
};

/** Shown instead of the apply form when the viewer already has a place here. */
function ViewerStatePanel({ team }: { team: LfgTeam }) {
  if (!team.viewerState) return null;
  const copy = viewerStateCopy[team.viewerState];
  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-bg-card-alt p-4">
      <h2 className="text-sm font-bold text-white">{copy.title}</h2>
      <p className="text-xs leading-relaxed text-text-muted">{copy.body}</p>
      <Link
        href={`/lfg/${team.game}/lobby/${team.id}`}
        className="flex h-11 items-center justify-center rounded-xl bg-brand text-[13px] font-bold text-white transition-opacity hover:opacity-90"
      >
        {team.viewerState === "leader" ? "Manage lobby" : "Open lobby"}
      </Link>
    </section>
  );
}

interface RequestToJoinModalProps {
  team: LfgTeam;
  onClose: () => void;
  /** The game's ranks, to check whether the viewer's rank fits. */
  game?: GameInfo;
  /** The signed-in viewer's rank in this game, e.g. "Gold 2"; "" if unknown. */
  myRank?: string;
}

export default function RequestToJoinModal({
  team,
  onClose,
  game,
  myRank,
}: RequestToJoinModalProps) {
  // Only games that define roles ask for one (Valorant, League, Mobile
  // Legends); the roles are the database's, not a fixed list.
  const roles = game?.roles ?? [];
  const [selectedRole, setSelectedRole] = useState(
    team.lookingFor[0]?.name ?? roles[0]?.name ?? ""
  );
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const { toast } = useNotifications();
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  const mode = modeStyles[team.mode];
  const leaderAvatar = team.members[0]?.avatar;
  const emptySlots = Math.max(team.slotsTotal - team.members.length, 0);
  // Real lobbies link to the leader's real profile; mock ones only when a mock
  // profile exists.
  const leaderSlug = team.leaderId
    ? team.leaderName
    : findProfileByUsername(team.leaderName)?.slug;

  // The card only shows the range the leader typed. Whether *you* can join
  // right now is checked here, where it matters: the game's party rule applied
  // to who is already in, plus that range (see lib/ranks.ts). Real lobbies
  // carry everyone's rank; mock ones only know the leader's.
  const tiers = useMemo(() => tiersOf(game?.ranks ?? []), [game]);
  const viewerOrdinal =
    game?.ranks.find((rank) => rank.name === myRank)?.ordinal ?? null;
  const leaderTier = tiers.find((tier) => tier.name === team.rank.name);
  const lobbyMode = game?.modes.find((candidate) =>
    team.modeValue
      ? candidate.value === team.modeValue
      : candidate.kind === team.mode
  );
  const joinBounds = lobbyJoinBounds(
    partyRuleFor(lobbyMode, team.slotsTotal, game?.ranks ?? []),
    tiers,
    team.memberOrdinals ?? (leaderTier ? [leaderTier.firstOrdinal] : []),
    team.rankRange ? boundsFromTierRange(tiers, team.rankRange) : OPEN_BOUNDS
  );
  // Unranked or signed-out viewers always pass: the game decides at queue time.
  const rankFits = ordinalFits(viewerOrdinal, joinBounds);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!rankFits || sending) return;

    // Mock lobbies (the ones in src/data) have nothing to apply to.
    if (team.leaderId) {
      if (!user) {
        setSendError("Log in to apply to a lobby.");
        return;
      }
      const roleId = roles.find((role) => role.name === selectedRole)?.id ?? null;
      setSending(true);
      setSendError(null);
      const failure = await applyToLobby(createClient(), team.id, roleId, message);
      setSending(false);
      if (failure) {
        setSendError(failure);
        return;
      }
      router.refresh();
    }

    toast({
      tone: "success",
      title: "Request sent",
      body: `${team.leaderName} will get back to you. You'll be notified either way.`,
    });
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Request to join ${team.name}`}
        className="max-h-[95vh] w-full max-w-[750px] overflow-y-auto"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="mb-3 flex items-center gap-1.5 text-xs font-medium text-text-muted transition-colors hover:text-white"
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- static SVG icon, no benefit from next/image optimization */}
          <img src="/icons/lfg-back-arrow.svg" alt="" className="size-3.5" />
          Back to lobbies
        </button>

        <div className="rounded-2xl border-2 border-white/15 bg-bg-card-alt p-5 sm:p-6 lg:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-stretch">
            <div className="flex flex-1 flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <h1 className="text-lg font-extrabold text-white sm:text-xl">
                  {team.viewerState ? team.name : "Request To Join"}
                </h1>
                {!team.viewerState && (
                  <p className="text-[11px] text-text-muted sm:text-xs">
                    Introduce yourself to the team leader and select your
                    preferred role for this session.
                  </p>
                )}
              </div>

              {team.viewerState ? (
                <ViewerStatePanel team={team} />
              ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <section className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-bg-card-alt p-4">
                  <h2 className="text-[11px] font-bold uppercase tracking-widest text-text-muted">
                    Objectives &amp; Vibes
                  </h2>
                  <p className="text-xs text-white">
                    {team.bio ??
                      `${team.name} is looking for dedicated teammates to climb the ranks together. Come ready to communicate and have fun.`}
                  </p>
                </section>

                {roles.length > 0 && (
                <section className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-bg-card-alt p-4">
                  <h2 className="text-[11px] font-bold uppercase tracking-widest text-text-muted">
                    Select Your Role
                  </h2>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {roles.map((role) => {
                      const isSelected = role.name === selectedRole;
                      const roleIcon = roleIconFor(team.game, role.name);
                      return (
                        <button
                          key={role.id}
                          type="button"
                          onClick={() => setSelectedRole(role.name)}
                          aria-pressed={isSelected}
                          className={`flex flex-col items-center justify-center gap-1 rounded-xl border-2 p-2.5 transition-colors ${
                            isSelected
                              ? "border-brand bg-brand/10 text-white"
                              : "border-white/10 bg-bg-page text-text-muted opacity-60 hover:opacity-100"
                          }`}
                        >
                          {roleIcon && (
                            // eslint-disable-next-line @next/next/no-img-element -- static icon, no benefit from next/image optimization
                            <img src={roleIcon} alt="" className="size-4" />
                          )}
                          <span className="text-[11px] font-bold">
                            {role.name}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </section>
                )}

                <section className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-bg-card-alt p-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-[11px] font-bold uppercase tracking-widest text-text-muted">
                      Message to the leader
                    </h2>
                    <span className="text-[10px] italic text-text-muted/50">
                      Optional
                    </span>
                  </div>
                  <textarea
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                    placeholder={
                      selectedRole
                        ? `Hi! I'm an experienced ${selectedRole} looking for a competitive team...`
                        : "Hi! I'd love to team up. Tell the leader a bit about how you play..."
                    }
                    rows={2}
                    className="w-full resize-none rounded-lg border border-white/10 bg-bg-page p-3 text-xs text-white placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-brand"
                  />
                </section>

                {!rankFits && (
                  <p
                    role="alert"
                    className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-xs leading-relaxed text-danger"
                  >
                    Your rank ({myRank}) doesn&apos;t fit this lobby right now.
                    It currently accepts{" "}
                    <span className="font-semibold">
                      {describeBounds(tiers, joinBounds)}
                    </span>
                    .
                  </p>
                )}

                {sendError && (
                  <p
                    role="alert"
                    className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-xs leading-relaxed text-danger"
                  >
                    {sendError}{" "}
                    {!user && (
                      <Link
                        href={withNext("/login", pathname)}
                        className="font-semibold underline"
                      >
                        Log in
                      </Link>
                    )}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={!rankFits || sending}
                  className="flex h-11 items-center justify-center gap-2 rounded-xl bg-brand text-[13px] font-bold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- static SVG icon, no benefit from next/image optimization */}
                  <img
                    src="/icons/lfg-search-btn.svg"
                    alt=""
                    className="size-3.5"
                  />
                  {sending ? "Sending…" : "Apply To Join"}
                </button>
              </form>
              )}
            </div>

            <aside className="flex w-full flex-col gap-3 lg:w-[260px]">
              <div className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-white/10 bg-bg-card-alt">
                <div className="relative min-h-[140px] w-full flex-1">
                  <Image
                    src={team.cover}
                    alt={team.name}
                    fill
                    sizes="260px"
                    className="object-cover object-top opacity-60"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-bg-card-alt to-transparent" />
                  <span
                    className={`absolute left-3 top-3 inline-flex w-fit items-center rounded-full border px-3 py-1 text-[9px] font-semibold uppercase tracking-wide ${mode.className}`}
                  >
                    {mode.label}
                  </span>
                </div>

                <div className="flex flex-col gap-3 p-4">
                  <div className="flex flex-col gap-0.5">
                    <h3 className="text-base font-bold text-white">
                      {team.name}
                    </h3>
                    <div className="flex items-center gap-1.5 text-[11px] text-text-muted">
                      {/* eslint-disable-next-line @next/next/no-img-element -- static SVG icon, no benefit from next/image optimization */}
                      <img
                        src="/icons/lfg-region.svg"
                        alt=""
                        className="size-3"
                      />
                      {team.region}
                      {team.languages && <> • {team.languages}</>}
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <h4 className="text-[9px] font-bold uppercase tracking-wide text-text-muted">
                      Lobby Leader
                    </h4>
                    <div className="flex items-center gap-2">
                      {leaderSlug ? (
                        <Link href={`/profile/${leaderSlug}`}>
                          <PlayerAvatar
                            src={leaderAvatar}
                            name={team.leaderName}
                            className="size-8 border border-brand transition-opacity hover:opacity-80"
                          />
                        </Link>
                      ) : (
                        <PlayerAvatar
                          src={leaderAvatar}
                          name={team.leaderName}
                          className="size-8 border border-brand"
                        />
                      )}
                      <div className="flex flex-col">
                        {leaderSlug ? (
                          <Link
                            href={`/profile/${leaderSlug}`}
                            className="text-xs font-bold text-white hover:text-brand hover:underline"
                          >
                            {team.leaderName}
                          </Link>
                        ) : (
                          <span className="text-xs font-bold text-white">
                            {team.leaderName}
                          </span>
                        )}
                        <div className="flex items-center gap-1">
                          {team.rank.icon && (
                            // eslint-disable-next-line @next/next/no-img-element -- static badge icon, no benefit from next/image optimization
                            <img
                              src={team.rank.icon}
                              alt=""
                              className="size-3"
                            />
                          )}
                          <span
                            className={`text-[9px] font-bold ${team.rank.colorClass}`}
                          >
                            {team.rank.name}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <h4 className="text-[9px] font-bold uppercase tracking-wide text-text-muted">
                        Current Members
                      </h4>
                      <span className="text-[11px] font-bold text-white">
                        {team.slotsFilled}/{team.slotsTotal}
                      </span>
                    </div>
                    <div className="flex items-center">
                      {team.members.map((member) => (
                        <PlayerAvatar
                          key={member.id}
                          src={member.avatar}
                          name={member.name}
                          className="-ml-2 size-7 border-2 border-bg-card-alt first:ml-0"
                        />
                      ))}
                      {Array.from({ length: emptySlots }).map((_, index) => (
                        <div
                          key={index}
                          className="-ml-2 flex size-7 items-center justify-center rounded-full border-2 border-bg-card-alt bg-[#272c33]"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element -- static SVG icon, no benefit from next/image optimization */}
                          <img
                            src="/icons/lfg-avatar-more.svg"
                            alt=""
                            className="size-2.5"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5 border-t border-white/5 pt-3">
                    <h4 className="text-[9px] font-bold uppercase tracking-wide text-text-muted">
                      Lobby Requirements
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {team.micRequired && (
                        <span className="flex items-center gap-1 rounded-full bg-[#10b981]/10 px-2 py-0.5 text-[9px] font-semibold text-[#10b981]">
                          {/* eslint-disable-next-line @next/next/no-img-element -- static SVG icon, no benefit from next/image optimization */}
                          <img
                            src="/icons/lfg-mic.svg"
                            alt=""
                            className="h-2 w-1.5"
                          />
                          Mic Required
                        </span>
                      )}
                      <span className="rounded-full bg-brand/10 px-2 py-0.5">
                        <RankRangeBadge
                          range={team.rankRange}
                          ranks={game?.ranks}
                          gameSlug={team.game}
                          size="sm"
                        />
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-dashed border-white/10 p-3 text-center text-[10px] leading-[15px] text-text-muted">
                Lobby leaders usually respond within 5-10 minutes. You will
                receive a notification if your request is accepted.
              </div>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}
