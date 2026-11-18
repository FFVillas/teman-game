import { NextResponse, type NextRequest } from "next/server";
import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";
import { createClient } from "@supabase/supabase-js";

/**
 * Sends one notification to a player's devices through Firebase Cloud
 * Messaging. Called only by the database: the `notifications_send_push`
 * trigger (20261119000000_push_notifications.sql) posts here through pg_net
 * whenever a notification row is written, with the shared secret in
 * `x-push-secret`. Anyone else gets a 401.
 *
 * Server-only settings (Vercel → Settings → Environment Variables, and
 * .env.local to run it locally):
 *   FIREBASE_SERVICE_ACCOUNT  the service account JSON from Firebase, on one line
 *   PUSH_WEBHOOK_SECRET       the same random string as in Supabase Vault
 */

export const runtime = "nodejs";

interface PushRequest {
  id: string;
  kind: string;
  title: string;
  body?: string | null;
  href: string;
  tokens: string[];
}

// FCM answers these for a token that will never work again.
const DEAD_TOKEN_CODES = new Set([
  "messaging/registration-token-not-registered",
  "messaging/invalid-registration-token",
  "messaging/invalid-argument",
]);

function firebaseApp(): App | null {
  const existing = getApps()[0];
  if (existing) return existing;
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) return null;
  return initializeApp({ credential: cert(JSON.parse(raw)) });
}

export async function POST(request: NextRequest) {
  const secret = process.env.PUSH_WEBHOOK_SECRET;
  if (!secret || request.headers.get("x-push-secret") !== secret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const app = firebaseApp();
  if (!app) {
    return NextResponse.json({ error: "push_not_configured" }, { status: 503 });
  }

  const push = (await request.json()) as PushRequest;
  if (!Array.isArray(push.tokens) || push.tokens.length === 0) {
    return NextResponse.json({ sent: 0, failed: 0 });
  }

  // Data only: the service worker (public/sw.js) draws the notification
  // itself, so it looks the same in every browser and opens the right page.
  const result = await getMessaging(app).sendEachForMulticast({
    tokens: push.tokens.slice(0, 500),
    data: {
      id: push.id,
      kind: push.kind,
      title: push.title,
      body: push.body ?? "",
      href: push.href,
    },
    webpush: {
      // Deliver now rather than when the phone next wakes on its own.
      headers: { Urgency: "high", TTL: String(60 * 60 * 24) },
    },
  });

  const dead = result.responses.flatMap((response, index) =>
    !response.success && response.error && DEAD_TOKEN_CODES.has(response.error.code)
      ? [push.tokens[index]]
      : [],
  );
  if (dead.length > 0) {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      { auth: { persistSession: false } },
    );
    await supabase.rpc("forget_push_tokens", { p_secret: secret, p_tokens: dead });
  }

  return NextResponse.json({
    sent: result.successCount,
    failed: result.failureCount,
    forgotten: dead.length,
  });
}
