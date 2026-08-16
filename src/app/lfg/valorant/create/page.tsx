import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CreateTeamForm from "@/components/lfg/CreateTeamForm";

export const metadata: Metadata = {
  title: "Create a Team — TemanGame",
  description: "Recruit the perfect squad for your next Valorant match.",
};

export default function CreateTeamPage() {
  return (
    <>
      <Navbar />
      <main className="flex flex-1 flex-col">
        <div className="mx-auto flex w-full max-w-[1000px] flex-col gap-4 px-6 py-12 sm:px-8">
          <CreateTeamForm />
        </div>
      </main>
      <Footer />
    </>
  );
}
