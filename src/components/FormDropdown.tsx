"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";

export interface DropdownOption {
  value: string;
  label: string;
}

interface FormDropdownProps {
  options: DropdownOption[];
  value: string;
  onChange: (value: string) => void;
  /** Accessible name — there is no visible <label> tied to the button. */
  label: string;
  /** Shown while nothing is selected, and as the "clear" entry in the list. */
  placeholder?: string;
  /** Offer the placeholder as a pickable entry so a value can be cleared. */
  allowEmpty?: boolean;
  invalid?: boolean;
  disabled?: boolean;
}

/**
 * A form field that behaves like a <select> but draws its own menu. The
 * native popup can't be capped in height (a 38-item list fills the screen)
 * and takes its text size from the browser, so it stops matching the field
 * as soon as the page is zoomed. Same anchored-dropdown shape as
 * SortDropdown: relative wrapper, outside-click close, absolute panel.
 */
export default function FormDropdown({
  options,
  value,
  onChange,
  label,
  placeholder,
  allowEmpty = true,
  invalid,
  disabled,
}: FormDropdownProps) {
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const listId = useId();

  const items: DropdownOption[] =
    placeholder && allowEmpty
      ? [{ value: "", label: placeholder }, ...options]
      : options;
  const selected = options.find((option) => option.value === value);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Keep the highlighted row (initially the selected one) in view inside the
  // scrolling panel, without scrolling the page itself.
  useEffect(() => {
    if (open) itemRefs.current[highlighted]?.scrollIntoView({ block: "nearest" });
  }, [open, highlighted]);

  function openMenu() {
    const selectedIndex = items.findIndex((item) => item.value === value);
    setHighlighted(selectedIndex >= 0 ? selectedIndex : 0);
    setOpen(true);
  }

  function choose(next: string) {
    onChange(next);
    setOpen(false);
    buttonRef.current?.focus();
  }

  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === "Escape") {
      setOpen(false);
      return;
    }
    if (event.key === "Tab") {
      setOpen(false);
      return;
    }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) {
        openMenu();
        return;
      }
      const step = event.key === "ArrowDown" ? 1 : -1;
      setHighlighted((index) => Math.min(items.length - 1, Math.max(0, index + step)));
      return;
    }
    if ((event.key === "Enter" || event.key === " ") && open) {
      event.preventDefault();
      choose(items[highlighted].value);
    }
  }

  return (
    <div className="relative" ref={rootRef} onKeyDown={handleKeyDown}>
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : openMenu())}
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        className={`flex w-full items-center justify-between gap-2 rounded-lg border bg-bg-page px-3 py-2.5 text-left text-xs focus:outline-none focus:ring-1 disabled:cursor-not-allowed disabled:opacity-50 ${
          invalid
            ? "border-danger focus:ring-danger"
            : "border-border-strong focus:ring-brand"
        }`}
      >
        <span
          className={`truncate ${selected ? "text-white" : "text-text-muted"}`}
        >
          {selected?.label ?? placeholder ?? ""}
        </span>
        {/* eslint-disable-next-line @next/next/no-img-element -- static SVG icon, no benefit from next/image optimization */}
        <img
          src="/icons/lfg-select-chevron.svg"
          alt=""
          className={`size-3.5 shrink-0 opacity-50 transition-transform duration-150 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div
          id={listId}
          role="listbox"
          aria-label={label}
          className="absolute left-0 top-[calc(100%+6px)] z-20 max-h-56 min-w-full overflow-y-auto overscroll-contain rounded-xl border border-white/10 bg-bg-card-alt py-1.5 shadow-xl shadow-black/40"
        >
          {items.map((item, index) => {
            const isSelected = item.value === value && (item.value !== "" || !selected);
            return (
              <button
                key={item.value || "__empty"}
                ref={(node) => {
                  itemRefs.current[index] = node;
                }}
                type="button"
                role="option"
                aria-selected={isSelected}
                tabIndex={-1}
                onClick={() => choose(item.value)}
                onMouseEnter={() => setHighlighted(index)}
                className={`flex w-full items-center whitespace-nowrap px-3 py-2 text-left text-xs transition-colors ${
                  index === highlighted ? "bg-white/5" : ""
                } ${
                  isSelected
                    ? "font-semibold text-brand"
                    : item.value === ""
                      ? "text-text-muted"
                      : "text-white/80"
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
