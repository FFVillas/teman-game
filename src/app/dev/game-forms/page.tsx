import { notFound } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import GameFormsGallery from "./GameFormsGallery";

// TEMPORARY: drafts of the per-game form (onboarding and edit profile).
// Delete src/app/dev when the form is decided. Hidden in production.

export default function GameFormsPage() {
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <>
      <Navbar />
      <main className="flex flex-1 flex-col">
        <div className="mx-auto flex w-full max-w-[1000px] flex-col gap-8 px-6 py-10">
          <div className="flex flex-col gap-2">
            <h1 className="text-xl font-extrabold tracking-tight text-white">
              Game details form: four drafts
            </h1>
            <p className="text-xs leading-relaxed text-text-muted">
              Temporary page. The fields you fill for each game in onboarding and
              on <code>/profile/me/edit</code>. Ranks, regions, roles and modes
              are the real ones from your catalog; nothing here is saved.
              Delete <code>src/app/dev</code> when done.
            </p>
          </div>
          <GameFormsGallery />
        </div>
      </main>
      <Footer />
    </>
  );
}
