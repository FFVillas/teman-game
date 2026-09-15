import type { Metadata } from "next";
import AdminGate from "@/components/admin/AdminGate";
import AdminShell from "@/components/admin/AdminShell";
import { AdminDataProvider } from "@/contexts/AdminDataContext";

export const metadata: Metadata = {
  title: "Admin — TemanGame",
  robots: { index: false, follow: false },
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminGate>
      <AdminDataProvider>
        <AdminShell>{children}</AdminShell>
      </AdminDataProvider>
    </AdminGate>
  );
}
