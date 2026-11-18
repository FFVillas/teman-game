// TemanGame service worker.
//
// What it does, on purpose and no more:
// - Pages always come from the network, because lobbies, slots and chats must
//   be current. Only when the network is gone does a page fall back to
//   /offline, a static "you're offline" screen.
// - Build files (/_next/static, content-hashed, never change) are kept in a
//   cache for good. The app's own images (logo, covers, rank badges) are
//   shown from the cache at once and refreshed in the background, so a
//   replaced image (a new logo under the same name) shows on the next visit.
// - Data (Supabase, /api, Server Component payloads) is never cached or
//   touched: a stale lobby list would be worse than none.
//
// Bump VERSION when this file changes so old caches are cleared.

const VERSION = "v1";
const STATIC_CACHE = `temangame-static-${VERSION}`;
const PAGE_CACHE = `temangame-pages-${VERSION}`;
const OFFLINE_URL = "/offline";

const PRECACHE = [
  OFFLINE_URL,
  "/pwa/icon-192.png",
  "/icons/logo-mark.svg",
];

// The offline screen must draw with no network at all, so its stylesheet and
// scripts are cached alongside it, read from the page's own HTML.
async function precache() {
  const pages = await caches.open(PAGE_CACHE);
  await pages.addAll(PRECACHE);

  const offline = await pages.match(OFFLINE_URL);
  const html = offline ? await offline.text() : "";
  const assets = [...new Set(html.match(/\/_next\/static\/[^"'\s)\\]+/g) || [])];
  const statics = await caches.open(STATIC_CACHE);
  await Promise.all(assets.map((asset) => statics.add(asset).catch(() => {})));
}

self.addEventListener("install", (event) => {
  event.waitUntil(precache().then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith("temangame-") && ![STATIC_CACHE, PAGE_CACHE].includes(key))
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

/** Hashed build output: a new build means new file names. */
function isBuildFile(url) {
  return url.pathname.startsWith("/_next/static/");
}

/** The images under public/, which keep their names when replaced. */
function isPublicImage(url) {
  return /^\/(games|lfg|ranks|roles|icons|pwa|auth|profile)\/.+\.(png|jpe?g|webp|svg|gif|ico)$/.test(
    url.pathname,
  );
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // A page: network first, the offline screen if there is no network.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match(OFFLINE_URL).then((offline) => offline || Response.error()),
      ),
    );
    return;
  }

  // Build files: from the cache, filled on first use.
  if (isBuildFile(url)) {
    event.respondWith(
      caches.open(STATIC_CACHE).then((cache) =>
        cache.match(request).then(
          (cached) =>
            cached ||
            fetch(request).then((response) => {
              if (response.ok) cache.put(request, response.clone());
              return response;
            }),
        ),
      ),
    );
    return;
  }

  // Images: the cached copy at once, and a fresh one fetched behind it.
  if (isPublicImage(url)) {
    event.respondWith(
      caches.open(STATIC_CACHE).then((cache) =>
        cache.match(request).then((cached) => {
          const fresh = fetch(request)
            .then((response) => {
              if (response.ok) cache.put(request, response.clone());
              return response;
            })
            .catch(() => cached);
          if (cached) event.waitUntil(fresh);
          return cached || fresh;
        }),
      ),
    );
  }
  // Everything else goes to the network untouched.
});
