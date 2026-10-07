import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BackLink from "@/components/BackLink";
import {
  LegalBullet as Bullet,
  LegalSection as Section,
  LegalSubSection as SubSection,
} from "@/components/legal/LegalDoc";

export const metadata: Metadata = {
  title: "Terms of Service — TemanGame",
  description: "The rules for using TemanGame.",
};

export default function TermsOfServicePage() {
  return (
    <>
      <Navbar />
      <main className="flex flex-1 flex-col">
        <div className="mx-auto flex w-full max-w-[760px] flex-col px-6 py-12">
          <BackLink label="Back" href="/" useHistory />

          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
              Terms and Services
            </h1>
            <p className="text-xs text-text-muted">
              Last updated October 7, 2026
            </p>
          </div>

          <p className="mt-6 text-sm leading-relaxed text-text-subtle sm:text-[15px]">
            These Terms of Service govern your use of TemanGame, a
            looking-for-group platform that helps players find teammates by
            rank, role, schedule and playstyle, backed by a reputation
            system. By creating an account or using TemanGame, you agree to
            these terms.
          </p>

          <div className="mt-12 flex flex-col gap-10">
            <Section title="Your Account">
              <SubSection number={1} title="Eligibility">
                <p>
                  You must be at least 13 years old to use TemanGame. By
                  signing up, you confirm that you meet this requirement.
                </p>
              </SubSection>

              <SubSection number={2} title="Account responsibility">
                <ul className="flex list-disc flex-col gap-2.5 pl-5">
                  <Bullet label="One account per person">
                    Accounts are personal and not meant to be shared or
                    transferred.
                  </Bullet>
                  <Bullet label="Accurate information">
                    Keep your username, profile, and per-game details
                    honest. Rank and in-game names are self-reported and
                    used to match you with teammates, so misrepresenting
                    them undermines the system for everyone.
                  </Bullet>
                  <Bullet label="Account security">
                    You&apos;re responsible for activity that happens under
                    your account. Tell us if you believe it&apos;s been
                    compromised.
                  </Bullet>
                </ul>
              </SubSection>
            </Section>

            <Section title="Community Rules">
              <p>
                TemanGame exists to help players find teammates they can
                trust. To keep it that way, you agree not to:
              </p>
              <ul className="flex list-disc flex-col gap-2.5 pl-5">
                <Bullet label="Harass or abuse others">
                  No hate speech, threats, harassment, or targeted abuse of
                  other players, in lobby chat or anywhere else on the
                  platform.
                </Bullet>
                <Bullet label="Cheat or boost">
                  No cheating, account boosting, or falsifying your rank to
                  game the matching system.
                </Bullet>
                <Bullet label="Abuse reports">
                  No filing false or bad-faith reports against other
                  players.
                </Bullet>
                <Bullet label="Scam or spam">
                  No scamming, phishing, or spamming other players through
                  lobbies, chat, or your profile.
                </Bullet>
                <Bullet label="Misuse the platform">
                  No attempting to access another player&apos;s account, or
                  interfering with TemanGame&apos;s normal operation.
                </Bullet>
              </ul>
            </Section>

            <Section title="Content You Submit">
              <p>
                You keep ownership of the content you post on TemanGame,
                lobby chat messages, reviews, your profile bio and tags, and
                anything else you write. By posting it, you give us
                permission to store and display it as part of running
                TemanGame, for example showing your reviews on your profile
                or your messages to the other members of a lobby.
              </p>
              <p>
                You&apos;re responsible for what you post. Don&apos;t submit
                anything illegal, infringing, or that breaks the community
                rules above.
              </p>
            </Section>

            <Section title="Reputation, Reviews, and Reports">
              <p>
                After a lobby ends, teammates can rate and tag each other;
                these reviews build the reputation score shown on your
                profile. Players can also report behavior that breaks our
                rules.
              </p>
              <ul className="flex list-disc flex-col gap-2.5 pl-5">
                <Bullet label="Reviews are honest feedback">
                  Rate and tag teammates based on how they actually played,
                  not to retaliate for an unrelated disagreement.
                </Bullet>
                <Bullet label="Reports stay confidential">
                  If you&apos;re reported, you&apos;ll see the rule you&apos;re
                  accused of breaking, never who reported you.
                </Bullet>
                <Bullet label="Your sanction history is yours to see">
                  If action is taken on your account, you can see that
                  history on your own profile.
                </Bullet>
              </ul>
            </Section>

            <Section title="Moderation and Enforcement">
              <p>
                If you break these terms or our community rules, we may take
                action depending on how serious and how frequent the
                behavior is:
              </p>
              <ul className="flex list-disc flex-col gap-2.5 pl-5">
                <Bullet label="Warning">
                  A notice on your account that a rule was broken.
                </Bullet>
                <Bullet label="Suspension">
                  Temporary loss of access to TemanGame for a set period.
                </Bullet>
                <Bullet label="Ban">
                  Permanent loss of access to TemanGame.
                </Bullet>
              </ul>
              <p>
                We review reports before acting on them, and a sanction
                always comes with a reason you can see on your profile.
              </p>
            </Section>

            <Section title="Ending Your Account">
              <p>
                You can stop using TemanGame anytime, and you can request
                deletion of your account and the data tied to it by reaching
                out through Support. We may suspend or terminate an account
                that seriously or repeatedly breaks these terms.
              </p>
            </Section>

            <Section title="Disclaimer">
              <p>
                TemanGame helps you find teammates. It&apos;s not responsible
                for how another player behaves in-game, in voice chat, or
                outside the platform once you&apos;ve teamed up. Use the same
                judgment you would meeting anyone online, and report behavior
                that breaks our rules so we can act on it.
              </p>
              <p>
                TemanGame is provided &quot;as is,&quot; without warranties of
                any kind. We don&apos;t guarantee uninterrupted access or that
                every match will be a good one.
              </p>
            </Section>

            <Section title="Changes to These Terms">
              <p>
                If we make a meaningful change to these terms, we&apos;ll
                update the date at the top of this page.
              </p>
            </Section>

            <Section title="Contact Us">
              <p>
                Questions about these terms? Reach out through the Support
                page.
              </p>
            </Section>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
