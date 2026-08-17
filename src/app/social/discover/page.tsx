import type { Metadata } from "next";
import DiscoverPlayersPanel from "@/components/social/DiscoverPlayersPanel";

export const metadata: Metadata = {
  title: "Discover Players — TemanGame",
  description: "Find new players to team up with across all your games.",
};

export default function DiscoverPlayersPage() {
  return <DiscoverPlayersPanel />;
}
