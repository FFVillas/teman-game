import { howItWorks } from "@/data/landing";

/**
 * Rendered as a connected timeline, not as cards — the "why" section below
 * uses bordered icon cards, and two identical card rows back-to-back read as
 * filler. A numbered line also carries the sense of sequence that boxes lose.
 */
export default function HowItWorks() {
  return (
    <section className="px-6 py-16">
      <div className="mx-auto flex max-w-[1000px] flex-col gap-10">
        <h2 className="text-2xl font-extrabold tracking-[-0.5px] text-white sm:text-3xl">
          How it works
        </h2>

        <ol className="grid gap-10 sm:grid-cols-3 sm:gap-6">
          {howItWorks.map((step, index) => {
            const isLast = index === howItWorks.length - 1;

            return (
              <li key={step.title} className="flex flex-col gap-4">
                <div className="flex items-center gap-4">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full border-2 border-brand bg-brand/10 font-heading text-sm font-extrabold text-brand">
                    {index + 1}
                  </span>
                  {!isLast && (
                    <span
                      aria-hidden="true"
                      className="hidden h-px flex-1 bg-gradient-to-r from-brand/40 to-transparent sm:block"
                    />
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  <h3 className="text-base font-bold text-white">
                    {step.title}
                  </h3>
                  <p className="max-w-[300px] text-xs leading-relaxed text-text-muted">
                    {step.description}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
