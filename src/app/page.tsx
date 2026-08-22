import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Hero from "@/components/sections/Hero";
import HowItWorks from "@/components/sections/HowItWorks";
import WhyTemanGame from "@/components/sections/WhyTemanGame";
import FinalCta from "@/components/sections/FinalCta";

export const metadata: Metadata = {
  title: "TemanGame — Find teammates worth playing with",
  description:
    "Pick your game, join a lobby that matches how you play, and see who you're teaming up with before the match starts.",
};

export default function Home() {
  return (
    <>
      <Navbar />
      <main className="flex flex-1 flex-col">
        <Hero />
        <HowItWorks />
        <WhyTemanGame />
        <FinalCta />
      </main>
      <Footer />
    </>
  );
}
