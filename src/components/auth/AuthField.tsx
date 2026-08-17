"use client";

import { useId, useState } from "react";
import { fieldBaseClass, fieldStateClass, fieldLabelClass } from "./fieldStyles";

interface AuthFieldProps {
  label: string;
  type?: "text" | "email" | "password";
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoComplete?: string;
  /** Rendered to the right of the label, e.g. a "Forgot password?" link. */
  action?: React.ReactNode;
  hint?: string;
  error?: string;
}

export default function AuthField({
  label,
  type = "text",
  value,
  onChange,
  placeholder,
  autoComplete,
  action,
  hint,
  error,
}: AuthFieldProps) {
  const id = useId();
  const [revealed, setRevealed] = useState(false);

  const isPassword = type === "password";
  const inputType = isPassword && revealed ? "text" : type;
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <label htmlFor={id} className={fieldLabelClass}>
          {label}
        </label>
        {action}
      </div>

      <div className="relative">
        <input
          id={id}
          type={inputType}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={[
            fieldBaseClass,
            fieldStateClass(Boolean(error)),
            isPassword ? "pr-11" : "",
          ].join(" ")}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setRevealed((shown) => !shown)}
            aria-label={revealed ? "Hide password" : "Show password"}
            className="absolute right-3 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center rounded transition-opacity hover:opacity-70"
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- static SVG icon, no benefit from next/image optimization */}
            <img
              src={revealed ? "/icons/auth-eye-off.svg" : "/icons/auth-eye.svg"}
              alt=""
              className="size-4"
            />
          </button>
        )}
      </div>

      {error ? (
        <p id={`${id}-error`} className="text-xs text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-xs text-text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
