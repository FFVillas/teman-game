"use client";

import { useNotifications } from "@/contexts/NotificationContext";
import { useLobbyChat } from "@/lib/use-lobby-chat";
import LobbyChat from "./LobbyChat";

/**
 * A real lobby's chat: the shared `LobbyChat` panel fed by the database and
 * Realtime. The three places a chat appears (the lobby page, its own chat
 * page, and /messages) all use this, so they show the same conversation.
 *
 * `canChat` is whether the viewer may read and write (leader or accepted
 * member of an open lobby). Everyone else gets the disabled panel and no
 * socket. `closed` is a lobby that has ended: the chat is gone for players.
 */
export default function RealLobbyChat({
  lobbyId,
  viewerId,
  canChat,
  closed = false,
  variant = "panel",
  expandHref,
  disabledLabel = "Join the lobby to chat",
}: {
  lobbyId: string;
  viewerId: string | null;
  canChat: boolean;
  closed?: boolean;
  variant?: "panel" | "page" | "embedded";
  /** Panel only: where the expand button goes. */
  expandHref?: string;
  disabledLabel?: string;
}) {
  const { toast } = useNotifications();
  const { messages, send } = useLobbyChat({
    lobbyId,
    meId: viewerId,
    enabled: canChat && !closed,
  });

  return (
    <LobbyChat
      variant={variant}
      messages={messages}
      currentUserId={viewerId ?? ""}
      disabled={!canChat || closed}
      disabledLabel={disabledLabel}
      closed={closed}
      expandHref={canChat ? expandHref : undefined}
      onSend={async (body) => {
        const failure = await send(body);
        // The draft is already cleared by the time we know, so say so rather
        // than let it look sent.
        if (failure) {
          toast({ tone: "danger", title: "Message not sent", body: failure });
        }
      }}
    />
  );
}
