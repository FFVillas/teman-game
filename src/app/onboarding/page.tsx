import type { Metadata } from "next";
import { Suspense } from "react";
import OnboardingFlow from "@/components/onboarding/OnboardingFlow";

export const metadata: Metadata = {
  title: "Set up your profile — TemanGame",
  description: "Pick your games, rank, and playstyle so lobbies can find you.",
};

export default function OnboardingPage() {
  return (
    <Suspense fallback={null}>
      <OnboardingFlow />
    </Suspense>
  );
}
