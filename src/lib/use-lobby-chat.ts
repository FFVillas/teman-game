"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { LobbyMessage } from "@/data/lfg-lobby";
import { createClient } from "@/lib/supabase/client";
import { useRealtimeInserts } from "@/lib/realtime";
import {
  fetchLobbyMessage,
  fetchLobbyMessages,
  sendLobbyMessage,
} from "@/lib/lobby-chat";

/**
 * One lobby's chat as live state: the messages, a way to send, and new rows
 * arriving over Supabase Realtime. `enabled` is false for anyone who can't
 * read the chat (the database would return nothing anyway), so those pages
 * don't open a socket for it.
 */
export function useLobbyChat({
  lobbyId,
  meId,
  enabled,
}: {
  lobbyId: string;
  meId: string | null;
  enabled: boolean;
}) {
  const [messages, setMessages] = useState<LobbyMessage[]>([]);
  const [loaded, setLoaded] = useState(false);
  const seen = useRef(new Set<string>());

  const append = useCallback((message: LobbyMessage) => {
    // The sender's own insert comes back both from the request and over
    // Realtime; the id check keeps it from showing twice.
    if (seen.current.has(message.id)) return;
    seen.current.add(message.id);
    setMessages((prev) => [...prev, message]);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    fetchLobbyMessages(createClient(), lobbyId).then((rows) => {
      if (cancelled) return;
      seen.current = new Set(rows.map((row) => row.id));
      setMessages(rows);
      setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, [lobbyId, enabled]);

  useRealtimeInserts<{ id: string }>({
    table: "lobby_messages",
    filter: `lobby_id=eq.${lobbyId}`,
    enabled,
    onInsert: (row) => {
      if (seen.current.has(row.id)) return;
      fetchLobbyMessage(createClient(), row.id).then((message) => {
        if (message) append(message);
      });
    },
  });

  /** Returns an error message to show, or null when it was sent. */
  const send = useCallback(
    async (body: string): Promise<string | null> => {
      if (!meId) return "Log in to chat.";
      const result = await sendLobbyMessage(createClient(), lobbyId, meId, body);
      if ("error" in result) return result.error;
      append(result.message);
      return null;
    },
    [lobbyId, meId, append],
  );

  // Not allowed in: nothing to show, and nothing is loading.
  return {
    messages: enabled ? messages : [],
    loaded: enabled ? loaded : true,
    send,
  };
}
