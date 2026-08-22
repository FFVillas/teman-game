import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SocialSidebar from "@/components/social/SocialSidebar";

export default function SocialLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Navbar />
      <main className="flex h-[calc(100vh-60px)] flex-col items-center px-6 py-12">
        <div className="flex min-h-0 w-full max-w-[1000px] flex-1 overflow-hidden rounded-2xl border border-border-default bg-bg-card-alt">
          <SocialSidebar />
          {children}
        </div>
      </main>
      <Footer />
    </>
  );
}
