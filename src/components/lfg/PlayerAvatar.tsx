/** A player's picture, or their initial when they have none. */
export default function PlayerAvatar({
  src,
  name,
  className,
}: {
  src?: string;
  name?: string;
  className: string;
}) {
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element -- small avatar thumbnail, no benefit from next/image optimization
    return <img src={src} alt="" className={`rounded-full object-cover ${className}`} />;
  }
  return (
    <span
      className={`flex items-center justify-center rounded-full bg-brand/15 text-[10px] font-bold text-brand ${className}`}
    >
      {(name ?? "?").charAt(0).toUpperCase()}
    </span>
  );
}
