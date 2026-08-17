import type { Metadata } from "next";
import PendingRequestsPanel from "@/components/social/PendingRequestsPanel";

export const metadata: Metadata = {
  title: "Pending Requests — TemanGame",
  description: "Review and respond to incoming friend requests.",
};

export default function PendingRequestsPage() {
  return <PendingRequestsPanel />;
}
