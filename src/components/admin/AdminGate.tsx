"use client";

import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Client-side stand-in for the real access check. Anyone without the admin
 * role gets the ordinary 404 — not "access denied" — so the console doesn't
 * advertise that it exists.
 *
 * TODO: move this into middleware (Supabase session + role lookup) once the
 * backend exists. Hiding UI is not security; RLS on the moderation tables is
 * what actually keeps players out of this data.
 */
export default function AdminGate({ children }: { children: ReactNode }) {
  const { isReady, isAdmin } = useAuth();

  // The stored session is read after mount; until then we can't tell an
  // admin from a visitor, so render nothing rather than flash a 404.
  if (!isReady) return <div className="flex-1" />;
  if (!isAdmin) notFound();

  return <>{children}</>;
}
