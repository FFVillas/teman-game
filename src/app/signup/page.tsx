import type { Metadata } from "next";
import Link from "next/link";
import AuthShell from "@/components/auth/AuthShell";
import SignupForm from "@/components/auth/SignupForm";
import { signupPanel } from "@/data/auth";

export const metadata: Metadata = {
  title: "Sign up — TemanGame",
  description:
    "Create a TemanGame account to build teams by rank, role, and playstyle, and play with teammates whose behavior record you can see up front.",
};

export default function SignupPage() {
  return (
    <AuthShell
      panel={signupPanel}
      title="Sign up account"
      subtitle="Enter your details to create your account."
      footer={
        <>
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-semibold text-brand transition-opacity hover:opacity-80"
          >
            Log in
          </Link>
        </>
      }
    >
      <SignupForm />
    </AuthShell>
  );
}
