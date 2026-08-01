import FeatureCard from "@/components/FeatureCard";
import { features } from "@/data/features";

export default function Features() {
  return (
    <section className="w-full px-6 py-24 sm:px-10 lg:px-20">
      <div className="mx-auto flex max-w-[1440px] flex-col items-center gap-16">
        <div className="flex flex-col items-center gap-4 text-center">
          <h2 className="font-heading text-3xl font-extrabold text-white sm:text-4xl">
            HOW TEMANGAME HELPS YOU{" "}
            <span className="text-brand">FIND YOUR TEAM</span>
          </h2>
          <p className="max-w-[600px] font-heading text-lg text-text-muted">
            The ultimate ecosystem for competitive and social gamers looking
            to level up their squad experience.
          </p>
        </div>

        <div className="grid w-full grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => (
            <FeatureCard key={feature.title} feature={feature} />
          ))}
        </div>
      </div>
    </section>
  );
}
