import type { Metadata } from "next";
import Link from "next/link";
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
      footer={
        <>
          Don&apos;t have an account?{" "}
          <Link
            href="/signup"
            className="font-semibold text-brand transition-opacity hover:opacity-80"
          >
            Sign up
          </Link>
        </>
      }
    >
      <LoginForm />
    </AuthShell>
  );
}
