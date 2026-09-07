import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import NotificationList from "@/components/notifications/NotificationList";

export const metadata: Metadata = {
  title: "Notifications — TemanGame",
  description:
    "Join requests, lobby invites, reviews and moderation updates in one place.",
};

export default function NotificationsPage() {
  return (
    <>
      <Navbar />
      <main className="flex flex-1 flex-col">
        <div className="mx-auto flex w-full max-w-[1000px] flex-col gap-4 px-6 py-10">
          <NotificationList />
        </div>
      </main>
      <Footer />
    </>
  );
}
