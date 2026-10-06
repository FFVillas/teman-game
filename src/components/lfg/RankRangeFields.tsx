"use client";

import FormDropdown from "@/components/FormDropdown";
import type { RankTier, TierRange } from "@/lib/ranks";

/**
 * "From tier / To tier" pair. Used twice with the same meaning of "a range of
 * tiers": by a lobby leader to say which ranks they accept, and by someone
 * searching to say which leaders' ranks they want to see.
 *
 * Tiers, not divisions, because people think in "Silver to Gold" and the
 * games' own party rules are mostly counted in tiers. Either end can be left
 * open. Each list only offers tiers that keep the range the right way round,
 * so a backwards range can't be built.
 */
export default function RankRangeFields({
  tiers,
  value,
  onChange,
  size,
  labelPrefix,
}: {
  tiers: RankTier[];
  value: TierRange;
  onChange: (range: TierRange) => void;
  size: "md" | "bar";
  /** Accessible name prefix, e.g. "Leader rank". */
  labelPrefix: string;
}) {
  const from = tiers.find((tier) => tier.name === value.from);
  const to = tiers.find((tier) => tier.name === value.to);

  const asOption = (tier: RankTier) => ({ value: tier.name, label: tier.name });

  return (
    <div className="grid grid-cols-2 gap-2">
      <FormDropdown
        size={size}
        label={`${labelPrefix} from tier`}
        placeholder="Lowest"
        value={value.from}
        onChange={(next) => onChange({ ...value, from: next })}
        options={tiers.filter((tier) => !to || tier.index <= to.index).map(asOption)}
      />
      <FormDropdown
        size={size}
        label={`${labelPrefix} to tier`}
        placeholder="Highest"
        value={value.to}
        onChange={(next) => onChange({ ...value, to: next })}
        options={tiers.filter((tier) => !from || tier.index >= from.index).map(asOption)}
      />
    </div>
  );
}
