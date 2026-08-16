import Link from "next/link";

export default function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-2">
      <div
        className={`flex shrink-0 items-center justify-center rounded-lg bg-brand ${
          compact ? "size-6" : "size-8"
        }`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- static SVG icon, no benefit from next/image optimization */}
        <img
          src="/icons/logo-mark.svg"
          alt=""
          width={compact ? 13 : 17.5}
          height={compact ? 10.5 : 14}
        />
      </div>
      <span
        className={`font-display font-black italic tracking-[-1px] text-white ${
          compact ? "text-sm" : "text-base"
        }`}
      >
        TemanGame
      </span>
    </Link>
  );
}
