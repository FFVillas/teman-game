import type { Metadata } from "next";
import { notFound } from "next/navigation";
import AdminGate from "@/components/admin/AdminGate";
import AdminShell from "@/components/admin/AdminShell";
import { AdminDataProvider } from "@/contexts/AdminDataContext";
import { createClient, getUserId } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Admin — TemanGame",
  robots: { index: false, follow: false },
};

/**
 * The server-side check: anyone who isn't a row in `admins` gets the ordinary
 * 404 before a byte of the console is sent, so the console doesn't advertise
 * that it exists. The moderation tables are also closed to non-admins by RLS
 * and every write is an admin-only function, so this is the front door, not
 * the only lock.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const userId = await getUserId();
  if (!userId) notFound();
  const supabase = await createClient();
  const { data: admin } = await supabase
    .from("admins")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (!admin) notFound();

  return (
    <AdminGate>
      <AdminDataProvider>
        <AdminShell>{children}</AdminShell>
      </AdminDataProvider>
    </AdminGate>
  );
}
