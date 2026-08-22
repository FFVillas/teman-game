interface LfgHeroProps {
  gameIcon: string;
  gameName: string;
  description: string;
}

export default function LfgHero({ gameIcon, gameName, description }: LfgHeroProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        {/* eslint-disable-next-line @next/next/no-img-element -- static SVG icon, no benefit from next/image optimization */}
        <img src={gameIcon} alt="" className="h-5 w-6" />
        <h1 className="text-xl font-extrabold text-white sm:text-2xl">
          Find Your Next {gameName} Team
        </h1>
      </div>
      <p className="max-w-2xl text-sm text-text-muted sm:text-base">
        {description}
      </p>
    </div>
  );
}
