import type { Metadata } from "next";
import AuthShell from "@/components/auth/AuthShell";
import ResetPasswordForm from "@/components/auth/ResetPasswordForm";
import { loginPanel } from "@/data/auth";

export const metadata: Metadata = {
  title: "Choose a new password — TemanGame",
  robots: { index: false, follow: false },
};

export default function ResetPasswordPage() {
  return (
    <AuthShell
      panel={loginPanel}
      title="Choose a new password"
      subtitle="Pick something you don't use anywhere else."
      panelVariant="glass-left"
    >
      <ResetPasswordForm />
    </AuthShell>
  );
}
