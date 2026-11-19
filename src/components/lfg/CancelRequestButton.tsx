"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { leaveLobby } from "@/lib/lobbies";
import { useNotifications } from "@/contexts/NotificationContext";

/**
 * Takes back a join request straight from the LFG card. Two taps (Cancel,
 * then Sure?) so a stray click doesn't withdraw it; the lobby page's
 * "Withdraw application" does the same thing.
 */
export default function CancelRequestButton({ lobbyId }: { lobbyId: string }) {
  const router = useRouter();
  const { toast } = useNotifications();
  const [step, setStep] = useState<"idle" | "confirm" | "busy">("idle");

  async function handleClick() {
    if (step === "idle") {
      setStep("confirm");
      // Back to plain "Cancel" if they don't follow through.
      setTimeout(() => setStep((current) => (current === "confirm" ? "idle" : current)), 4000);
      return;
    }
    if (step !== "confirm") return;
    setStep("busy");
    const failure = await leaveLobby(createClient(), lobbyId);
    if (failure) {
      setStep("idle");
      toast({ tone: "danger", title: "Couldn't cancel the request", body: failure });
      return;
    }
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={step === "busy"}
      title="Take back your request to join"
      className={`flex h-6 items-center justify-center rounded-md border px-2 text-xs font-bold transition-colors disabled:opacity-60 ${
        step === "confirm"
          ? "border-danger bg-danger/15 text-danger"
          : "border-white/15 text-text-muted hover:border-danger hover:text-danger"
      }`}
    >
      {step === "confirm" ? "Sure?" : step === "busy" ? "…" : "Cancel"}
    </button>
  );
}
