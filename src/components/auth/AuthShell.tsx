import type { ReactNode } from "react";
import Link from "next/link";
import Logo from "@/components/Logo";
import AuthPanelCards from "./AuthPanelCards";
import AuthPanelBackground, {
  type AuthPanelVariant,
} from "./AuthPanelBackground";
import type { AuthPanelContent } from "@/data/auth";

interface AuthShellProps {
  panel: AuthPanelContent;
  title: string;
  subtitle: string;
  children: ReactNode;
  /**
   * Background treatment. "glass-left" (rotating photo behind the whole
   * card, left panel translucent/blurred, form side stays opaque) is what
   * login/signup actually ship with — the team picked it after comparing
   * the alternatives below live.
   *
   * Everything else was design exploration along the way and is kept
   * working rather than deleted, in case it's worth revisiting:
   * "image"/"carousel"/"tint" replace just the left panel's gradient with
   * photo art. "backdrop"/"glass"/"glass-right" are the other page-level
   * photo treatments — "backdrop" keeps the card opaque (photo only shows
   * in the margins), "glass" makes the whole card translucent, "glass-right"
   * is glass-left mirrored. "solo" drops the left panel entirely — just the
   * form card, centered, floating over the rotating photo, logo moved into
   * the card's top-left corner instead of the panel. Defaults to the
   * original "gradient" if this prop is omitted entirely.
   */
  panelVariant?: "gradient" | AuthPanelVariant | "solo";
}

export default function AuthShell({
  panel,
  title,
  subtitle,
  children,
  panelVariant = "gradient",
}: AuthShellProps) {
  if (panelVariant === "solo") {
    return (
      <div className="relative flex min-h-screen flex-col items-center justify-center px-4 py-8 sm:px-6 sm:py-12">
        <AuthPanelBackground variant="backdrop" />

        <div className="absolute left-4 top-4 sm:left-6 sm:top-6">
          <Logo />
        </div>

        <div className="flex w-full max-w-[440px] flex-col gap-8 overflow-hidden rounded-2xl border border-border-strong bg-bg-card-alt p-8 sm:p-10">
          <div className="mx-auto flex w-full max-w-[400px] flex-col gap-6">
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
        </div>
      </div>
    );
  }

  const isPanelPhoto =
    panelVariant === "image" ||
    panelVariant === "carousel" ||
    panelVariant === "tint";
  const isPageBackdrop =
    panelVariant === "backdrop" ||
    panelVariant === "glass" ||
    panelVariant === "glass-left" ||
    panelVariant === "glass-right";
  const isGlass = panelVariant === "glass";
  const isGlassLeft = panelVariant === "glass-left";
  const isGlassRight = panelVariant === "glass-right";
  const isSplitGlass = isGlassLeft || isGlassRight;
  const glassClasses = "auth-card-glass backdrop-blur-xl";

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center px-4 py-8 sm:px-6 sm:py-12">
      {isPageBackdrop && <AuthPanelBackground variant={panelVariant} />}

      {/*
        Fixed min-height so login and signup are the same size — signup has
        two more fields, and without this the card visibly grows between the
        two screens.
      */}
      <div
        className={`grid w-full max-w-[1060px] overflow-hidden rounded-2xl border border-border-strong lg:min-h-[704px] lg:grid-cols-2 ${
          isGlass ? glassClasses : isSplitGlass ? "" : "bg-bg-card-alt"
        }`}
      >
        <aside
          className={`relative isolate hidden flex-col justify-between p-10 lg:flex ${
            panelVariant === "gradient"
              ? "auth-panel-gradient"
              : isPanelPhoto
                ? "bg-[var(--color-auth-base)]"
                : isGlassLeft
                  ? glassClasses
                  : isGlassRight
                    ? "bg-bg-card-alt"
                    : ""
          }`}
        >
          {isPanelPhoto && <AuthPanelBackground variant={panelVariant} />}

          <Logo />

          <div
            className={`flex flex-col gap-3 ${isPanelPhoto ? "auth-panel-text-shadow" : ""}`}
          >
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

        <main
          className={`flex flex-col justify-center px-6 py-10 sm:px-12 lg:px-14 ${
            isGlassLeft ? "bg-bg-card-alt" : isGlassRight ? glassClasses : ""
          }`}
        >
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
