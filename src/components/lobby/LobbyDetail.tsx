"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CURRENT_PLAYER_ID,
  currentPlayerMember,
  type Lobby,
  type LobbyViewerRole,
} from "@/data/lfg-lobby";
import type { LfgCandidate } from "@/data/lfg-candidates";
import LobbyHeader from "./LobbyHeader";
import LobbyMembers from "./LobbyMembers";
import LobbyApplications from "./LobbyApplications";
import LobbyChat from "./LobbyChat";
import RatingModal, { type LobbyReview } from "./RatingModal";
import InvitePlayersModal from "./InvitePlayersModal";
import type { ReportSubmission } from "@/data/lfg-lobby";
import { useNotifications } from "@/contexts/NotificationContext";
import BackLink from "@/components/BackLink";
import {
  chatHref,
  useLobbySession,
  withPlayerMessage,
} from "@/lib/lobby-session";

/** How long the "lobby ended" notice stays before sending you back. */
const RETURN_SECONDS = 8;

interface LobbyDetailProps {
  lobby: Lobby;
  /** Worked out from the data by the page — see `viewerRoleIn`. */
  initialRole: LobbyViewerRole;
}

/**
 * Holds all lobby state client-side while there's no backend. Every mutation
 * below (accept, remove, invite, send, start, end) is where an API call will
 * go — the component tree above it shouldn't need to change.
 */
