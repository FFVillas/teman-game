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

      <div className="mt-1 flex flex-col gap-3 rounded-xl border border-white/10 bg-bg-card-alt/80 p-4 backdrop-blur-md sm:flex-row sm:flex-wrap sm:items-end">
        <div className="flex min-w-[220px] flex-1 flex-col gap-1.5">
          <label
            htmlFor="lfg-search"
            className="text-[11px] font-semibold uppercase tracking-wider text-text-muted"
          >
            Search Teams
          </label>
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element -- static SVG icon, no benefit from next/image optimization */}
            <img
              src="/icons/lfg-search.svg"
              alt=""
              className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2"
            />
            <input
              id="lfg-search"
              type="text"
              placeholder="Search by team name or keyword..."
              className="h-10 w-full rounded-lg border border-white/10 bg-[#0e1015] pl-9 pr-4 text-sm text-white placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5 sm:w-36">
          <label
            htmlFor="lfg-region"
            className="text-[11px] font-semibold uppercase tracking-wider text-text-muted"
          >
            Region
          </label>
          <div className="relative">
            <select
              id="lfg-region"
              defaultValue="SG2"
              className="h-10 w-full appearance-none rounded-lg border border-white/10 bg-[#0e1015] px-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-brand"
            >
              <option value="SG2">SG2</option>
            </select>
            {/* eslint-disable-next-line @next/next/no-img-element -- static SVG icon, no benefit from next/image optimization */}
            <img
              src="/icons/lfg-chevron-down.svg"
              alt=""
              className="pointer-events-none absolute right-3 top-1/2 size-3.5 -translate-y-1/2"
            />
          </div>
        </div>

        <button
          type="button"
          aria-label="More filters"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-[#0e1015] transition-colors hover:border-white/20"
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- static SVG icon, no benefit from next/image optimization */}
          <img src="/icons/lfg-filter.svg" alt="" className="h-3.5 w-3.5" />
        </button>

        <button
          type="button"
          className="flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-lg bg-brand px-5 text-sm font-bold text-white transition-opacity hover:opacity-90"
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- static SVG icon, no benefit from next/image optimization */}
          <img src="/icons/lfg-search-btn.svg" alt="" className="size-3" />
          Search
        </button>
      </div>
    </div>
  );
}
