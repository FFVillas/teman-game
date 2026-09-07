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
      <main className="flex h-[calc(100vh-60px)] flex-col items-center px-6 pb-12 pt-4">
        <div className="mx-auto w-full max-w-[1000px]">
          {/* Returns to the page you were on before opening Social — not to
              the previous Social sub-page. See lib/section-origin.ts. */}
          <SocialBackLink />
        </div>
        <div className="mt-3 flex min-h-0 w-full max-w-[1000px] flex-1 overflow-hidden rounded-2xl border border-border-default bg-bg-card-alt">
          <SocialSidebar />
          {children}
        </div>
      </main>
      <Footer />
    </>
  );
}
