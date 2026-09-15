import type { Metadata } from "next";
import AuditLog from "@/components/admin/AuditLog";

export const metadata: Metadata = { title: "Audit log — TemanGame Admin" };

export default function AdminAuditLogPage() {
  return <AuditLog />;
}
