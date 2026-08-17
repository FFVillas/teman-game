"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Lobby, LobbyStatus, LobbyViewerRole } from "@/data/lfg-lobby";
import LobbyHeader from "./LobbyHeader";
import LobbyMembers from "./LobbyMembers";
import LobbyApplications from "./LobbyApplications";
import LobbyChat from "./LobbyChat";
import RatingModal, { type LobbyReview } from "./RatingModal";
import RoleSwitcher from "./RoleSwitcher";
import type { ReportSubmission } from "@/data/lfg-lobby";

/**
 * Holds all lobby state client-side while there's no backend. Every mutation
 * below (accept, remove, send, start, end) is where an API call will go —
 * the component tree above it shouldn't need to change.
 */
export default function LobbyDetail({ lobby }: { lobby: Lobby }) {
  const router = useRouter();

  // Role comes from the data (you lead the lobby you created). Until auth
  // exists there's no signed-in user, so this stays switchable for demos.
  const [role, setRole] = useState<LobbyViewerRole>("leader");

  const [status, setStatus] = useState<LobbyStatus>(lobby.status);
  const [members, setMembers] = useState(lobby.members);
  const [applications, setApplications] = useState(lobby.applications);
  const [messages, setMessages] = useState(lobby.messages);
  const [isRating, setIsRating] = useState(false);
  const [ratingDone, setRatingDone] = useState(false);
  const [reportCount, setReportCount] = useState(0);

  const currentUserId = role === "leader" ? lobby.leaderId : "u-2";
  const isFull = members.length >= lobby.slotsTotal;

  const teammates = useMemo(
    () => members.filter((m) => m.id !== currentUserId),
    [members, currentUserId]
  );

  function addSystemMessage(body: string) {
    setMessages((prev) => [
      ...prev,
      {
        id: `sys-${Date.now()}`,
        authorId: "system",
        authorName: "System",
        body,
        sentAt: "now",
        isSystem: true,
      },
    ]);
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

  function handleSend(body: string) {
    const me = members.find((m) => m.id === currentUserId);
    setMessages((prev) => [
      ...prev,
      {
        id: `msg-${Date.now()}`,
        authorId: currentUserId,
        authorName: me?.name ?? "You",
        avatar: me?.avatar,
        body,
        sentAt: "now",
      },
    ]);
  }

  function handleStart() {
    setStatus("live");
    addSystemMessage("Lobby started — good luck!");
  }

  function handleEnd() {
    setStatus("completed");
    addSystemMessage("Lobby ended by the leader");
    if (teammates.length > 0) setIsRating(true);
  }

  function handleLeave() {
    router.push(`/lfg/${lobby.game}`);
  }

  function handleRatingComplete(
    reviews: LobbyReview[],
    reports: ReportSubmission[]
  ) {
    // TODO: POST reviews (recalculating each target's reputation) and open a
    // moderation ticket per report. They go to separate tables.
    void reviews;
    setReportCount(reports.length);
    setIsRating(false);
    setRatingDone(true);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href={`/lfg/${lobby.game}`}
          className="flex w-fit items-center gap-2 text-sm font-medium text-text-muted transition-colors hover:text-white"
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- static SVG icon, no benefit from next/image optimization */}
          <img src="/icons/lfg-back-arrow.svg" alt="" className="size-4" />
          Back to lobbies
        </Link>

        <RoleSwitcher role={role} onChange={setRole} />
      </div>

      <LobbyHeader
        lobby={lobby}
        role={role}
        status={status}
        onStart={handleStart}
        onEnd={handleEnd}
        onLeave={handleLeave}
      />

      {ratingDone && (
        <p className="rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-xs text-success">
          Thanks — your reviews were saved and your teammates&apos; reputation
          scores have been updated.
          {reportCount > 0 &&
            ` ${reportCount} report${reportCount === 1 ? " was" : "s were"} sent to a moderator for review.`}
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-[1fr_400px]">
        <div className="flex flex-col gap-4">
          <LobbyMembers
            members={members}
            slotsTotal={lobby.slotsTotal}
            currentUserId={currentUserId}
            canManage={role === "leader" && status !== "completed"}
            onRemove={handleRemove}
          />

          {role === "leader" ? (
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
                Only the lobby leader can accept new members.
              </p>
            </section>
          )}
        </div>

        <LobbyChat
          messages={messages}
          currentUserId={currentUserId}
          disabled={status === "completed"}
          onSend={handleSend}
        />
      </div>

      {isRating && (
        <RatingModal
          teammates={teammates}
          lobbyName={lobby.name}
          game={lobby.game}
          onClose={() => setIsRating(false)}
          onComplete={handleRatingComplete}
        />
      )}
    </div>
  );
}
