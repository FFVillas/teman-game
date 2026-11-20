import { mascotSrc, type MascotPose } from "@/data/mascot";

/**
 * Draws Bounce in a given pose.
 *
 * Deliberately an `<img>` and not an inline SVG: the files all declare the
 * same mask ids, so two of them inlined in one page would break each other
 * (see `src/data/mascot.ts`). An `<img>` gives each its own document.
 *
 * Always `aria-hidden` — the mascot restates the heading beside it, so a
 * screen reader announcing it again is noise. Give the surrounding block
 * real text instead.
 */
export default function Mascot({
  pose,
  size = 96,
  className = "",
}: {
  pose: MascotPose;
  /** Width and height in pixels; the artwork is square. */
  size?: number;
  className?: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- static SVG, nothing for next/image to optimise
    <img
      src={mascotSrc(pose)}
      alt=""
      aria-hidden="true"
      width={size}
      height={size}
      className={className}
    />
  );
}
