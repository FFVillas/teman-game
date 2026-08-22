import type { ReactNode } from "react";
import Link from "next/link";
import Logo from "@/components/Logo";
import AuthPanelCards from "./AuthPanelCards";
import type { AuthPanelContent } from "@/data/auth";

interface AuthShellProps {
  panel: AuthPanelContent;
  title: string;
  subtitle: string;
  children: ReactNode;
}

export default function AuthShell({
  panel,
  title,
  subtitle,
  children,
}: AuthShellProps) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-8 sm:px-6 sm:py-12">
      {/*
        Fixed min-height so login and signup are the same size — signup has
        two more fields, and without this the card visibly grows between the
        two screens.
      */}
      <div className="grid w-full max-w-[1060px] overflow-hidden rounded-2xl border border-border-strong bg-bg-card-alt lg:min-h-[704px] lg:grid-cols-2">
        <aside className="auth-panel-gradient relative hidden flex-col justify-between p-10 lg:flex">
          <Logo />

          <div className="flex flex-col gap-3">
            <h2 className="max-w-[280px] text-[34px] font-extrabold leading-[1.12] tracking-[-1.2px] text-white">
              {panel.heading}
            </h2>
            <p className="max-w-[260px] text-sm leading-relaxed text-white/60">
              {panel.description}
            </p>
          </div>

          <AuthPanelCards
            cards={panel.cards}
            activeCard={panel.activeCard}
            badge={panel.badge}
          />
        </aside>

        <main className="flex flex-col justify-center px-6 py-10 sm:px-12 lg:px-14">
          <div className="mx-auto flex w-full max-w-[400px] flex-col gap-6">
            {/* The panel carries the logo on desktop, but it's hidden below lg. */}
            <div className="flex justify-center lg:hidden">
              <Logo />
            </div>

            <div className="flex flex-col gap-1.5 text-center">
              <h1 className="text-2xl font-extrabold tracking-[-0.5px] text-white">
                {title}
              </h1>
              <p className="text-[13px] text-text-muted">{subtitle}</p>
            </div>

            {children}

            <Link
              href="/"
              className="text-center text-xs text-text-muted transition-colors hover:text-white"
            >
              ← Back to home
            </Link>
          </div>
        </main>
      </div>
    </div>
  );
}
