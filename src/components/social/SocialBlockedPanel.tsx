export default function SocialBlockedPanel() {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <div className="flex items-center gap-2 border-b border-border-default px-6 py-4">
        {/* eslint-disable-next-line @next/next/no-img-element -- static SVG icon, no benefit from next/image optimization */}
        <img src="/icons/social-blocked.svg" alt="" className="h-auto w-4 opacity-70" />
        <span className="text-base font-bold text-white">Blocked</span>
      </div>

      <div className="px-6 pb-2 pt-4">
        <p className="text-sm text-text-muted">
          Players you&apos;ve blocked can&apos;t message you or see your
          lobbies.
        </p>
      </div>

      <div className="flex flex-1 items-center justify-center py-16 text-sm text-text-muted">
        No blocked players.
      </div>
    </div>
  );
}
