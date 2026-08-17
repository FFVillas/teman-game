import type { AuthPanelContent } from "@/data/auth";

type AuthPanelCardsProps = Pick<
  AuthPanelContent,
  "cards" | "activeCard" | "badge"
>;

export default function AuthPanelCards({
  cards,
  activeCard,
  badge,
}: AuthPanelCardsProps) {
  const isSequence = badge === "number";
  const Tag = isSequence ? "ol" : "ul";

  return (
    <Tag className="flex gap-3">
      {cards.map((card, index) => {
        const isActive = index === activeCard;

        return (
          <li
            key={card.title}
            aria-current={isActive ? "step" : undefined}
            className={`flex flex-1 flex-col gap-6 rounded-2xl p-4 backdrop-blur-sm transition-colors ${
              isActive
                ? "bg-white text-[#061224] shadow-lg shadow-black/20"
                : "bg-white/10 text-white/70"
            }`}
          >
            <span
              className={`flex size-6 items-center justify-center rounded-full text-[11px] font-bold ${
                isActive
                  ? "bg-[#061224] text-white"
                  : "bg-white/20 text-white/80"
              }`}
            >
              {isSequence ? (
                index + 1
              ) : (
                // eslint-disable-next-line @next/next/no-img-element -- static SVG icon, no benefit from next/image optimization
                <img src={card.icon} alt="" className="size-3.5" />
              )}
            </span>

            <div className="flex flex-col gap-0.5">
              <span className="text-[13px] font-bold leading-snug">
                {card.title}
              </span>
              {card.caption && (
                <span
                  className={`text-[11px] leading-snug ${
                    isActive ? "text-[#061224]/60" : "text-white/50"
                  }`}
                >
                  {card.caption}
                </span>
              )}
            </div>
          </li>
        );
      })}
    </Tag>
  );
}
