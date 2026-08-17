import type { Metadata } from "next";
import SocialFriendsPanel from "@/components/social/SocialFriendsPanel";

export const metadata: Metadata = {
  title: "Social — TemanGame",
  description: "See who's online, manage friend requests, and find new teammates.",
};

export default function SocialPage() {
  return <SocialFriendsPanel />;
}
