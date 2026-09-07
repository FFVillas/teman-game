"use client";

import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { finalCta } from "@/data/landing";

export default function FinalCta() {
  const { user } = useAuth();

  // Signed in, "Create an account" is nonsense — so the browse action takes
  // over as the primary button and the copy stops pitching signup.
  const isSignedIn = Boolean(user);

  return (
    <section className="px-6 pb-24 pt-8">
      <div className="auth-panel-gradient mx-auto flex max-w-[1000px] flex-col items-center gap-5 overflow-hidden rounded-2xl border border-border-strong p-10 text-center sm:p-14">
        <h2 className="max-w-[520px] text-2xl font-extrabold leading-tight tracking-[-0.8px] text-white sm:text-3xl">
          {isSignedIn ? finalCta.signedInTitle : finalCta.title}
        </h2>
        <p className="max-w-[440px] text-sm leading-relaxed text-white/60">
          {isSignedIn ? finalCta.signedInDescription : finalCta.description}
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          {!isSignedIn && (
            <Link
              href={finalCta.primaryCta.href}
              className="flex h-11 items-center justify-center rounded-lg bg-brand px-7 text-sm font-bold text-white transition-opacity hover:opacity-90"
            >
              {finalCta.primaryCta.label}
            </Link>
          )}
          <Link
            href={finalCta.secondaryCta.href}
            className={
              isSignedIn
                ? "flex h-11 items-center justify-center rounded-lg bg-brand px-7 text-sm font-bold text-white transition-opacity hover:opacity-90"
                : "flex h-11 items-center justify-center rounded-lg border border-white/20 px-7 text-sm font-semibold text-white transition-colors hover:bg-white/5"
            }
          >
            {finalCta.secondaryCta.label}
          </Link>
        </div>
      </div>
    </section>
  );
}
