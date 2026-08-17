"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth, type AuthUser } from "@/contexts/AuthContext";
import { userMenuLinks, userMenuLegalLinks } from "@/data/user-menu";

export default function UserMenu({ user }: { user: AuthUser }) {
  const { logout } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleLogout() {
    setOpen(false);
    logout();
    router.push("/");
  }

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex h-8 items-center gap-2 rounded-lg border border-border-default bg-white/5 py-1 pl-1 pr-3 transition-colors hover:border-border-strong"
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- small avatar thumbnail, no benefit from next/image optimization */}
        <img
          src={user.avatar}
          alt=""
          className="size-6 rounded-full object-cover"
        />
        <span className="text-xs font-semibold text-text-subtle">
          {user.name}
        </span>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+8px)] z-20 w-52 overflow-hidden rounded-xl border border-white/10 bg-bg-card-alt py-1.5 shadow-xl shadow-black/40"
        >
          {userMenuLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex w-full items-center px-3.5 py-2 text-left text-sm text-white/80 transition-colors hover:bg-white/5 hover:text-white"
            >
              {link.label}
            </Link>
          ))}

          <div className="my-1.5 border-t border-white/10" />

          {userMenuLegalLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex w-full items-center px-3.5 py-2 text-left text-sm text-white/80 transition-colors hover:bg-white/5 hover:text-white"
            >
              {link.label}
            </Link>
          ))}

          <div className="my-1.5 border-t border-white/10" />

          <button
            type="button"
            role="menuitem"
            onClick={handleLogout}
            className="flex w-full items-center px-3.5 py-2 text-left text-sm font-semibold text-danger transition-colors hover:bg-white/5"
          >
            Logout
          </button>
        </div>
      )}
    </div>
  );
}
