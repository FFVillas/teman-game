/**
 * "12m ago" / "3h ago" / "2d ago" — one wording for every timestamp the app
 * shows, so the notification list and the admin console can't drift apart.
 */
export function formatAgo(iso: string, now = Date.now()): string {
  const diff = now - new Date(iso).getTime();
  const future = diff < 0;
  const abs = Math.abs(diff);
  const minutes = Math.round(abs / 60_000);

  let label: string;
  if (minutes < 1) return "just now";
  if (minutes < 60) label = `${minutes}m`;
  else if (minutes < 60 * 24) label = `${Math.round(minutes / 60)}h`;
  else label = `${Math.round(minutes / (60 * 24))}d`;

  return future ? `in ${label}` : `${label} ago`;
}
