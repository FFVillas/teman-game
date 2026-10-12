import type { Metadata } from "next";
import { Suspense } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BackLink from "@/components/BackLink";
import MessagesView from "@/components/messages/MessagesView";

export const metadata: Metadata = {
  title: "Messages — TemanGame",
  description: "Direct messages with your friends and teammates.",
};

export default function MessagesPage() {
  return (
    <>
      <Navbar />
      {/* dvh, not vh: `vh` includes the strip a mobile browser's URL bar
          covers, which pushed the composer off the bottom of the screen. */}
      <main className="flex h-[calc(100dvh-60px)] flex-col items-center py-4 sm:py-8">
        <div className="mx-auto flex w-full max-w-[1000px] flex-1 flex-col gap-3 px-4 sm:px-6">
          {/* Reachable from the chat icon on any page, so "back" should
              return there rather than to a fixed destination. */}
          <BackLink label="Back" href="/lfg/valorant" useHistory />
          <div className="flex min-h-0 flex-1 overflow-hidden rounded-2xl border border-border-default bg-bg-card-alt">
            <Suspense fallback={null}>
              <MessagesView />
            </Suspense>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
