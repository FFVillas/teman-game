"use client";

import { useEffect } from "react";
import { startPwa } from "@/lib/pwa";

/** Mounted once in the root layout: service worker and install prompt. */
export default function PwaSetup() {
  useEffect(() => {
    startPwa();
  }, []);
  return null;
}
