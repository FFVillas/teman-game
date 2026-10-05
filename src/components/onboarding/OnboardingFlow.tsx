"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Logo from "@/components/Logo";
import { sanitizeNextPath } from "@/lib/auth-redirect";
import { useNotifications } from "@/contexts/NotificationContext";
import { createClient } from "@/lib/supabase/client";
import { saveDateOfBirth } from "@/lib/profiles";
import { saveUserGames, type UserGame } from "@/lib/user-games";
import { gameByName } from "@/data/games";
import {
  DEFAULT_TIMEZONE,
  MAX_PERSONALITY_TAGS,
} from "@/data/profile-options";
import { emptyDateParts, joinDate } from "@/lib/age";
import { validateDossier } from "@/components/profile/DossierFields";
import GamesStep from "./GamesStep";
import AboutYouStep, { type AboutYou } from "./AboutYouStep";
import RankRoleStep, {
  emptyGameProfile,
  type GameProfile,
} from "./RankRoleStep";
import PlaystyleStep from "./PlaystyleStep";
import ConnectStep, { type ConnectedProvider } from "./ConnectStep";

type StepId = "games" | "rank" | "about" | "playstyle" | "connect";

const STEP_LABEL: Record<StepId, string> = {
  games: "Games",
  rank: "Rank & role",
  about: "About you",
  playstyle: "Playstyle",
  connect: "Accounts",
};

const emptyAboutYou: AboutYou = {
  dobParts: emptyDateParts,
  gender: "",
  languages: [],
  schedule: { days: [], start: "", end: "", timezone: DEFAULT_TIMEZONE },
};

export default function OnboardingFlow() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useNotifications();
  const destination = sanitizeNextPath(searchParams.get("next"));

  const [selectedGames, setSelectedGames] = useState<string[]>([]);
  const [gameDetails, setGameDetails] = useState<Record<string, GameProfile>>({});
  const [about, setAbout] = useState<AboutYou>(emptyAboutYou);
  const [aboutErrors, setAboutErrors] = useState<{
    dateOfBirth?: string;
    schedule?: string;
  }>({});
  const [playstyle, setPlaystyle] = useState(3);
  const [personalityTags, setPersonalityTags] = useState<string[]>([]);
  const [connected, setConnected] = useState<Set<ConnectedProvider>>(new Set());
  const [stepIndex, setStepIndex] = useState(0);

  // "rank" only makes sense once at least one game is picked — skipped
  // entirely (not shown as an empty step) when selectedGames is empty.
  const steps: StepId[] = useMemo(
    () =>
      selectedGames.length > 0
        ? ["games", "rank", "about", "playstyle", "connect"]
        : ["games", "about", "playstyle", "connect"],
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

  function updateAbout(patch: Partial<AboutYou>) {
    setAboutErrors({});
    setAbout((prev) => ({ ...prev, ...patch }));
  }

  function toggleTag(tag: string) {
    setPersonalityTags((prev) => {
      if (prev.includes(tag)) return prev.filter((t) => t !== tag);
      // At the cap, further picks are ignored — PlaystyleStep says so and
      // dims the remaining tags.
      if (prev.length >= MAX_PERSONALITY_TAGS) return prev;
      return [...prev, tag];
    });
  }

  function toggleProvider(provider: ConnectedProvider) {
    setConnected((prev) => {
      const next = new Set(prev);
      if (next.has(provider)) next.delete(provider);
      else next.add(provider);
      return next;
    });
  }

  async function finish() {
    // `connected` still has nowhere to go — connected_accounts doesn't
    // exist yet (see docs/thesis-spec.md). Everything else has a real
    // column now, including the games (user_game_mapping).
    const supabase = createClient();
    const { data } = await supabase.auth.getUser();
    if (data.user) {
      const hasSchedule =
        about.schedule.days.length > 0 || Boolean(about.schedule.start);

      await supabase
        .from("profiles")
        .update({
          playstyle,
          personality_tags: personalityTags,
          gender: about.gender || null,
          languages: about.languages,
          play_days: about.schedule.days,
          play_start: about.schedule.start || null,
          play_end: about.schedule.end || null,
          // Only recorded once there's a schedule, so the default offset
          // isn't stored as if it had been chosen.
          timezone: hasSchedule ? about.schedule.timezone : null,
        })
        .eq("id", data.user.id);

      // The games picked in step 1, with whatever rank/role was filled in
      // for each. Typed in by the player: nothing is read from the game.
      const chosenGames: UserGame[] = selectedGames
        .map((name) => {
          const game = gameByName(name);
          if (!game) return null;
          const details = gameDetails[name];
          return {
            slug: game.slug,
            name: game.name,
            inGameName: details?.username ?? "",
            region: details?.region ?? "",
            rank: details?.rank ?? "",
            roles: (details?.role ?? "")
              .split(",")
              .map((role) => role.trim())
              .filter(Boolean)
              .slice(0, 6),
          };
        })
        .filter((game): game is UserGame => game !== null);

      if (chosenGames.length > 0) {
        await saveUserGames(supabase, data.user.id, chosenGames, []);
      }

      // Private, so it lives in its own table (see the dossier migration).
      // Skipped entirely when the step was left blank.
      const dateOfBirth = joinDate(about.dobParts);
      if (dateOfBirth) {
        const dobError = await saveDateOfBirth(
          supabase,
          data.user.id,
          dateOfBirth
        );
        // Onboarding is skippable, so a failure here shouldn't trap anyone
        // on the step — it's reported and the rest of the profile is saved.
        if (dobError) {
          setAboutErrors({ dateOfBirth: dobError });
          setStepIndex(steps.indexOf("about"));
          return;
        }
      }
    }

    toast({
      tone: "success",
      title: "You're all set",
      body: "Your profile is saved — playstyle, personality and schedule are what lobby matching looks at first. Game and rank sync comes with lobbies.",
    });
    router.push(destination);
  }

  function handleContinue() {
    // Partial dates and a half-filled play window would both be rejected by
    // the database, so they're caught here with a readable message.
    if (step === "about" || isLastStep) {
      const found = validateDossier({
        dobParts: about.dobParts,
        schedule: about.schedule,
      });
      if (found.dateOfBirth || found.schedule) {
        setAboutErrors(found);
        // Skipping ahead from a later step shouldn't silently drop the fix.
        if (step !== "about") setStepIndex(steps.indexOf("about"));
        return;
      }
    }

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
          {step === "about" && (
            <AboutYouStep
              value={about}
              onChange={updateAbout}
              errors={aboutErrors}
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
