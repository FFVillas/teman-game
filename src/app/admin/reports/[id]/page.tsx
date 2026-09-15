import type { Metadata } from "next";
import ReportCase from "@/components/admin/ReportCase";

export const metadata: Metadata = { title: "Report — TemanGame Admin" };

export default async function AdminReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ReportCase reportId={id} />;
}
