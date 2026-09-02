"use client";

import { useEffect, useState } from "react";
import { authPanelImages } from "@/data/auth-panel-images";

/**
 * - "image"/"tint": static, left panel only (first image).
 * - "carousel": rotates, left panel only.
 * - "backdrop": rotates, behind the whole card (page-level) — the card
 *   itself stays opaque, so the photo only shows in the margins around it.
 * - "glass": rotates, behind the whole card, AND the card turns translucent
 *   so the photo bleeds through both halves, blurred for legibility.
 * - "glass-left": rotates, behind the whole card, but only the left panel
 *   turns translucent — the form side stays fully opaque.
 * - "glass-right": the mirror of "glass-left" — the form side turns
 *   translucent, the left panel stays fully opaque.
 */
export type AuthPanelVariant =
  | "image"
  | "carousel"
  | "tint"
  | "backdrop"
  | "glass"
  | "glass-left"
  | "glass-right";

const ROTATES: Partial<Record<AuthPanelVariant, true>> = {
  carousel: true,
  backdrop: true,
  glass: true,
  "glass-left": true,
  "glass-right": true,
};

const PAGE_SCOPED: Partial<Record<AuthPanelVariant, true>> = {
  backdrop: true,
  glass: true,
  "glass-left": true,
  "glass-right": true,
};

interface AuthPanelBackgroundProps {
  variant: AuthPanelVariant;
  /** Rotation interval, ms. No effect on "image"/"tint" — those stay static. */
  intervalMs?: number;
}

export default function AuthPanelBackground({
  variant,
  intervalMs = 45000,
}: AuthPanelBackgroundProps) {
  const [index, setIndex] = useState(0);
  const rotates = ROTATES[variant];
  const pageScoped = PAGE_SCOPED[variant];

  useEffect(() => {
    if (!rotates || authPanelImages.length <= 1) return;
    const id = setInterval(() => {
      setIndex((prev) => (prev + 1) % authPanelImages.length);
    }, intervalMs);
    return () => clearInterval(id);
  }, [rotates, intervalMs]);

  return (
    <div
      className={`overflow-hidden ${pageScoped ? "fixed inset-0 -z-10" : "absolute inset-0 -z-10"}`}
    >
      {authPanelImages.map((src, i) => (
        <div
          key={src}
          aria-hidden
          className={`absolute inset-0 bg-cover bg-center transition-opacity duration-[1500ms] ease-in-out ${
            i === index ? "opacity-100" : "opacity-0"
          } ${variant === "tint" ? "grayscale contrast-125 brightness-75" : ""}`}
          style={{ backgroundImage: `url(${src})` }}
        />
      ))}
      {variant === "tint" && (
        <div className="auth-panel-tint-overlay absolute inset-0" />
      )}
      <div
        className={pageScoped ? "auth-page-scrim absolute inset-0" : "auth-panel-scrim absolute inset-0"}
      />
    </div>
  );
}
