import Link from "next/link";
import Image from "next/image";
import { CURRENT_PLAYER_ID, type Lobby } from "@/data/lfg-lobby";
import { modeStyles } from "./LfgTeamCard";

function lobbyHref(lobby: Lobby) {
  return `/lfg/${lobby.game}/lobby/${lobby.id}`;
}

function ScheduledRow({ lobby }: { lobby: Lobby }) {
  const leads = lobby.leaderId === CURRENT_PLAYER_ID;
  return (
    <Link
      href={lobbyHref(lobby)}
      className="flex items-center gap-3 rounded-lg border border-border-default bg-bg-page px-3 py-2.5 transition-colors hover:border-border-strong"
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- static SVG icon, no benefit from next/image optimization */}
      <img src="/icons/status-dot-scheduled.svg" alt="" className="size-1.5" />
      <span className="flex-1 truncate text-xs font-bold text-white">
        {lobby.name}
      </span>
      <span className="shrink-0 rounded bg-white/5 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-text-muted">
        {leads ? "Leader" : "Member"}
      </span>
      <span className="shrink-0 text-[11px] text-text-muted">
        {lobby.scheduledFor}
      </span>
    </Link>
  );
}

function InviteRow({ lobby }: { lobby: Lobby }) {
  const leader = lobby.members.find((member) => member.isLeader);
  return (
    <Link
      href={lobbyHref(lobby)}
      className="flex items-center gap-3 rounded-lg border border-brand/30 bg-brand/[0.05] px-3 py-2.5 transition-colors hover:border-brand/60"
    >
      {leader && (
        // eslint-disable-next-line @next/next/no-img-element -- small avatar thumbnail, no benefit from next/image optimization
        <img src={leader.avatar} alt="" className="size-5 rounded-full object-cover" />
      )}
      <span className="min-w-0 flex-1 truncate text-xs text-text-subtle">
        <span className="font-bold text-white">{leader?.name}</span> invited
        you to <span className="font-bold text-white">{lobby.name}</span>
      </span>
      <span className="shrink-0 text-[11px] font-semibold text-brand">
        View invite
      </span>
    </Link>
  );
}

interface ActiveLobbyBannerProps {
  lobby: Lobby;
  scheduled?: Lobby[];
  /** Lobbies you've been invited to but haven't answered. */
  invites?: Lobby[];
}

export default function ActiveLobbyBanner({
  lobby,
  scheduled = [],
  invites = [],
}: ActiveLobbyBannerProps) {
  // Drives the crown and the "N requests" badge — only the leader sees those.
  const isLeader = lobby.leaderId === CURRENT_PLAYER_ID;
  const mode = modeStyles[lobby.mode];
  const pending = lobby.applications.filter((a) => a.status === "pending");
  const emptySlots = Math.max(lobby.slotsTotal - lobby.members.length, 0);

  return (
    // Deliberately low-contrast: this sits at the top of the page, so
    // position already gives it prominence — it doesn't need colour too.
    <section className="flex flex-col gap-3 rounded-2xl border border-border-subtle bg-bg-surface/40 p-4">
      <div className="flex items-center gap-2">
        <span className="relative flex size-2">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-60" />
          <span className="relative inline-flex size-2 rounded-full bg-success" />
        </span>
        <h2 className="text-xs font-bold uppercase tracking-wider text-white">
          Your lobby
        </h2>
        <span className="text-[11px] text-text-muted">
          You can only be in one live lobby at a time
        </span>
      </div>

      <Link
        href={lobbyHref(lobby)}
        className="flex flex-col overflow-hidden rounded-xl border border-border-default bg-bg-card-alt transition-colors hover:border-border-strong sm:flex-row sm:items-center"
      >
        <div className="relative h-24 w-full shrink-0 sm:h-[104px] sm:w-[150px]">
          <Image
            src={lobby.cover}
            alt=""
            fill
            sizes="150px"
            className="object-cover object-top"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-transparent from-40% to-bg-card-alt to-90%" />
          <span
            className={`absolute left-3 top-3 inline-flex w-fit items-center rounded-full border px-2.5 py-1 text-[9px] font-semibold uppercase tracking-wide ${mode.className}`}
          >
            {mode.label}
          </span>
        </div>

        <div className="flex flex-1 flex-wrap items-center gap-4 p-4">
          <div className="flex min-w-[180px] flex-1 flex-col gap-1.5">
            <h3 className="flex items-center gap-1.5 text-base font-bold tracking-tight text-white">
              {lobby.name}
              {isLeader && (
                // eslint-disable-next-line @next/next/no-img-element -- static SVG icon, no benefit from next/image optimization
                <img
                  src="/icons/lfg-crown.svg"
                  alt="You lead this lobby"
                  title="You lead this lobby"
                  className="size-3.5 shrink-0"
                />
              )}
            </h3>
            <div className="flex flex-wrap items-center gap-3 text-[11px] text-text-muted">
              <span className="flex items-center gap-1.5">
                {/* eslint-disable-next-line @next/next/no-img-element -- static SVG icon, no benefit from next/image optimization */}
                <img src="/icons/lfg-region.svg" alt="" className="size-3" />
                {lobby.region}
              </span>
              <span>
                {lobby.members.length}/{lobby.slotsTotal} players
              </span>
            </div>
          </div>

          <div className="flex items-center">
            {lobby.members.map((member) => (
              // eslint-disable-next-line @next/next/no-img-element -- small avatar thumbnails, no benefit from next/image optimization
              <img
                key={member.id}
                src={member.avatar}
                alt=""
                className="-ml-3 size-9 rounded-full border-2 border-bg-card-alt object-cover first:ml-0"
              />
            ))}
            {Array.from({ length: emptySlots }).map((_, index) => (
              <div
                key={index}
                className="-ml-3 flex size-9 items-center justify-center rounded-full border-2 border-bg-card-alt bg-[#272c33]"
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

          <div className="flex items-center gap-3">
            {isLeader && pending.length > 0 && (
              <span className="rounded-md bg-brand/15 px-2.5 py-1 text-[11px] font-bold text-brand">
                {pending.length} request{pending.length === 1 ? "" : "s"}
              </span>
            )}
            <span className="flex h-9 items-center justify-center rounded-lg bg-brand px-4 text-xs font-bold text-white">
              Open lobby
            </span>
          </div>
        </div>
      </Link>

      {invites.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
            Invitations
          </span>
          <div className="grid gap-2 sm:grid-cols-2">
            {invites.map((invite) => (
              <InviteRow key={invite.id} lobby={invite} />
            ))}
          </div>
        </div>
      )}

      {scheduled.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
            Scheduled
          </span>
          <div className="grid gap-2 sm:grid-cols-2">
            {scheduled.map((lobby) => (
              <ScheduledRow key={lobby.id} lobby={lobby} />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
