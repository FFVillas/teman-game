import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SocialSidebar from "@/components/social/SocialSidebar";
import SocialBackLink from "@/components/social/SocialBackLink";

export default function SocialLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Navbar />
      {/* dvh, not vh: on mobile Safari/Chrome `vh` counts the area the URL bar
          covers, so the composer at the bottom of a thread sat off-screen. */}
      <main className="flex h-[calc(100dvh-60px)] flex-col items-center px-4 pb-6 pt-4 sm:px-6 sm:pb-12">
        <div className="mx-auto w-full max-w-[1000px]">
          {/* Returns to the page you were on before opening Social — not to
              the previous Social sub-page. See lib/section-origin.ts. */}
          <SocialBackLink />
        </div>
        {/* Column on a phone (strip on top, panel below), row from sm up. */}
        <div className="mt-3 flex min-h-0 w-full max-w-[1000px] flex-1 flex-col overflow-hidden rounded-2xl border border-border-default bg-bg-card-alt sm:flex-row">
          <SocialSidebar />
          {children}
        </div>
      </main>
      <Footer />
    </>
  );
}
