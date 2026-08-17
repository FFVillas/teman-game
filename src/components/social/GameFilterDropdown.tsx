"use client";

import { useEffect, useRef, useState } from "react";

const gameOptions = [
  "All Games",
  "LoL",
  "Valorant",
  "CSGO 2",
  "MLBB",
  "Free Fire",
  "PUBG",
];

export default function GameFilterDropdown() {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(gameOptions[0]);
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
    <div className="relative shrink-0" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex h-10 items-center gap-2 rounded-lg border border-border-default bg-bg-page px-3 text-sm text-text-subtle transition-colors hover:border-border-strong"
      >
        {selected}
        {/* eslint-disable-next-line @next/next/no-img-element -- static SVG icon, no benefit from next/image optimization */}
        <img
          src="/icons/lfg-chevron-down.svg"
          alt=""
          className={`size-3 transition-transform duration-150 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute right-0 top-[calc(100%+8px)] z-20 w-44 overflow-hidden rounded-xl border border-white/10 bg-bg-card-alt py-1.5 shadow-xl shadow-black/40"
        >
          {gameOptions.map((game) => {
            const isSelected = game === selected;
            return (
              <button
                key={game}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  setSelected(game);
                  setOpen(false);
                }}
                className={`flex w-full items-center px-3.5 py-2 text-left text-sm transition-colors hover:bg-white/5 ${
                  isSelected ? "font-semibold text-brand" : "text-white/80"
                }`}
              >
                {game}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
