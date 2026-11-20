/**
 * Bounce, the TemanGame mascot.
 *
 * A pair of blue blobs — two friends, which is what *teman* means and what
 * the product is for. The artwork is in `public/mascot/`, 28 SVGs on a
 * 200×200 viewBox, all in `--main-color` (`#2c7ff3`) so they sit on the dark
 * page without a container.
 *
 * **Never inline these into JSX.** Every file declares the same mask ids
 * (`d10`, `d11`) because each was authored as a standalone document; two
 * inlined in one page would collide and the second one's eyes and the gap
 * between the blobs would vanish. Rendering through `<img src>` — which is
 * what `components/Mascot.tsx` does — gives each its own document, so they
 * can't clash.
 *
 * Poses are not decoration: each was drawn for a specific screen, so use the
 * one that matches rather than the one that looks nicest. A mascot on every
 * surface stops meaning anything.
 */

/** A pose the app actually uses. The others are listed below it. */
export type MascotPose =
  // Screens where something went wrong or nothing is there yet
  | "empty"
  | "error"
  | "lost"
  | "soon"
  | "search"
  | "filter"
  | "chat"
  // Things a player does
  | "login"
  | "apply"
  | "accepted"
  | "rate"
  | "support"
  | "trust"
  // Plain duo, for the landing page and anywhere needing no particular mood
  | "hero"
  | "cta"
  | "default"
  | "solo"
  // Faces, for small slots where a full pose would be too busy
  | "happy"
  | "cheeky"
  | "locked-in"
  | "worried"
  // Three frames of a bounce, for a loading state that runs them in turn
  | "loading-1"
  | "loading-2"
  | "loading-3";

export function mascotSrc(pose: MascotPose): string {
  return `/mascot/${pose}.svg`;
}

/**
 * The app icon lockup: the duo in white on a rounded brand square, with the
 * designer's own padding and corner radius. Used wherever the logo appears as
 * a mark (`components/Logo.tsx`, the offline screen).
 *
 * `public/mascot/app-icon-dark.svg` and `-gradient.svg` are the same lockup on
 * other backgrounds; nothing uses them yet.
 *
 * `public/icons/logo-mark.svg` is a third thing again — the duo in **white on
 * transparent**, which is what `scripts/generate-pwa-icons.mjs` composites
 * onto its own brand square. Keep it white, or the PWA icons come out
 * blue-on-blue and invisible.
 */
export const APP_ICON = "/mascot/app-icon.svg";
