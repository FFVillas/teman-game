"use client";

import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { startPwa } from "@/lib/pwa";
import { refreshPush } from "@/lib/push";
import { createClient } from "@/lib/supabase/client";

/**
 * Mounted once in the root layout: service worker and install prompt, and,
 * for a signed-in player with push on, a fresh FCM token for this device.
 */
export default function PwaSetup() {
  const { user } = useAuth();
  const userId = user?.id;

  useEffect(() => {
    startPwa();
  }, []);

  useEffect(() => {
    if (userId) void refreshPush(createClient()).catch(() => {});
  }, [userId]);

  return null;
}
