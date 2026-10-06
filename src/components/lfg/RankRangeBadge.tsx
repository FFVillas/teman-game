import type { GameRank } from "@/lib/games";
import { rankRangeEnds, describeTierRange, type TierRange } from "@/lib/ranks";
import { rankIconFor } from "@/data/rank-icons";

function Point({
  rank,
  gameSlug,
  text,
  icon,
}: {
  rank: GameRank;
  gameSlug: string;
  text: string;
  icon: string;
}) {
  const art = rankIconFor(gameSlug, rank);
  return (
    <span className="flex items-center gap-1">
      {art ? (
        // eslint-disable-next-line @next/next/no-img-element -- static badge icon, no benefit from next/image optimization
        <img src={art} alt="" className={icon} />
      ) : (
        <span aria-hidden className={`${icon} flex items-center justify-center`}>
          <span className="size-1.5 rotate-45 rounded-[1px] bg-white/40" />
        </span>
      )}
      <span className={`${text} font-bold text-white/90`}>
        {rank.name}
      </span>
    </span>
  );
}

/**
 * A lobby's accepted rank range, drawn like a rank badge: "[icon] Plat 1 to
 * [icon] Diamond 3". Open ends read "Ascendant 1 and up"; no range reads "Any
 * rank". Tiers without art yet get a plain marker so the row keeps its shape.
 */
export default function RankRangeBadge({
  range,
  ranks,
  gameSlug,
  size = "md",
}: {
  range?: TierRange;
  /** The game's ladder. Without it the badge falls back to plain wording. */
  ranks?: GameRank[];
  gameSlug: string;
  size?: "md" | "sm";
}) {
  const { from, to } = rankRangeEnds(ranks ?? [], range);
  const text = size === "md" ? "text-[11px]" : "text-[9px]";
  const icon = size === "md" ? "size-3.5" : "size-3";

  if (!from && !to) {
    return (
      <span className={`${text} font-semibold text-text-muted`}>
        {describeTierRange(range)}
      </span>
    );
  }

  return (
    <span className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
      {from && <Point rank={from} gameSlug={gameSlug} text={text} icon={icon} />}
      {from && to && from.id !== to.id && (
        <>
          <span aria-hidden className="h-px w-2 bg-white/30" />
          <Point rank={to} gameSlug={gameSlug} text={text} icon={icon} />
        </>
      )}
      {from && !to && (
        <span className={`${text} text-text-muted`}>and up</span>
      )}
      {!from && to && (
        <>
          <Point rank={to} gameSlug={gameSlug} text={text} icon={icon} />
          <span className={`${text} text-text-muted`}>and below</span>
        </>
      )}
    </span>
  );
}
