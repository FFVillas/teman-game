import type { Metadata } from "next";
import { Suspense } from "react";
import AuthShell from "@/components/auth/AuthShell";
import LoginForm from "@/components/auth/LoginForm";
import { loginPanel } from "@/data/auth";

export const metadata: Metadata = {
  title: "Log in — TemanGame",
  description:
    "Log in to TemanGame to find teammates by rank, role, and playstyle — backed by a reputation system you can actually check.",
};

export default function LoginPage() {
  return (
    <AuthShell
      panel={loginPanel}
      title="Log in account"
      subtitle="Enter your details to get back to your teams."
      panelVariant="glass-left"
    >
      {/* LoginForm reads ?next= via useSearchParams, which needs a boundary
          for the page to stay statically prerendered. */}
      <Suspense fallback={<div className="h-[320px]" />}>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}
