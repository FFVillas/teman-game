"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import BackLink from "@/components/BackLink";
import RankRangeBadge from "@/components/lfg/RankRangeBadge";
import RequestToJoinModal from "@/components/lfg/RequestToJoinModal";
import { useNotifications } from "@/contexts/NotificationContext";
import type {
  LobbyApplication,
  LobbyMember,
  LobbyViewerRole,
} from "@/data/lfg-lobby";
import { roleIconFor } from "@/data/role-icons";
import type { GameInfo } from "@/lib/games";
import {
  cancelInvite,
  closeLobby,
  leaveLobby,
  removeMember,
  reopenLobby,
  respondToApplication,
  respondToInvite,
  startLobby,
  type LobbyDetailData,
  type LobbyPerson,
} from "@/lib/lobbies";
import { withNext } from "@/lib/auth-redirect";
import { createClient } from "@/lib/supabase/client";
import LobbyApplications from "./LobbyApplications";
import RealLobbyChat from "./RealLobbyChat";
import LobbyHeader from "./LobbyHeader";
import LobbyMembers from "./LobbyMembers";
import RealInvitePlayersModal from "./RealInvitePlayersModal";

/** "Oct 6, 9:12 PM" in UTC+7, the same clock the create form uses. */
function when(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Jakarta",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

/**
 * A lobby from the database, in the same layout as the mock lobby screen
 * (`LobbyDetail`): header, roster, join requests. The statuses line up like
 * this: recruiting (live in the database) is the screen's "Forming", started
 * is its "Live", an ended lobby is "Completed", a cancelled one "Closed".
 * Invitations are real: the leader picks players in `RealInvitePlayersModal`,
 * each pending one holds an open slot on the roster, and the invited player
 * answers here or from the bell. Left out because nothing real backs them yet:
 * ratings and microphone state. The chat on the right is real (see
 * RealLobbyChat).
 */
export default function RealLobbyDetail({
  data,
  game,
  viewerId,
  myRank,
}: {
  data: LobbyDetailData;
  game: GameInfo;
  viewerId: string | null;
  myRank: string;
}) {
  const { team, members: people, applications, voiceUrl, invites, myInvite } = data;
  const router = useRouter();
  const { toast } = useNotifications();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<"close" | "leave" | "remove" | null>(
    null,
  );
  const [removeTarget, setRemoveTarget] = useState<{ id: string; name: string } | null>(
    null,
  );
  const [applying, setApplying] = useState(false);
  const [inviting, setInviting] = useState(false);

  const state = team.viewerState;
  const isLeader = state === "leader";
  const closed = Boolean(team.closed);
  const completed = Boolean(team.completed);
  const started = Boolean(team.started);
  const over = closed || started;
  const isFull = people.length >= team.slotsTotal;
  // A pending invitation holds a slot, so the leader can't send more than fit.
  const invitesLeft = Math.max(team.slotsTotal - people.length - invites.length, 0);
  const lobbiesHref = `/lfg/${team.game}`;
  const status = completed
    ? "completed"
    : closed
      ? "closed"
      : started
        ? "live"
        : team.status.isLive
          ? "forming"
          : "scheduled";
  const role: LobbyViewerRole = isLeader
    ? "leader"
    : state === "member"
      ? "member"
      : "invited";

  const asMember = (person: LobbyPerson): LobbyMember => ({
    id: person.id,
    name: person.username,
    avatar: person.avatar,
    rank: { name: person.rankName, icon: person.rankIcon, colorClass: "text-white/90" },
    role: person.roleName
      ? { name: person.roleName, icon: roleIconFor(team.game, person.roleName) ?? "" }
      : null,
    isLeader: person.id === team.leaderId,
    reputation: person.reputation,
    profileSlug: person.username,
  });
  const members = people.map(asMember);

  const pending: LobbyApplication[] = applications
    .filter((entry) => entry.status === "pending")
    .map((entry) => ({
      id: entry.applicationId,
      status: "pending",
      applicantName: entry.username,
      avatar: entry.avatar,
      rank: { name: entry.rankName, icon: entry.rankIcon, colorClass: "text-white/90" },
      role: entry.roleName
        ? { name: entry.roleName, icon: roleIconFor(team.game, entry.roleName) ?? "" }
        : null,
      reputation: entry.reputation,
      profileSlug: entry.username,
      message: entry.message ?? undefined,
      appliedAgo: when(entry.createdAt),
    }));

  // The database only returns the viewer's own application to them.
  const myApplication =
    state === "pending" || state === "declined"
      ? applications.find((entry) => entry.id === viewerId)
      : undefined;

  async function run(action: () => Promise<string | null>, done?: () => void) {
    if (busy) return;
    setBusy(true);
    setError(null);
    const failure = await action();
    setBusy(false);
    setConfirming(null);
    if (failure) setError(failure);
    else done?.();
    // Refresh either way: after a failure the lobby may have changed under us
    // (someone else was accepted first).
    router.refresh();
  }

  // The roster and the lists update in place, so accepting, declining, leaving
  // and removing someone need no pop-up. Only what isn't visible on screen
  // gets one: starting and ending a lobby.
  const decide = (applicationId: string, accept: boolean) =>
    run(() => respondToApplication(createClient(), applicationId, accept));

  const answerInvite = (accept: boolean) => {
    if (myInvite) run(() => respondToInvite(createClient(), myInvite.id, accept));
  };

  const takeBackInvite = (inviteId: string) =>
    run(() => cancelInvite(createClient(), inviteId));

  function start() {
    run(
      () => startLobby(createClient(), team.id),
      () =>
        toast({
          tone: "success",
          title: "Lobby is live",
          body: "It no longer accepts new players.",
        }),
    );
  }

  const reopen = () => run(() => reopenLobby(createClient(), team.id));

  function confirmed() {
    if (confirming === "remove" && removeTarget) {
      run(
        () => removeMember(createClient(), team.id, removeTarget.id),
        () => setRemoveTarget(null),
      );
    } else if (confirming === "close") {
      run(
        () => closeLobby(createClient(), team.id),
        () =>
          toast({
            tone: "info",
            title: started ? "Lobby ended" : "Lobby closed",
            body: started
              ? "The chat is closed for everyone."
              : "It no longer accepts applications.",
          }),
      );
    } else if (confirming === "leave") {
      run(() => leaveLobby(createClient(), team.id));
    }
  }

  // Top right, for people who have no menu: apply, withdraw, log in.
  const topButton =
    "flex h-9 items-center justify-center rounded-lg px-4 text-xs font-bold transition-opacity";
  const topAction =
    isLeader || state === "member" || closed ? undefined : state === "pending" ? (
      <button
        type="button"
        onClick={() => setConfirming("leave")}
        className={`${topButton} border border-white/20 bg-[rgba(15,23,42,0.8)] text-white shadow-md shadow-black/50 backdrop-blur-sm hover:border-danger hover:text-danger`}
      >
        Withdraw application
      </button>
    ) : state === "declined" || started || myInvite ? null : !viewerId ? (
      <Link
        href={withNext("/login", `/lfg/${team.game}/lobby/${team.id}`)}
        className={`${topButton} bg-brand text-white hover:opacity-90`}
      >
        Log in to apply
      </Link>
    ) : isFull ? (
      <span className="rounded-lg border border-white/20 bg-[rgba(15,23,42,0.8)] px-3 py-2 text-xs text-text-subtle">
        This lobby is full
      </span>
    ) : (
      <button
        type="button"
        onClick={() => setApplying(true)}
        className={`${topButton} bg-brand text-white hover:opacity-90`}
      >
        Apply to join
      </button>
    );

  const editHref = `/lfg/${team.game}/lobby/${team.id}/edit`;
  const banner = "flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3";

  return (
    <div className="flex flex-col gap-4">
      <BackLink label="Back to lobbies" href={lobbiesHref} />

      <LobbyHeader
        lobby={{
          cover: team.cover,
          mode: team.mode,
          name: team.name,
          bio: team.bio,
          region: team.region,
          languages: team.languages,
          micRequired: Boolean(team.micRequired),
          game: team.game,
          scheduledFor: status === "scheduled" ? team.status.label : undefined,
          // Already filtered by the database to the leader and members.
          discordUrl: !closed ? (voiceUrl ?? undefined) : undefined,
        }}
        role={role}
        status={status}
        onStart={start}
        onReopen={reopen}
        onEnd={() => setConfirming("close")}
        onLeave={() => setConfirming("leave")}
        editHref={isLeader && !closed ? editHref : undefined}
        addVoiceHref={isLeader && !closed && !voiceUrl ? editHref : undefined}
        rankSlot={
          <RankRangeBadge range={team.rankRange} ranks={game.ranks} gameSlug={team.game} />
        }
        topAction={topAction}
      />

      {closed && (
        <div className={`${banner} border-border-default bg-bg-card-alt`}>
          <p className="text-xs text-text-muted">
            {completed
              ? "This lobby has ended."
              : "This lobby was closed before it started. It no longer accepts applications."}
          </p>
          <Link
            href={lobbiesHref}
            className="flex h-8 items-center rounded-lg border border-border-strong px-3 text-xs font-bold text-text-subtle transition-colors hover:text-white"
          >
            Back to lobbies
          </Link>
        </div>
      )}

      {started && (
        <div className={`${banner} border-border-default bg-bg-card-alt`}>
          <p className="text-xs text-text-muted">
            This lobby has started. It no longer accepts new players
            {isLeader && ", but you can reopen recruiting from the menu"}.
          </p>
        </div>
      )}

      {myInvite && !over && !isLeader && state !== "member" && (
        <div className={`${banner} border-brand/30 bg-brand/[0.07]`}>
          <div className="flex flex-col gap-0.5">
            <p className="text-xs font-bold text-white">
              {myInvite.inviterName} invited you to this lobby
            </p>
            <p className="text-[11px] text-text-muted">
              Sent {when(myInvite.createdAt)}.{" "}
              {isFull ? "The lobby is full right now." : "Accepting puts you on the roster."}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={busy || isFull}
              onClick={() => answerInvite(true)}
              className="flex h-9 items-center rounded-lg bg-brand px-4 text-xs font-bold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Accept
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => answerInvite(false)}
              className="flex h-9 items-center rounded-lg border border-border-strong px-4 text-xs font-semibold text-text-muted transition-colors hover:text-white disabled:opacity-50"
            >
              Decline
            </button>
          </div>
        </div>
      )}

      {myApplication && (
        <div className={`${banner} border-brand/30 bg-brand/[0.07]`}>
          <div className="flex flex-col gap-0.5">
            <p className="text-xs font-bold text-white">
              {myApplication.status === "pending"
                ? "Your application is waiting for the leader"
                : "The leader declined your application"}
            </p>
            <p className="text-[11px] text-text-muted">
              {myApplication.status === "pending"
                ? `Sent ${when(myApplication.createdAt)}. Refresh to see their answer.`
                : "You can still look around, but you can't apply to this lobby again."}
            </p>
          </div>
        </div>
      )}

      {confirming && (
        <div className={`${banner} border-danger/40 bg-danger/10`}>
          <p className="text-xs font-bold text-white">
            {confirming === "remove"
              ? `Remove ${removeTarget?.name ?? "this player"} from the lobby?`
              : confirming === "close"
                ? started
                  ? "End this lobby for everyone?"
                  : "Close this lobby for everyone?"
                : state === "member"
                    ? "Leave this lobby?"
                  : "Withdraw your application?"}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={confirmed}
              className="flex h-9 items-center rounded-lg bg-danger px-4 text-xs font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {busy ? "Working…" : "Yes"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setConfirming(null);
                setRemoveTarget(null);
              }}
              className="flex h-9 items-center rounded-lg border border-border-strong px-4 text-xs font-semibold text-text-muted transition-colors hover:text-white"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {error && (
        <p
          role="alert"
          className="rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-xs text-danger"
        >
          {error}
        </p>
      )}

      <div className="grid items-start gap-4 lg:grid-cols-[1fr_380px]">
        <div className="flex flex-col gap-4">
          <LobbyMembers
            members={members}
            slotsTotal={team.slotsTotal}
            currentUserId={viewerId ?? ""}
            canManage={isLeader && !closed}
            onRemove={(id) => {
              const member = members.find((entry) => entry.id === id);
              setRemoveTarget({ id, name: member?.name ?? "this player" });
              setConfirming("remove");
            }}
            pendingInvites={invites.map((invite) => ({
              id: invite.inviteId,
              name: invite.username,
              avatar: invite.avatar,
            }))}
            onCancelInvite={isLeader && !over ? takeBackInvite : undefined}
            onInvite={isLeader && !over ? () => setInviting(true) : undefined}
          />

          {isLeader ? (
            <LobbyApplications
              applications={pending}
              onAccept={(id) => decide(id, true)}
              onReject={(id) => decide(id, false)}
              isFull={isFull || over}
              busy={busy}
            />
          ) : (
            <section className="flex flex-col gap-2 rounded-2xl border border-border-strong bg-bg-card-alt p-5">
              <h2 className="text-[11px] font-bold uppercase tracking-widest text-text-muted">
                Looking for
              </h2>
              {team.lookingFor.length > 0 ? (
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {team.lookingFor.map((wanted) => (
                    <span
                      key={wanted.name}
                      className="flex items-center gap-2 rounded-lg border border-brand/30 bg-brand/10 px-3 py-1.5 text-[11px] font-semibold text-brand"
                    >
                      {wanted.icon && (
                        // eslint-disable-next-line @next/next/no-img-element -- static SVG icon, no benefit from next/image optimization
                        <img src={wanted.icon} alt="" className="size-3" />
                      )}
                      {wanted.name}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="pt-1 text-xs text-text-subtle">Any role</p>
              )}
              <p className="pt-1 text-[11px] text-text-muted">
                Only the lobby leader can accept or invite new members.
              </p>
            </section>
          )}
        </div>

        <RealLobbyChat
          lobbyId={team.id}
          viewerId={viewerId}
          canChat={(isLeader || state === "member") && !closed}
          closed={closed}
          expandHref={`/lfg/${team.game}/lobby/${team.id}/chat`}
          disabledLabel={
            state === "pending"
              ? "Chat opens once the leader accepts you"
              : "Join the lobby to chat"
          }
        />
      </div>

      {inviting && (
        <RealInvitePlayersModal
          team={team}
          game={game}
          excludeIds={[
            ...people.map((person) => person.id),
            ...invites.map((invite) => invite.id),
            ...applications
              .filter((entry) => entry.status === "pending")
              .map((entry) => entry.id),
          ]}
          invitesLeft={invitesLeft}
          onInvited={() => router.refresh()}
          onClose={() => setInviting(false)}
        />
      )}

      {applying && (
        <RequestToJoinModal
          team={team}
          game={game}
          myRank={myRank}
          onClose={() => setApplying(false)}
        />
      )}
    </div>
  );
}
