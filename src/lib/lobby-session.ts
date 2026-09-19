"use client";

import { useCallback, useSyncExternalStore } from "react";
import {
  CURRENT_PLAYER_ID,
  currentPlayerMember,
  type Lobby,
  type LobbyMessage,
  type LobbyStatus,
  type LobbyViewerRole,
} from "@/data/lfg-lobby";

/**
 * Live state of a lobby that more than one screen needs: the lobby page and
 * its chat page (`/lobby/<id>/chat`) both read and write the same messages
 * and status, so a message sent on one shows up on the other.
 *
 * Stands in for the `lobby` row + `lobby_messages` + a realtime subscription.
 * Kept in sessionStorage, so it survives navigation and reloads in a tab but
 * a fresh tab starts the demo over.
 */
export interface LobbySession {
  status: LobbyStatus;
  messages: LobbyMessage[];
  /**
   * Lobby chats are temporary: when the lobby ends, the chat is closed and
   * its messages are deleted for players.
   * TODO (backend): keep a private copy for moderators before deleting —
   * reports about a lobby rely on its chat log as evidence.
   */
  chatClosed: boolean;
  /** Set when an invited player accepts; otherwise the data decides. */
  roleOverride?: LobbyViewerRole;
}

type Sessions = Record<string, LobbySession>;

const STORAGE_KEY = "temangame:lobby-sessions";
const EMPTY: Sessions = {};

let cache: Sessions | null = null;
const listeners = new Set<() => void>();

function readSessions(): Sessions {
  if (cache) return cache;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    cache = raw ? (JSON.parse(raw) as Sessions) : {};
  } catch {
    cache = {};
  }
  return cache;
}

function writeSessions(next: Sessions) {
  cache = next;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Storage blocked: state still lives for this page view.
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function seedFor(lobby: Lobby): LobbySession {
  return {
    status: lobby.status,
    messages: lobby.messages,
    chatClosed: lobby.status === "completed",
  };
}

export function updateLobbySession(
  lobby: Lobby,
  recipe: (prev: LobbySession) => LobbySession
) {
  const all = readSessions();
  writeSessions({
    ...all,
    [lobby.id]: recipe(all[lobby.id] ?? seedFor(lobby)),
  });
}

/** Every lobby's live state — for screens that list several chats. */
export function useLobbySessions() {
  // Server render (and the first client render) uses the seed; the stored
  // session takes over right after hydration.
  const sessions = useSyncExternalStore(subscribe, readSessions, () => EMPTY);
  return useCallback(
    (lobby: Lobby): LobbySession => sessions[lobby.id] ?? seedFor(lobby),
    [sessions]
  );
}

export function useLobbySession(lobby: Lobby) {
  const sessionFor = useLobbySessions();
  const update = useCallback(
    (recipe: (prev: LobbySession) => LobbySession) =>
      updateLobbySession(lobby, recipe),
    [lobby]
  );
  return { session: sessionFor(lobby), update };
}

/** The signed-in player's chat message, appended to a session. */
export function withPlayerMessage(
  prev: LobbySession,
  body: string
): LobbySession {
  return {
    ...prev,
    messages: [
      ...prev.messages,
      {
        id: `msg-${Date.now()}`,
        authorId: CURRENT_PLAYER_ID,
        authorName: currentPlayerMember.name,
        avatar: currentPlayerMember.avatar,
        body,
        sentAt: "now",
      },
    ],
  };
}

export function chatHref(lobby: Pick<Lobby, "game" | "id">) {
  return `/lfg/${lobby.game}/lobby/${lobby.id}/chat`;
}

export function lobbyHref(lobby: Pick<Lobby, "game" | "id">) {
  return `/lfg/${lobby.game}/lobby/${lobby.id}`;
}
