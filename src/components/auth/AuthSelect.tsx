"use client";

import { useId } from "react";
import { fieldBaseClass, fieldStateClass, fieldLabelClass } from "./fieldStyles";

interface AuthSelectProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly string[];
}

export default function AuthSelect({
  label,
  value,
  onChange,
  options,
}: AuthSelectProps) {
  const id = useId();

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className={fieldLabelClass}>
        {label}
      </label>

      <div className="relative">
        <select
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={[
            fieldBaseClass,
            fieldStateClass(false),
            "appearance-none pr-9",
          ].join(" ")}
        >
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        {/* eslint-disable-next-line @next/next/no-img-element -- static SVG icon, no benefit from next/image optimization */}
        <img
          src="/icons/lfg-select-chevron.svg"
          alt=""
          className="pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 opacity-50"
        />
      </div>
    </div>
  );
}
