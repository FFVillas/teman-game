"use client";

import { createClient } from "@/lib/supabase/client";
import { usePush } from "@/lib/push";

/**
 * The body of the "Notifications" card in Settings: push on this device.
 * Push is per device (each phone or browser asks for its own permission),
 * so the wording says "this device" throughout.
 */
export default function PushSettingsCard() {
  const { state, busy, error, turnOn, turnOff } = usePush(createClient);

  return (
    <div className="flex flex-col gap-3">
      {state === "on" && (
        <>
          <p className="flex items-center gap-2 text-xs text-success">
            <span className="size-1.5 rounded-full bg-success" />
            On for this device
          </p>
          <button
            type="button"
            disabled={busy}
            onClick={turnOff}
            className="flex h-10 items-center justify-center rounded-lg border border-border-strong text-xs font-semibold text-text-subtle transition-colors hover:text-white disabled:opacity-60"
          >
            {busy ? "Turning off…" : "Turn off on this device"}
          </button>
        </>
      )}

      {state === "off" && (
        <button
          type="button"
          disabled={busy}
          onClick={turnOn}
          className="flex h-10 items-center justify-center rounded-lg bg-brand text-xs font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {busy ? "Turning on…" : "Turn on for this device"}
        </button>
      )}

      {state === "denied" && (
        <p className="text-[11px] leading-relaxed text-text-muted">
          Notifications are blocked for TemanGame in this browser. Allow them in
          the site settings (the icon left of the address), then reload.
        </p>
      )}

      {state === "needs-install" && (
        <p className="text-[11px] leading-relaxed text-text-muted">
          On iPhone and iPad, notifications work in the installed app. Add
          TemanGame to your home screen (see App above), open it from there,
          and turn them on here.
        </p>
      )}

      {state === "unsupported" && (
        <p className="text-[11px] leading-relaxed text-text-muted">
          This browser can&apos;t receive notifications from TemanGame. Try
          Chrome or Edge, or the installed app on your phone.
        </p>
      )}

      {error && <p className="text-[11px] text-danger">{error}</p>}
    </div>
  );
}
