"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { MIN_ADMIN_NOTE_LENGTH } from "@/data/admin-moderation";
import { adminButton, adminFieldClass } from "./AdminUi";

/**
 * Dialog frame for every moderation action. Same overlay/Escape/scroll-lock
 * behaviour as RequestToJoinModal, sized down for a single decision.
 */
export function AdminModal({
  title,
  description,
  onClose,
  children,
}: {
  title: string;
  description?: ReactNode;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
        className="flex max-h-[92vh] w-full max-w-[520px] flex-col gap-5 overflow-y-auto rounded-2xl border border-border-strong bg-bg-card-alt p-6"
      >
        <div className="flex flex-col gap-1.5">
          <h2 className="font-heading text-lg font-extrabold text-white">
            {title}
          </h2>
          {description && (
            <div className="text-xs leading-relaxed text-text-muted">
              {description}
            </div>
          )}
        </div>
        {children}
      </div>
    </div>
  );
}

export function NoteField({
  label,
  value,
  onChange,
  placeholder,
  hint,
  showError,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  hint?: string;
  showError: boolean;
}) {
  const tooShort = value.trim().length < MIN_ADMIN_NOTE_LENGTH;
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[11px] font-bold uppercase tracking-widest text-text-muted">
        {label}
      </span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={3}
        className={`${adminFieldClass} resize-none py-2.5 leading-relaxed ${
          showError && tooShort ? "border-danger" : ""
        }`}
      />
      <span
        className={`text-[11px] ${showError && tooShort ? "text-danger" : "text-text-muted"}`}
      >
        {showError && tooShort
          ? `Write at least ${MIN_ADMIN_NOTE_LENGTH} characters so the decision can be understood later.`
          : hint}
      </span>
    </label>
  );
}

/**
 * One reason field + confirm. Used for dismissing a report, lifting a
 * sanction, closing a lobby and removing a member — every action that needs
 * a recorded "why" but no other input.
 */
export function ReasonModal({
  title,
  description,
  label = "Reason",
  placeholder,
  hint = "Saved to the audit log.",
  confirmLabel,
  tone = "primary",
  onConfirm,
  onClose,
}: {
  title: string;
  description?: ReactNode;
  label?: string;
  placeholder: string;
  hint?: string;
  confirmLabel: string;
  tone?: "primary" | "danger";
  onConfirm: (reason: string) => void;
  onClose: () => void;
}) {
  const [reason, setReason] = useState("");
  const [attempted, setAttempted] = useState(false);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setAttempted(true);
    if (reason.trim().length < MIN_ADMIN_NOTE_LENGTH) return;
    onConfirm(reason.trim());
  }

  return (
    <AdminModal title={title} description={description} onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
        <NoteField
          label={label}
          value={reason}
          onChange={setReason}
          placeholder={placeholder}
          hint={hint}
          showError={attempted}
        />
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className={adminButton.secondary}>
            Cancel
          </button>
          <button
            type="submit"
            className={tone === "danger" ? adminButton.danger : adminButton.primary}
          >
            {confirmLabel}
          </button>
        </div>
      </form>
    </AdminModal>
  );
}
