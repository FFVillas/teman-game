"use client";

import { useEffect, useRef, useState } from "react";


export interface SortOption {
  value: string;
  label: string;
}

const defaultSortOptions: SortOption[] = [
  { value: "latest", label: "Latest" },
  { value: "most-players", label: "Most Players" },
  { value: "slots-available", label: "Slots Available" },
  { value: "alphabetical", label: "A–Z" },
];

export default function SortDropdown({
  options = defaultSortOptions,
}: {
  options?: SortOption[];
}) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(options[0]);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-[#94a3b8]">Sort by:</span>
      <div className="relative" ref={rootRef}>
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          aria-haspopup="listbox"
          aria-expanded={open}
          className="flex items-center gap-2 rounded-lg border border-transparent px-2 py-1.5 transition-colors hover:border-white/10 hover:bg-white/5"
        >
          <span className="font-medium text-white">{selected.label}</span>
          {/* eslint-disable-next-line @next/next/no-img-element -- static SVG icon, no benefit from next/image optimization */}
          <img
            src="/icons/lfg-sort-chevron.svg"
            alt=""
            className={`size-2.5 transition-transform duration-150 ${open ? "rotate-180" : ""}`}
          />
        </button>

        {open && (
          <div
            role="listbox"
            className="absolute right-0 top-[calc(100%+8px)] z-20 w-44 overflow-hidden rounded-xl border border-white/10 bg-bg-card-alt py-1.5 shadow-xl shadow-black/40"
          >
            {options.map((option) => {
              const isSelected = option.value === selected.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    setSelected(option);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center px-3.5 py-2 text-left text-sm transition-colors hover:bg-white/5 ${
                    isSelected ? "font-semibold text-brand" : "text-white/80"
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
