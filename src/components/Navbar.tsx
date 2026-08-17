import Link from "next/link";
import Logo from "./Logo";
import { navLinks } from "@/data/nav-links";

export default function Navbar() {
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

        <button
          type="button"
          aria-label="More games"
          className="hidden shrink-0 lg:block"
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- static SVG icon, no benefit from next/image optimization */}
          <img src="/icons/dots.svg" alt="" width={16} height={4} />
        </button>

        <div className="flex flex-1 items-center justify-end gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element -- static SVG icon, no benefit from next/image optimization */}
          <img
            src="/icons/people.svg"
            alt=""
            width={16}
            height={12}
            className="hidden sm:block"
          />
          <Link
            href="/login"
            className="flex h-8 items-center justify-center rounded-lg border border-border-default px-3 text-xs font-semibold tracking-[0.2px] text-text-subtle transition-colors hover:border-border-strong hover:text-white"
          >
            Log in
          </Link>
          <Link
            href="/signup"
            className="flex h-8 items-center justify-center rounded-lg bg-brand px-4 text-xs font-bold tracking-[0.1px] text-white transition-opacity hover:opacity-90"
          >
            Sign up
          </Link>
        </div>
      </div>
    </header>
  );
}
