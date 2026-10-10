import type { CSSProperties } from "react";

/**
 * A player's picture, or their initial when they have none.
 *
 * The initial tile is opaque (the card colour with a brand tint on top, not a
 * see-through tint), because avatars are drawn overlapping in a stack and a
 * transparent tile shows the one underneath through it.
 *
 * In a stack the first avatar should sit in front, so give each one
 * `style={{ zIndex: total - index }}` (see `LfgTeamCard`).
 */
export default function PlayerAvatar({
  src,
  name,
  className,
  style,
}: {
  src?: string;
  name?: string;
  className: string;
  style?: CSSProperties;
}) {
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- small avatar thumbnail, no benefit from next/image optimization
      <img
        src={src}
        alt=""
        style={style}
        className={`rounded-full object-cover ${className}`}
      />
    );
  }
  return (
    <span
      style={style}
      className={`relative flex items-center justify-center overflow-hidden rounded-full bg-bg-card-alt text-[10px] font-bold text-brand ${className}`}
    >
      <span aria-hidden className="absolute inset-0 bg-brand/15" />
      <span className="relative">{(name ?? "?").charAt(0).toUpperCase()}</span>
    </span>
  );
}
