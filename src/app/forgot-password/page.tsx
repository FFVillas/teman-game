import type { Metadata } from "next";
import AuthShell from "@/components/auth/AuthShell";
import ForgotPasswordForm from "@/components/auth/ForgotPasswordForm";
import { loginPanel } from "@/data/auth";

export const metadata: Metadata = {
  title: "Forgot password — TemanGame",
};

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      panel={loginPanel}
      title="Forgot your password?"
      subtitle="Enter your email and we'll send you a link to choose a new one."
      panelVariant="glass-left"
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}
