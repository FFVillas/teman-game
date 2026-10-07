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
  title: "Privacy Policy — TemanGame",
  description:
    "How TemanGame collects, uses, and protects your information.",
};

export default function PrivacyPolicyPage() {
  return (
    <>
      <Navbar />
      <main className="flex flex-1 flex-col">
        <div className="mx-auto flex w-full max-w-[760px] flex-col px-6 py-12">
          <BackLink label="Back" href="/" useHistory />

          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
              Privacy Policy
            </h1>
            <p className="text-xs text-text-muted">
              Last updated October 7, 2026
            </p>
          </div>

          <p className="mt-6 text-sm leading-relaxed text-text-subtle sm:text-[15px]">
            TemanGame is a looking-for-group platform that helps players find
            teammates by rank, role, schedule and playstyle, backed by a
            reputation system. This Privacy Policy explains what information
            we collect when you use TemanGame, how we use it, and the
            choices you have over it. By using TemanGame, you agree to the
            practices described here.
          </p>

          <div className="mt-12 flex flex-col gap-10">
            <Section title="Information We Collect">
              <p>
                We collect different types of information depending on how
                you use TemanGame.
              </p>

              <SubSection number={1} title="Information you provide to us">
                <ul className="flex list-disc flex-col gap-2.5 pl-5">
                  <Bullet label="Account information">
                    Your email address and password, collected through our
                    authentication provider when you sign up. Your password
                    is never stored or visible to us in plain text.
                  </Bullet>
                  <Bullet label="Profile information">
                    Username, profile picture, playstyle, personality tags,
                    gender, languages, and your usual play schedule, all
                    optional and all editable or removable anytime from your
                    profile.
                  </Bullet>
                  <Bullet label="Date of birth">
                    Collected only to confirm you meet our minimum age of 13
                    and to show your age on your profile. The date itself is
                    private: only you can see it. Other players see just the
                    age it works out to.
                  </Bullet>
                  <Bullet label="Per-game information">
                    For each game you add: your in-game name, region, and
                    rank, exactly as you enter them.
                  </Bullet>
                  <Bullet label="Content you create">
                    Lobby chat messages, reviews you leave for teammates, and
                    reports you file, stored so the people and systems
                    involved, like teammates and moderators, can act on them.
                  </Bullet>
                </ul>
              </SubSection>

              <SubSection number={2} title="Cookies">
                <p>
                  We use one cookie to keep you signed in between visits. We
                  don&apos;t use cookies for advertising or cross-site
                  tracking, and we don&apos;t share your activity with ad
                  networks.
                </p>
              </SubSection>
            </Section>

            <Section title="How We Use Your Information">
              <p>
                We use the information we collect to run TemanGame and keep
                it safe. Specifically:
              </p>
              <ul className="flex list-disc flex-col gap-2.5 pl-5">
                <Bullet label="Matchmaking">
                  To recommend teammates to you, and you to them, based on
                  rank, role, schedule and playstyle.
                </Bullet>
                <Bullet label="Your public profile">
                  To show your profile to other players so they can decide
                  whether to team up with you.
                </Bullet>
                <Bullet label="Running lobbies">
                  To keep chat, invites, join requests and the reputation
                  score built from reviews working the way you&apos;d expect.
                </Bullet>
                <Bullet label="Moderation">
                  To review reports and enforce our rules when a player
                  breaks them.
                </Bullet>
                <Bullet label="Account security">
                  To keep your account secure and sign you in across
                  sessions.
                </Bullet>
              </ul>
            </Section>

            <Section title="What Other Players Can See">
              <p>
                Your profile, including your username, avatar, playstyle,
                tags, reputation, age, languages, play schedule, and your
                per-game rank and in-game name, is visible to anyone, signed
                in or not, the
                same way a public player card on any LFG platform works. Your
                email, password, date of birth, and any reports filed
                against you are never shown to other players.
              </p>
            </Section>

            <Section title="How We Store and Protect Your Data">
              <p>
                Your data is stored with Supabase, our database and
                authentication provider, in a Singapore data center. Access
                to every table is restricted by row-level security policies.
                For example, only you can read your own private date of
                birth, and only moderators can see who reported you.
              </p>
            </Section>

            <Section title="Your Choices">
              <ul className="flex list-disc flex-col gap-2.5 pl-5">
                <Bullet label="Edit your profile">
                  Change or remove most of your profile information anytime
                  from Profile → Edit.
                </Bullet>
                <Bullet label="Change your picture">
                  Replace or remove your profile picture whenever you like.
                  The previous file is deleted when you do.
                </Bullet>
                <Bullet label="Delete your account">
                  Request deletion of your account and the data tied to it by
                  reaching out through Support.
                </Bullet>
              </ul>
            </Section>

            <Section title="Children's Privacy">
              <p>
                TemanGame is not intended for anyone under 13, and we
                don&apos;t knowingly collect information from children under
                that age.
              </p>
            </Section>

            <Section title="Changes to This Policy">
              <p>
                If we make a meaningful change to how we handle your
                information, we&apos;ll update the date at the top of this
                page.
              </p>
            </Section>

            <Section title="Contact Us">
              <p>
                Questions about this policy or your data? Reach out through
                the Support page.
              </p>
            </Section>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
