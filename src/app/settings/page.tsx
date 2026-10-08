import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SettingsView from "@/components/settings/SettingsView";
import { createClient } from "@/lib/supabase/server";
import { withNext } from "@/lib/auth-redirect";

export const metadata: Metadata = {
  title: "Settings — TemanGame",
  description: "Manage your email, password and account.",
};

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect(withNext("/login", "/settings"));

  // The email lives on the auth record, not on `profiles`.
  return (
    <>
      <Navbar />
      <main className="flex flex-1 flex-col">
        <div className="mx-auto flex w-full max-w-[1000px] flex-col gap-4 px-6 py-10">
          <SettingsView email={user.email ?? ""} />
        </div>
      </main>
      <Footer />
    </>
  );
}
