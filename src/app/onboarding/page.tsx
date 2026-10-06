import type { Metadata } from "next";
import { Suspense } from "react";
import OnboardingFlow from "@/components/onboarding/OnboardingFlow";
import { createClient } from "@/lib/supabase/server";
import { fetchGameCatalog } from "@/lib/games";

export const metadata: Metadata = {
  title: "Set up your profile — TemanGame",
  description: "Pick your games, rank, and playstyle so lobbies can find you.",
};

export default async function OnboardingPage() {
  // Games, ranks and roles come from the database, so the steps never offer
  // something that can't be saved.
  const catalog = await fetchGameCatalog(await createClient());

  return (
    <Suspense fallback={null}>
      <OnboardingFlow catalog={catalog} />
    </Suspense>
  );
}
