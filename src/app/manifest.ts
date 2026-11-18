import type { MetadataRoute } from "next";

/**
 * The web app manifest (served at /manifest.webmanifest), which makes
 * TemanGame installable as a PWA: its name and icon on the home screen, and a
 * window of its own without the browser's address bar. Icons are drawn by
 * `scripts/generate-pwa-icons.mjs`.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "TemanGame",
    short_name: "TemanGame",
    description:
      "Find teammates for competitive games by rank, role and playstyle, with a reputation you can check before you play.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    // --color-bg-page and --main-color in globals.css.
    background_color: "#0e1015",
    theme_color: "#0e1015",
    categories: ["games", "social"],
    icons: [
      { src: "/pwa/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/pwa/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/pwa/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
