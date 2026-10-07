"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Logo from "./Logo";
import UserMenu from "./UserMenu";
import { navLinks } from "@/data/nav-links";
import { useAuth } from "@/contexts/AuthContext";
import { activeLobby } from "@/data/lfg-lobby";
import NavAuthButtons from "./NavAuthButtons";
import NotificationBell from "./NotificationBell";
import { createClient } from "@/lib/supabase/client";
import { fetchUnreadMessageCount } from "@/lib/direct-messages";

export default function Navbar() {
  const { user, isAdmin } = useAuth();
  // Staff accounts don't play, so player-only controls are hidden for them.
  const isPlayer = Boolean(user) && !isAdmin;
  // Unread DMs, read once per page load — same freshness as the bell.
  // TODO: a Supabase realtime subscription would make both live.
  const [unreadMessages, setUnreadMessages] = useState(0);
  const playerId = isPlayer ? user!.id : null;

  useEffect(() => {
    let cancelled = false;
    const count = playerId
      ? fetchUnreadMessageCount(createClient(), playerId)
      : Promise.resolve(0);
    count.then((value) => {
      if (!cancelled) setUnreadMessages(value);
    });
    return () => {
      cancelled = true;
    };
  }, [playerId]);

  return (
    <header className="sticky top-0 z-50 flex h-[60px] w-full items-center justify-center border-b border-border-subtle bg-bg-nav px-6">
      <div className="flex w-full max-w-[1440px] flex-1 items-center gap-6">
        <div className="flex items-center gap-3">
          <Logo compact />

          <nav className="hidden flex-col items-start pl-5 lg:flex">
            <ul className="flex items-center gap-6">
              {navLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="flex items-center gap-2 text-sm font-semibold text-text-muted transition-colors hover:text-white"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element -- static SVG icon, no benefit from next/image optimization */}
                    <img
                      src={link.icon}
                      alt=""
                      width={link.iconWidth}
                      height={link.iconHeight}
                    />
                    <span>{link.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="flex flex-1 items-center justify-end gap-3">
          {/*
            Persistent way back into the lobby you're in, from any page. A
            user can only be in one live lobby at a time, so this is either
            present or absent — never a list.
          */}
          <Link
            href={`/lfg/${activeLobby.game}/lobby/${activeLobby.id}`}
            title={`Your lobby: ${activeLobby.name}`}
            className="flex h-8 items-center gap-2 rounded-lg border border-brand/40 bg-brand/10 px-2.5 transition-colors hover:border-brand/70 sm:px-3"
          >
            <span className="relative flex size-2 shrink-0">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-60" />
              <span className="relative inline-flex size-2 rounded-full bg-success" />
            </span>
            <span className="hidden max-w-[130px] truncate text-xs font-bold text-white lg:block">
              {activeLobby.name}
            </span>
            <span className="text-xs font-bold text-white lg:hidden">
              Lobby
            </span>
          </Link>

          {isPlayer && <NotificationBell />}

          {isPlayer && (
            <Link
              href="/messages"
              aria-label={
                unreadMessages > 0
                  ? `Messages, ${unreadMessages} unread`
                  : "Messages"
              }
              className="relative flex size-8 items-center justify-center rounded-lg opacity-70 transition-opacity hover:opacity-100"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- static SVG icon, no benefit from next/image optimization */}
              <img src="/icons/nav-chat.svg" alt="" className="size-[22px]" />
              {/* Sits on the bubble rather than beside it: the count belongs
                  to the icon, and tucking it in keeps the row compact. */}
              {unreadMessages > 0 && (
                <span className="absolute right-0 top-0 flex h-3.5 min-w-3.5 items-center justify-center rounded-full border border-bg-nav bg-brand px-1 text-[9px] font-bold text-white">
                  {unreadMessages}
                </span>
              )}
            </Link>
          )}

          {/* Signed out, the auth buttons carry the current page as ?next=. */}
          {user ? <UserMenu user={user} /> : <NavAuthButtons />}
        </div>
      </div>
    </header>
  );
}
