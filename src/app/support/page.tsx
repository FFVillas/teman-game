import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BackLink from "@/components/BackLink";
import { LegalSection as Section } from "@/components/legal/LegalDoc";

export const metadata: Metadata = {
  title: "Support — TemanGame",
  description: "Answers to common questions, and how to reach us.",
};

function Faq({ q, children }: { q: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <h3 className="text-sm font-bold text-white sm:text-base">{q}</h3>
      <p className="text-sm leading-relaxed text-text-subtle sm:text-[15px]">
        {children}
      </p>
    </div>
  );
}

export default function SupportPage() {
  return (
    <>
      <Navbar />
      <main className="flex flex-1 flex-col">
        <div className="mx-auto flex w-full max-w-[760px] flex-col px-6 py-12">
          <BackLink label="Back" href="/" useHistory />

          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
              Support
            </h1>
            <p className="text-xs text-text-muted">
              Last updated October 7, 2026
            </p>
          </div>

          <p className="mt-6 text-sm leading-relaxed text-text-subtle sm:text-[15px]">
            Answers to the questions we hear most. Can&apos;t find what
            you&apos;re looking for? Reach out to us directly below.
          </p>

          <div className="mt-12 flex flex-col gap-10">
            <Section title="Account & Profile">
              <Faq q="How do I set up my games and ranks?">
                During onboarding, or anytime after from{" "}
                <span className="font-semibold text-white">
                  Profile → Edit → Games
                </span>
                . You can add several games, and pick a rank and role for
                each one.
              </Faq>
              <Faq q="How do I change my profile picture?">
                From{" "}
                <span className="font-semibold text-white">
                  Profile → Edit
                </span>
                , upload a new photo and crop it to a square. The old one is
                removed automatically.
              </Faq>
              <Faq q="Can other players see my date of birth?">
                No. Your date of birth is private, only you can see it.
                Other players only see the age it works out to.
              </Faq>
            </Section>

            <Section title="Lobbies & Teammates">
              <Faq q="How does TemanGame recommend teammates?">
                By comparing rank, role, schedule and playstyle against what
                a lobby is looking for, so the people you see first are the
                ones most likely to be a good fit.
              </Faq>
              <Faq q="Can I be in more than one lobby at once?">
                You can only be in one live lobby at a time, but you can hold
                several scheduled ones for later.
              </Faq>
              <Faq q="What happens when a lobby ends?">
                You&apos;re asked to rate your teammates. It&apos;s optional
                in the moment, you can still rate them later from your match
                history.
              </Faq>
            </Section>

            <Section title="Friends">
              <Faq q="How do I add a friend?">
                Find them under{" "}
                <span className="font-semibold text-white">
                  Social → Discover Players
                </span>{" "}
                and send a request. They&apos;ll get a notification and can
                accept it from{" "}
                <span className="font-semibold text-white">
                  Social → Pending Requests
                </span>
                .
              </Faq>
              <Faq q="How do I block someone?">
                Use the block button next to their name in your Friends or
                Discover list. They won&apos;t be told they&apos;ve been
                blocked.
              </Faq>
            </Section>

            <Section title="Safety & Reports">
              <Faq q="How do I report a player?">
                Open their profile and use the Report button. You can also
                report a teammate right after a lobby ends.
              </Faq>
              <Faq q="Will the player know I reported them?">
                No. They&apos;ll see which rule they&apos;re accused of
                breaking if action is taken, but never who reported them.
              </Faq>
              <Faq q="I think my account was sanctioned unfairly. What do I do?">
                Reach out to us through the contact details below with your
                username and we&apos;ll take a look.
              </Faq>
            </Section>

            <Section title="Contact Us">
              <p>
                Still need help? Reach us directly, we&apos;re happy to
                sort it out.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <a
                  href="mailto:TemanGame3@gmail.com"
                  className="flex flex-1 items-center gap-3 rounded-xl border border-border-default bg-bg-page px-4 py-3.5 transition-colors hover:border-border-strong"
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand/15">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                      <path
                        d="M2 4.5C2 3.67157 2.67157 3 3.5 3H12.5C13.3284 3 14 3.67157 14 4.5V11.5C14 12.3284 13.3284 13 12.5 13H3.5C2.67157 13 2 12.3284 2 11.5V4.5Z"
                        stroke="currentColor"
                        className="text-brand"
                        strokeWidth="1.3"
                      />
                      <path
                        d="M2.5 4.5L8 8.5L13.5 4.5"
                        stroke="currentColor"
                        className="text-brand"
                        strokeWidth="1.3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                  <span className="flex flex-col">
                    <span className="text-xs font-bold text-white">Email</span>
                    <span className="text-[13px] text-text-muted">
                      TemanGame3@gmail.com
                    </span>
                  </span>
                </a>

                <a
                  href="https://discord.gg/sx8gWPsTC"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-1 items-center gap-3 rounded-xl border border-border-default bg-bg-page px-4 py-3.5 transition-colors hover:border-border-strong"
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-discord">
                    {/* eslint-disable-next-line @next/next/no-img-element -- static SVG icon, no benefit from next/image optimization */}
                    <img src="/icons/social-discord.svg" alt="" width={18} height={14} />
                  </span>
                  <span className="flex flex-col">
                    <span className="text-xs font-bold text-white">Discord</span>
                    <span className="text-[13px] text-text-muted">
                      Join our community server
                    </span>
                  </span>
                </a>
              </div>
            </Section>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
