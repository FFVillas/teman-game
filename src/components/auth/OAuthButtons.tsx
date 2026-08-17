"use client";

import { oauthProviders } from "@/data/auth";

export default function OAuthButtons({ verb }: { verb: string }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        {oauthProviders.map((provider) => (
          <button
            key={provider.id}
            type="button"
            // TODO: wire up to Supabase Auth signInWithOAuth once the backend exists.
            className="flex h-11 items-center justify-center gap-2.5 rounded-lg border border-border-strong bg-bg-page text-sm font-semibold text-text-subtle transition-colors hover:border-border-strong hover:bg-white/5 hover:text-white"
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- static SVG icon, no benefit from next/image optimization */}
            <img
              src={provider.icon}
              alt=""
              width={provider.iconWidth}
              height={provider.iconHeight}
            />
            {provider.label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <span className="h-px flex-1 bg-border-default" />
        <span className="text-[11px] uppercase tracking-wider text-text-muted">
          or {verb} with email
        </span>
        <span className="h-px flex-1 bg-border-default" />
      </div>
    </div>
  );
}
