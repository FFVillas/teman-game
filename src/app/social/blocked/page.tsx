import type { Metadata } from "next";
import SocialBlockedPanel from "@/components/social/SocialBlockedPanel";

export const metadata: Metadata = {
  title: "Blocked — TemanGame",
  description: "Players you've blocked.",
};

export default function SocialBlockedPage() {
  return <SocialBlockedPanel />;
}
