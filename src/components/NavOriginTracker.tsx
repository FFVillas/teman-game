"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { rememberOutsideSocial } from "@/lib/section-origin";

/**
 * Records every non-social route as "where you were before Social".
 * Mounted once in the root layout; renders nothing.
 */
export default function NavOriginTracker() {
  const pathname = usePathname();

  useEffect(() => {
    rememberOutsideSocial(pathname);
  }, [pathname]);

  return null;
}
