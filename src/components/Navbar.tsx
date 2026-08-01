import Image from "next/image";
import Link from "next/link";
import Logo from "./Logo";
import { navLinks } from "@/data/nav-links";

export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 flex h-20 w-full items-center justify-center border-b border-border-subtle bg-bg-nav px-6">
      <div className="flex w-full max-w-[1440px] flex-1 items-center gap-8">
        <div className="flex items-center gap-4">
          <Logo />

          <nav className="hidden flex-col items-start pl-6 lg:flex">
            <ul className="flex items-center gap-8">
              {navLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="flex items-center gap-4 text-base font-semibold text-text-muted transition-colors hover:text-white"
                  >
                    <Image
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
          <Image src="/icons/dots.svg" alt="" width={22} height={5} />
        </button>

        <div className="flex flex-1 items-center justify-end gap-4">
          <Image
            src="/icons/people.svg"
            alt=""
            width={21}
            height={16}
            className="hidden sm:block"
          />
          <Link
            href="#"
            className="flex h-10 items-center justify-center rounded-lg border border-border-default px-4 text-sm font-semibold tracking-[0.2px] text-text-subtle transition-colors hover:border-border-strong hover:text-white"
          >
            Log in
          </Link>
          <Link
            href="#"
            className="flex h-10 items-center justify-center rounded-lg bg-brand px-5 text-sm font-bold tracking-[0.1px] text-white transition-opacity hover:opacity-90"
          >
            Sign up
          </Link>
        </div>
      </div>
    </header>
  );
}
