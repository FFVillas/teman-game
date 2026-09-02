"use client";

import { personalityTagOptions } from "@/data/player-profiles";

interface PlaystyleStepProps {
  playstyle: number;
  onPlaystyleChange: (value: number) => void;
  tags: string[];
  onToggleTag: (tag: string) => void;
}

const playstyleScale = [1, 2, 3, 4, 5];

export default function PlaystyleStep({
  playstyle,
  onPlaystyleChange,
  tags,
  onToggleTag,
}: PlaystyleStepProps) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-bold text-white">How do you play?</h2>
        <p className="text-sm text-text-muted">
          This is what the matchmaking score actually compares — teammates
          close to your answer here rank higher than teammates who just share
          your rank.
        </p>
      </div>

      <div className="flex flex-col gap-2.5">
        <span className="text-xs font-bold uppercase tracking-wider text-text-muted">
          Playstyle
        </span>
        <div className="flex items-center gap-2">
          {playstyleScale.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => onPlaystyleChange(value)}
              aria-pressed={playstyle === value}
              className={`flex h-11 flex-1 items-center justify-center rounded-lg border text-sm font-bold transition-colors ${
                playstyle === value
                  ? "border-brand bg-brand text-white"
                  : "border-border-strong text-text-muted hover:border-white/30 hover:text-white"
              }`}
            >
              {value}
            </button>
          ))}
        </div>
        <div className="flex justify-between text-[11px] text-text-muted">
          <span>Very casual</span>
          <span>Very competitive</span>
        </div>
      </div>

      <div className="flex flex-col gap-2.5">
        <span className="text-xs font-bold uppercase tracking-wider text-text-muted">
          Personality tags
        </span>
        <div className="flex flex-wrap gap-2">
          {personalityTagOptions.map((tag) => {
            const isSelected = tags.includes(tag);
            return (
              <button
                key={tag}
                type="button"
                onClick={() => onToggleTag(tag)}
                aria-pressed={isSelected}
                className={`rounded-full border px-4 py-1.5 text-xs transition-colors ${
                  isSelected
                    ? "border-brand text-brand"
                    : "border-border-strong text-text-muted hover:border-white/30"
                }`}
              >
                {tag}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
