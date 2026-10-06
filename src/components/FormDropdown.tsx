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
  /**
   * "sm" matches the compact profile form; "md" matches the auth/onboarding
   * fields (AuthField); "bar" matches the LFG search bar (h-10, dark well).
   * Each lines up with the controls around it on its own screen.
   */
  size?: "sm" | "md" | "bar";
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
  size = "sm",
}: FormDropdownProps) {
  const buttonSize =
    size === "md"
      ? "px-4 py-3 text-sm"
      : size === "bar"
        ? "h-10 px-3 text-sm"
        : "px-3 py-2.5 text-xs";
  // Rows are tall and roomy on purpose: a menu this size is something you
  // scan and tap, and the check on the right needs a little breathing space.
  const itemSize = size === "sm" ? "px-3 py-2.5 text-xs" : "px-3.5 py-3 text-sm";
  const estimatedRowHeight = size === "sm" ? 38 : 46;
  const buttonBackground = size === "bar" ? "bg-[#0e1015]" : "bg-bg-page";
  const idleBorder =
    size === "bar"
      ? "border-white/10 focus:ring-brand"
      : "border-border-strong focus:ring-brand";
  const [open, setOpen] = useState(false);
  // Opens upward when there isn't room below (a field near the bottom of the
  // page would otherwise have its menu cut off).
  const [openUp, setOpenUp] = useState(false);
  // The menu shrinks to the room it actually has, so on a short window it
  // never runs off the screen.
  const [menuMaxHeight, setMenuMaxHeight] = useState(320);
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

    const rect = rootRef.current?.getBoundingClientRect();
    if (rect) {
      // The menu is at most 20rem (320px) tall, or shorter for a short list.
      const menuHeight = Math.min(320, items.length * estimatedRowHeight + 12);
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      // Down unless it doesn't fit there and there's more room above.
      const goUp = spaceBelow < menuHeight + 8 && spaceAbove >= spaceBelow;
      setOpenUp(goUp);
      // 6px gap to the field plus a margin to the window edge, but never
      // smaller than a few rows so the list stays usable.
      const room = (goUp ? spaceAbove : spaceBelow) - 20;
      setMenuMaxHeight(Math.round(Math.min(320, Math.max(140, room))));
    }
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
        className={`flex w-full items-center justify-between gap-2 rounded-lg border ${buttonBackground} ${buttonSize} text-left focus:outline-none focus:ring-1 disabled:cursor-not-allowed disabled:opacity-50 ${
          invalid ? "border-danger focus:ring-danger" : idleBorder
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
          style={{ maxHeight: menuMaxHeight }}
          className={`dropdown-scroll absolute left-0 z-20 min-w-full overflow-y-auto overscroll-contain rounded-xl border border-border-strong bg-bg-page p-1.5 shadow-xl shadow-black/40 ${
            openUp ? "bottom-[calc(100%+6px)]" : "top-[calc(100%+6px)]"
          }`}
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
                className={`flex w-full items-center justify-between gap-3 whitespace-nowrap rounded-lg ${itemSize} text-left font-semibold transition-colors ${
                  index === highlighted ? "bg-white/[0.07]" : ""
                } ${
                  isSelected
                    ? "text-white"
                    : item.value === ""
                      ? "text-text-muted"
                      : "text-white/80"
                }`}
              >
                <span>{item.label}</span>
                {isSelected && (
                  <svg
                    viewBox="0 0 20 20"
                    aria-hidden="true"
                    className="size-4 shrink-0 text-brand"
                  >
                    <path
                      d="M5 10.5l3.5 3.5L15 7"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
