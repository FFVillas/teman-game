"use client";

import { useState } from "react";

interface StarRatingProps {
  value: number;
  onChange: (value: number) => void;
}

/**
 * 1–5 stars. The raw value is normalised to `R = stars / 5` before it feeds
 * the compatibility score — see docs/thesis-spec.md.
 */
export default function StarRating({ value, onChange }: StarRatingProps) {
  const [hovered, setHovered] = useState(0);
  const shown = hovered || value;

  return (
    <div
      role="radiogroup"
      aria-label="Rate the player"
      className="flex items-center gap-2"
      onMouseLeave={() => setHovered(0)}
    >
      {[1, 2, 3, 4, 5].map((star) => {
        const isFilled = star <= shown;
        return (
          <button
            key={star}
            type="button"
            role="radio"
            aria-checked={value === star}
            aria-label={`${star} star${star === 1 ? "" : "s"}`}
            onMouseEnter={() => setHovered(star)}
            onClick={() => onChange(star)}
            className="transition-transform hover:scale-110"
          >
            <svg
              viewBox="0 0 24 24"
              className={`size-9 ${isFilled ? "text-star" : "text-white/20"}`}
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M12 2.5l2.9 5.9 6.5.95-4.7 4.58 1.11 6.47L12 17.4l-5.81 3.05 1.11-6.47L2.6 9.35l6.5-.95L12 2.5z" />
            </svg>
          </button>
        );
      })}
    </div>
  );
}
