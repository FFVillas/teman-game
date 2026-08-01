import Image from "next/image";
import type { Feature } from "@/data/features";

export default function FeatureCard({ feature }: { feature: Feature }) {
  return (
    <div className="flex w-full flex-col items-start rounded-3xl border border-border-default bg-bg-surface p-8">
      <div className="mb-6 flex size-12 shrink-0 items-center justify-center rounded-xl border border-border-default bg-bg-icon-tile">
        <Image
          src={feature.icon}
          alt=""
          width={feature.iconWidth}
          height={feature.iconHeight}
        />
      </div>
      <h3 className="mb-3 font-heading text-xl font-bold text-white">
        {feature.title}
      </h3>
      <p className="font-heading text-base leading-[1.6] text-text-muted">
        {feature.description}
      </p>
    </div>
  );
}
