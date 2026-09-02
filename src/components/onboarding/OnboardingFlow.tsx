"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Logo from "@/components/Logo";
import { sanitizeNextPath } from "@/lib/auth-redirect";
import GamesStep from "./GamesStep";
import RankRoleStep, {
  emptyGameProfile,
  type GameProfile,
} from "./RankRoleStep";
import PlaystyleStep from "./PlaystyleStep";
import ConnectStep, { type ConnectedProvider } from "./ConnectStep";

type StepId = "games" | "rank" | "playstyle" | "connect";

const STEP_LABEL: Record<StepId, string> = {
  games: "Games",
  rank: "Rank & role",
  playstyle: "Playstyle",
  connect: "Accounts",
};

export default function OnboardingFlow() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const destination = sanitizeNextPath(searchParams.get("next"));

  const [selectedGames, setSelectedGames] = useState<string[]>([]);
  const [gameDetails, setGameDetails] = useState<Record<string, GameProfile>>({});
  const [playstyle, setPlaystyle] = useState(3);
  const [personalityTags, setPersonalityTags] = useState<string[]>([]);
  const [connected, setConnected] = useState<Set<ConnectedProvider>>(new Set());
  const [stepIndex, setStepIndex] = useState(0);

  // "rank" only makes sense once at least one game is picked — skipped
  // entirely (not shown as an empty step) when selectedGames is empty.
  const steps: StepId[] = useMemo(
    () =>
      selectedGames.length > 0
        ? ["games", "rank", "playstyle", "connect"]
        : ["games", "playstyle", "connect"],
    [selectedGames.length],
  );
  const step = steps[stepIndex];
  const isLastStep = stepIndex === steps.length - 1;

  function toggleGame(game: string) {
    setSelectedGames((prev) =>
      prev.includes(game) ? prev.filter((g) => g !== game) : [...prev, game],
    );
  }

  function updateGameProfile(
    game: string,
    patch: Partial<GameProfile> | ((current: GameProfile) => Partial<GameProfile>),
  ) {
    setGameDetails((prev) => {
      const current = { ...emptyGameProfile, ...prev[game] };
      const resolved = typeof patch === "function" ? patch(current) : patch;
      return { ...prev, [game]: { ...current, ...resolved } };
    });
  }

  function toggleTag(tag: string) {
    setPersonalityTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  }

  function toggleProvider(provider: ConnectedProvider) {
    setConnected((prev) => {
      const next = new Set(prev);
      if (next.has(provider)) next.delete(provider);
      else next.add(provider);
      return next;
    });
  }

  function finish() {
    // Frontend-only for now — nothing to persist yet. Once Supabase exists,
    // this is where selectedGames/gameDetails/playstyle/personalityTags/
    // connected get written to user_game_mapping + connected_accounts.
    router.push(destination);
  }

  function handleContinue() {
    if (isLastStep) {
      finish();
      return;
    }
    setStepIndex((i) => i + 1);
  }

  function handleBack() {
    setStepIndex((i) => Math.max(0, i - 1));
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center px-4 py-8 sm:px-6 sm:py-12">
      <div className="absolute left-4 top-4 sm:left-6 sm:top-6">
        <Logo />
      </div>

      <button
        type="button"
        onClick={finish}
        className="absolute right-4 top-4 text-xs font-semibold text-text-muted transition-colors hover:text-white sm:right-6 sm:top-6"
      >
        Skip for now
      </button>

      <div className="flex w-full max-w-[600px] flex-1 flex-col justify-center gap-6 py-16">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-1.5">
            {steps.map((id, index) => (
              <span
                key={id}
                className={`h-1 flex-1 rounded-full transition-colors ${
                  index <= stepIndex ? "bg-brand" : "bg-white/10"
                }`}
              />
            ))}
          </div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
            Step {stepIndex + 1} of {steps.length} · {STEP_LABEL[step]}
          </span>
        </div>

        <div className="rounded-2xl border border-border-strong bg-bg-card-alt p-6 sm:p-8">
          {step === "games" && (
            <GamesStep selected={selectedGames} onToggle={toggleGame} />
          )}
          {step === "rank" && (
            <RankRoleStep
              selectedGames={selectedGames}
              details={gameDetails}
              onUpdate={updateGameProfile}
            />
          )}
          {step === "playstyle" && (
            <PlaystyleStep
              playstyle={playstyle}
              onPlaystyleChange={setPlaystyle}
              tags={personalityTags}
              onToggleTag={toggleTag}
            />
          )}
          {step === "connect" && (
            <ConnectStep connected={connected} onToggle={toggleProvider} />
          )}

          <div className="mt-8 flex items-center justify-between border-t border-border-subtle pt-6">
            {stepIndex > 0 ? (
              <button
                type="button"
                onClick={handleBack}
                className="flex h-10 items-center justify-center rounded-lg border border-border-strong px-4 text-xs font-semibold text-text-subtle transition-colors hover:text-white"
              >
                Back
              </button>
            ) : (
              <span />
            )}

            <button
              type="button"
              onClick={handleContinue}
              className="flex h-10 items-center justify-center rounded-lg bg-brand px-6 text-xs font-bold text-white transition-opacity hover:opacity-90"
            >
              {isLastStep ? "Finish setup" : "Continue"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