export default function LobbyDetail({ lobby, initialRole }: LobbyDetailProps) {
  const router = useRouter();
  const { toast, notify } = useNotifications();

  // Status, chat and an accepted invite are shared with the lobby's chat
  // page, so they live in the lobby session store rather than local state.
  const { session, update } = useLobbySession(lobby);
  const { status, messages, chatClosed } = session;
  // Starts from the data; only changes when an invited player accepts.
  const role: LobbyViewerRole = session.roleOverride ?? initialRole;

  const [baseMembers, setMembers] = useState(lobby.members);
  // An accepted invite is stored in the session, so after a reload (or
  // coming back from the chat page) you're still on the roster.
  const joinedViaInvite =
    initialRole === "invited" && session.roleOverride === "member";
  const members = useMemo(
    () =>
      joinedViaInvite &&
      !baseMembers.some((member) => member.id === CURRENT_PLAYER_ID)
        ? [...baseMembers, currentPlayerMember]
        : baseMembers,
    [baseMembers, joinedViaInvite]
  );
  const [applications, setApplications] = useState(lobby.applications);
  const [invites, setInvites] = useState<LfgCandidate[]>([]);
  const [isInviting, setIsInviting] = useState(false);
  const [isRating, setIsRating] = useState(false);
  const [ratingOutcome, setRatingOutcome] = useState<
    { rated: true; reportCount: number } | { rated: false } | null
  >(null);
  const [returnIn, setReturnIn] = useState<number | null>(null);

  const isInvited = role === "invited";
  const isLeader = role === "leader";
  const lobbiesHref = `/lfg/${lobby.game}`;
  const isFull = members.length >= lobby.slotsTotal;
  const openSlots = Math.max(lobby.slotsTotal - members.length, 0);

  const teammates = useMemo(
    () => members.filter((m) => m.id !== CURRENT_PLAYER_ID),
    [members]
  );

  // Countdown back to the lobby list once the lobby is over and rating is
  // done (or skipped). Cancellable, so nobody gets yanked away mid-read.
  useEffect(() => {
    if (returnIn === null) return;
    if (returnIn <= 0) {
      router.push(lobbiesHref);
      return;
    }
    const timer = setTimeout(() => setReturnIn(returnIn - 1), 1000);
    return () => clearTimeout(timer);
  }, [returnIn, router, lobbiesHref]);

  function addSystemMessage(body: string) {
    update((prev) => ({
      ...prev,
      messages: [
        ...prev.messages,
        {
          id: `sys-${Date.now()}`,
          authorId: "system",
          authorName: "System",
          body,
          sentAt: "now",
          isSystem: true,
        },
      ],
    }));
  }

  function handleAccept(id: string) {
    const app = applications.find((a) => a.id === id);
    if (!app || isFull) return;

    setApplications((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: "accepted" } : a))
    );
    setMembers((prev) => [
      ...prev,
      {
        id: `m-${app.id}`,
        name: app.applicantName,
        avatar: app.avatar,
        rank: app.rank,
        role: app.role,
        isLeader: false,
        micOn: true,
        reputation: app.reputation,
      },
    ]);
    addSystemMessage(`${app.applicantName} joined the lobby`);
    notify({
      kind: "application_accepted",
      tone: "success",
      title: `${app.applicantName} joined your lobby`,
      body: `${app.role.name} · ${app.rank.name}`,
      actorName: app.applicantName,
      actorAvatar: app.avatar,
      href: `/lfg/${lobby.game}/lobby/${lobby.id}`,
    });
  }

  function handleReject(id: string) {
    setApplications((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: "rejected" } : a))
    );
  }

  function handleRemove(memberId: string) {
    const member = members.find((m) => m.id === memberId);
    setMembers((prev) => prev.filter((m) => m.id !== memberId));
    if (member) addSystemMessage(`${member.name} was removed from the lobby`);
  }

  function handleInvite(candidate: LfgCandidate) {
    // TODO: POST an invite row; the invitee gets a lobby_invite notification.
    // No toast — the button flips to "Invited" and the roster shows the
    // pending slot, so the result is already on screen.
    setInvites((prev) => [...prev, candidate]);
  }

  function handleCancelInvite(candidateId: string) {
    setInvites((prev) => prev.filter((invite) => invite.id !== candidateId));
  }

  function handleSend(body: string) {
    update((prev) => withPlayerMessage(prev, body));
  }

  function handleStart() {
    update((prev) => ({ ...prev, status: "live" }));
    addSystemMessage("Lobby started — good luck!");
    toast({
      tone: "success",
      title: "Lobby is live",
      body: "Everyone in the lobby has been notified.",
    });
  }

  function handleEnd() {
    // Ending the lobby closes its chat and clears the messages for everyone.
    // TODO (backend): archive a moderator-only copy first (see lobby-session).
    update((prev) => ({
      ...prev,
      status: "completed",
      chatClosed: true,
      messages: [],
    }));
    setInvites([]);
    if (teammates.length > 0) setIsRating(true);
    else setReturnIn(RETURN_SECONDS);
  }

  function handleLeave() {
    toast({ tone: "info", title: "You left the lobby" });
    router.push(lobbiesHref);
  }

  function handleAcceptInvite() {
    // TODO: PATCH the invite row to accepted, then add the member server-side.
    update((prev) => ({ ...prev, roleOverride: "member" }));
    addSystemMessage(`${currentPlayerMember.name} joined the lobby`);
    toast({
      tone: "success",
      title: "Invitation accepted",
      body: `You're now in ${lobby.name}.`,
    });
  }

  function handleDeclineInvite() {
    // TODO: PATCH the invite row to declined.
    toast({ tone: "info", title: "Invitation declined" });
    router.push(lobbiesHref);
  }

  function handleRatingComplete(
    reviews: LobbyReview[],
    reports: ReportSubmission[]
  ) {
    // TODO: POST reviews (recalculating each target's reputation) and open a
    // moderation ticket per report. They go to separate tables.
    void reviews;
    setIsRating(false);
    setRatingOutcome({ rated: true, reportCount: reports.length });
    setReturnIn(RETURN_SECONDS);
  }

  function handleRatingClosed() {
    setIsRating(false);
    // Skipping rating still ends here — they can rate later from history.
    if (status === "completed") {
      setRatingOutcome({ rated: false });
      setReturnIn(RETURN_SECONDS);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <BackLink label="Back to lobbies" href={lobbiesHref} />

      <LobbyHeader
        lobby={lobby}
        role={role}
        status={status}
        onStart={handleStart}
        onEnd={handleEnd}
        onLeave={handleLeave}
      />

      {ratingOutcome && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-success/30 bg-success/10 px-4 py-3">
          <p className="text-xs leading-relaxed text-success">
            {ratingOutcome.rated ? (
              <>
                Thanks — your reviews were saved and your teammates&apos;
                reputation scores have been updated.
                {ratingOutcome.reportCount > 0 &&
                  ` ${ratingOutcome.reportCount} report${ratingOutcome.reportCount === 1 ? " was" : "s were"} sent to a moderator for review.`}
              </>
            ) : (
              <>
                Lobby ended. You can still rate your teammates later from
                your match history.
              </>
            )}
            {returnIn !== null && (
              <span className="text-success/80">
                {" "}
                Taking you back to lobbies in {returnIn}s.
              </span>
            )}
          </p>
          <div className="flex shrink-0 items-center gap-2">
            {returnIn !== null && (
              <button
                type="button"
                onClick={() => setReturnIn(null)}
                className="h-8 rounded-lg px-3 text-xs font-semibold text-success/80 transition-colors hover:text-success"
              >
                Stay here
              </button>
            )}
            <Link
              href={lobbiesHref}
              className="flex h-8 items-center rounded-lg bg-success/15 px-3 text-xs font-bold text-success transition-colors hover:bg-success/25"
            >
              Back to lobbies
            </Link>
          </div>
        </div>
      )}

      {isInvited && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-brand/30 bg-brand/[0.07] px-4 py-3">
          <div className="flex flex-col gap-0.5">
            <p className="text-xs font-bold text-white">
              {members.find((m) => m.isLeader)?.name ?? "The leader"} invited
              you to this lobby
            </p>
            <p className="text-[11px] text-text-muted">
              Accept to join the roster and unlock lobby chat.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={handleAcceptInvite}
              className="flex h-9 items-center justify-center gap-2 rounded-lg bg-brand px-4 text-xs font-bold text-white transition-opacity hover:opacity-90"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- static SVG icon, no benefit from next/image optimization */}
              <img src="/icons/action-accept.svg" alt="" className="size-3" />
              Accept invitation
            </button>
            <button
              type="button"
              onClick={handleDeclineInvite}
              className="flex h-9 items-center justify-center gap-2 rounded-lg border border-border-strong px-4 text-xs font-semibold text-text-muted transition-colors hover:border-danger hover:text-danger"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- static SVG icon, no benefit from next/image optimization */}
              <img src="/icons/action-decline.svg" alt="" className="size-3" />
              Decline
            </button>
          </div>
        </div>
      )}

      <div className="grid items-start gap-4 lg:grid-cols-[1fr_380px]">
        <div className="flex flex-col gap-4">
          <LobbyMembers
            members={members}
            slotsTotal={lobby.slotsTotal}
            currentUserId={CURRENT_PLAYER_ID}
            canManage={isLeader && status !== "completed"}
            onRemove={handleRemove}
            pendingInvites={invites}
            onCancelInvite={isLeader ? handleCancelInvite : undefined}
            onInvite={
              isLeader && status !== "completed"
                ? () => setIsInviting(true)
                : undefined
            }
          />

          {isLeader ? (
            <LobbyApplications
              applications={applications}
              onAccept={handleAccept}
              onReject={handleReject}
              isFull={isFull}
            />
          ) : (
            <section className="flex flex-col gap-2 rounded-2xl border border-border-strong bg-bg-card-alt p-5">
              <h2 className="text-[11px] font-bold uppercase tracking-widest text-text-muted">
                Looking for
              </h2>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {lobby.lookingFor.map((wanted) => (
                  <span
                    key={wanted.name}
                    className="flex items-center gap-2 rounded-lg border border-brand/30 bg-brand/10 px-3 py-1.5 text-[11px] font-semibold text-brand"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element -- static SVG icon, no benefit from next/image optimization */}
                    <img src={wanted.icon} alt="" className="size-3" />
                    {wanted.name}
                  </span>
                ))}
              </div>
              <p className="pt-1 text-[11px] text-text-muted">
                Only the lobby leader can accept or invite new members.
              </p>
            </section>
          )}
        </div>

        <LobbyChat
          messages={messages}
          currentUserId={CURRENT_PLAYER_ID}
          disabled={status === "completed" || isInvited}
          disabledLabel={
            isInvited
              ? "Accept the invitation to join the chat"
              : "This lobby has ended"
          }
          closed={chatClosed}
          onSend={handleSend}
          expandHref={chatHref(lobby)}
        />
      </div>

      {isInviting && (
        <InvitePlayersModal
          lobby={lobby}
          members={members}
          invitedIds={invites.map((invite) => invite.id)}
          applicantNames={applications
            .filter((a) => a.status === "pending")
            .map((a) => a.applicantName)}
          openSlots={openSlots}
          onInvite={handleInvite}
          onClose={() => setIsInviting(false)}
        />
      )}

      {isRating && (
        <RatingModal
          teammates={teammates}
          lobbyName={lobby.name}
          game={lobby.game}
          onClose={handleRatingClosed}
          onComplete={handleRatingComplete}
        />
      )}
    </div>
  );
}
