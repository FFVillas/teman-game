import type { Metadata } from "next";
import { Suspense } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import MessagesView from "@/components/messages/MessagesView";

export const metadata: Metadata = {
  title: "Messages — TemanGame",
  description: "Direct messages with your friends and teammates.",
};

export default function MessagesPage() {
  return (
    <>
      <Navbar />
      <main className="flex h-[calc(100vh-60px)] flex-col items-center px-6 py-12">
        <div className="flex min-h-0 w-full max-w-[1000px] flex-1 overflow-hidden rounded-2xl border border-border-default bg-bg-card-alt">
          <Suspense fallback={null}>
            <MessagesView />
          </Suspense>
        </div>
      </main>
      <Footer />
    </>
  );
}
