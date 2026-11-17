"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { withNext } from "@/lib/auth-redirect";

/**
 * Carries the current page into the auth screens as `?next=`, so logging in
 * returns you where you were instead of dumping you on the LFG page.
 *
 * Both are `shrink-0 whitespace-nowrap`: the buttons set a fixed `h-8`, so at
 * 320px "Log in" wrapped to two lines and spilled out of its own border.
 */
export default function NavAuthButtons() {
  const pathname = usePathname();

  return (
    <>
      <Link
        href={withNext("/login", pathname)}
        className="flex h-8 shrink-0 items-center justify-center whitespace-nowrap rounded-lg border border-border-default px-3 text-xs font-semibold tracking-[0.2px] text-text-subtle transition-colors hover:border-border-strong hover:text-white"
      >
        Log in
      </Link>
      <Link
        href={withNext("/signup", pathname)}
        className="flex h-8 shrink-0 items-center justify-center whitespace-nowrap rounded-lg bg-brand px-3 text-xs font-bold tracking-[0.1px] text-white transition-opacity hover:opacity-90 sm:px-4"
      >
        Sign up
      </Link>
    </>
  );
}
