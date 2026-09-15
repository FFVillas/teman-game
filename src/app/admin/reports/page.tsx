import type { Metadata } from "next";
import ReportQueue from "@/components/admin/ReportQueue";

export const metadata: Metadata = { title: "Reports — TemanGame Admin" };

export default function AdminReportsPage() {
  return <ReportQueue />;
}
