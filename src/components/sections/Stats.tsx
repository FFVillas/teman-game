import { stats } from "@/data/stats";

export default function Stats() {
  return (
    <section className="w-full px-6 py-20 sm:px-16 lg:px-[120px]">
      <div className="mx-auto flex w-full max-w-[1200px] flex-col items-center justify-center gap-10 sm:flex-row sm:gap-16 lg:gap-[136px]">
        {stats.map((stat, i) => (
          <div key={stat.label} className="flex items-center gap-10 sm:gap-16 lg:gap-[136px]">
            {i > 0 && (
              <div className="hidden h-20 w-0.5 bg-white/10 sm:block" aria-hidden="true" />
            )}
            <div className="flex flex-col items-center">
              <p className="font-heading text-5xl font-extrabold tracking-[-1.4px] text-white sm:text-[56px] sm:tracking-[-2.8px]">
                {stat.value}
              </p>
              <p className="mt-2 whitespace-nowrap font-heading text-base font-bold uppercase tracking-[1.6px] text-brand">
                {stat.label}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
