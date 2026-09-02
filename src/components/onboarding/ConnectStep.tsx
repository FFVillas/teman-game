"use client";

export type ConnectedProvider = "discord" | "steam" | "riot";

interface ConnectStepProps {
  connected: Set<ConnectedProvider>;
  onToggle: (provider: ConnectedProvider) => void;
}

const providers: {
  id: ConnectedProvider;
  label: string;
  caption: string;
  icon: string;
}[] = [
  {
    id: "discord",
    label: "Discord",
    caption: "Drop a voice link in your lobbies automatically.",
    icon: "/icons/social-discord.svg",
  },
  {
    id: "riot",
    label: "Riot Games",
    caption: "Keeps Valorant / LoL rank in sync once this is live.",
    icon: "/icons/player-riot.svg",
  },
  {
    id: "steam",
    label: "Steam",
    caption: "Shows on your profile for CS2 teammates.",
    icon: "/icons/player-steam.svg",
  },
];

export default function ConnectStep({ connected, onToggle }: ConnectStepProps) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-bold text-white">Connect your accounts</h2>
        <p className="text-sm text-text-muted">
          Optional — these aren&apos;t live yet, but connecting now means
          nothing to redo once they are.
        </p>
      </div>

      <div className="flex flex-col gap-2.5">
        {providers.map((provider) => {
          const isConnected = connected.has(provider.id);
          return (
            <button
              key={provider.id}
              type="button"
              onClick={() => onToggle(provider.id)}
              aria-pressed={isConnected}
              className={`flex items-center gap-3 rounded-xl border p-3.5 text-left transition-colors ${
                isConnected
                  ? "border-brand bg-brand/10"
                  : "border-border-strong hover:border-white/30"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- static SVG icon, no benefit from next/image optimization */}
              <img src={provider.icon} alt="" className="size-6 shrink-0" />
              <div className="flex flex-1 flex-col">
                <span className="text-sm font-bold text-white">
                  {provider.label}
                </span>
                <span className="text-xs text-text-muted">
                  {provider.caption}
                </span>
              </div>
              <span
                className={`shrink-0 rounded-md px-2.5 py-1 text-[11px] font-bold ${
                  isConnected
                    ? "bg-brand text-white"
                    : "border border-border-strong text-text-muted"
                }`}
              >
                {isConnected ? "Connected" : "Connect"}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
