/**
 * Shared between AuthField and AuthSelect so the two controls stay
 * visually identical.
 *
 * Border and ring colours are deliberately kept OUT of the base class and
 * returned separately: emitting both a default and an error colour onto
 * the same element lets stylesheet order pick the winner rather than the
 * call site.
 */
export const fieldBaseClass =
  "w-full rounded-lg border bg-bg-page px-4 py-3 text-sm text-white placeholder:text-text-muted focus:outline-none focus:ring-1";

export function fieldStateClass(hasError: boolean) {
  return hasError
    ? "border-danger focus:ring-danger"
    : "border-border-strong focus:ring-brand";
}

export const fieldLabelClass =
  "text-xs font-bold uppercase tracking-wider text-text-muted";
