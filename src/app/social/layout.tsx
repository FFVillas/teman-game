import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SocialSidebar from "@/components/social/SocialSidebar";
import { currentUser } from "@/data/social-friends";

export default function SocialLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Navbar user={currentUser} />
      <main className="flex min-h-screen flex-1 flex-col items-center px-6 py-12">
        <div className="flex w-full max-w-[1000px] flex-1 overflow-hidden rounded-2xl border border-border-default bg-bg-card-alt">
          <SocialSidebar />
          {children}
        </div>
      </main>
      <Footer />
    </>
  );
}
