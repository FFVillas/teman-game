/**
 * A player's picture, or their initial when they haven't uploaded one.
 *
 * Real accounts start with `avatar_path` null, which `avatarUrl()` turns
 * into "" — and `<img src="">` makes the browser re-request the current page
 * (React warns about exactly this). So an empty source must render something
 * else entirely, not an empty image. The initial tile matches the one in the
 * navbar and on the profile header.
 */
export default function UserAvatar({
  src,
  name,
  className = "size-10",
  textClassName = "text-xs",
}: {
  src?: string | null;
  name: string;
  /** Sizing/shape utilities applied to both the image and the fallback. */
  className?: string;
  /** Font size for the initial — should match the chosen size. */
  textClassName?: string;
}) {
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- small avatar thumbnail, no benefit from next/image optimization
      <img
        src={src}
        alt=""
        className={`${className} shrink-0 rounded-full object-cover`}
      />
    );
  }

  return (
    <span
      aria-hidden
      className={`${className} ${textClassName} flex shrink-0 items-center justify-center rounded-full bg-brand/15 font-bold text-brand`}
    >
      {name.charAt(0).toUpperCase()}
    </span>
  );
}
