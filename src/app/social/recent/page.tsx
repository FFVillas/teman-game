import type { Metadata } from "next";
import RecentTeammatesPanel from "@/components/social/RecentTeammatesPanel";

export const metadata: Metadata = {
  title: "Recent Teammates — TemanGame",
  description: "Players you've recently matched with in LFG lobbies.",
};

export default function RecentTeammatesPage() {
  return <RecentTeammatesPanel />;
}
