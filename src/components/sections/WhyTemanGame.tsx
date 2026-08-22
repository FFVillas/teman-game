import { valuePoints } from "@/data/landing";

/**
 * Bordered icon cards — deliberately a different shape from the numbered
 * timeline above it, so the two sections don't read as the same block twice.
 */
export default function WhyTemanGame() {
  return (
    <section className="px-6 py-16">
      <div className="mx-auto flex max-w-[1000px] flex-col gap-8">
        <div className="flex flex-col gap-3">
          <h2 className="text-2xl font-extrabold tracking-[-0.5px] text-white sm:text-3xl">
            Better than hitting queue and hoping
          </h2>
          <p className="max-w-[600px] text-sm leading-relaxed text-text-muted">
            Random matchmaking gives you whoever is available. Here you choose.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {valuePoints.map((point) => (
            <div
              key={point.title}
              className="flex flex-col gap-4 rounded-2xl border border-border-strong bg-bg-card-alt p-6"
            >
              <div className="flex items-center gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-border-default bg-bg-icon-tile">
                  {/* eslint-disable-next-line @next/next/no-img-element -- static SVG icon, no benefit from next/image optimization */}
                  <img
                    src={point.icon}
                    alt=""
                    width={point.iconWidth}
                    height={point.iconHeight}
                  />
                </div>
                <h3 className="text-sm font-bold leading-snug text-white">
                  {point.title}
                </h3>
              </div>
              <p className="text-xs leading-relaxed text-text-muted">
                {point.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
