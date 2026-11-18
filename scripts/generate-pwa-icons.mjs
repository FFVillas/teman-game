// Draws the app icons the PWA manifest and iOS ask for, from the logo mark.
// Run once after changing the logo: `node scripts/generate-pwa-icons.mjs`.
// Output goes to public/pwa/ and is committed, so the build doesn't need it.
//
// A new logo: replace public/icons/logo-mark.svg (white artwork on a
// transparent background, any size, with a viewBox), change BRAND below if
// the colour changed, and run this again. Look at the PNGs before committing.

import { readFile, mkdir } from "node:fs/promises";
import sharp from "sharp";

const BRAND = "#2c7ff3"; // --main-color in globals.css
const OUT = "public/pwa";

const mark = await readFile("public/icons/logo-mark.svg", "utf8");
// Read the mark's own proportions, so a logo of any shape is centred and
// never stretched.
const viewBox = mark.match(/viewBox="([^"]+)"/);
if (!viewBox) throw new Error("logo-mark.svg needs a viewBox");
const [, , vbWidth, vbHeight] = viewBox[1].trim().split(/[\s,]+/).map(Number);
// The artwork inside the <svg> tag.
const artwork = mark.replace(/^[\s\S]*?<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "");

/**
 * A square icon: brand background, the white mark centred.
 * `markShare` is how much of the width the mark spans. Maskable icons keep
 * it inside the central safe zone, since Android may crop them to a circle.
 */
function iconSvg(size, markShare, rounded) {
  // Fit the mark in a square box `markShare` of the icon wide, by its longer side.
  const scale = (size * markShare) / Math.max(vbWidth, vbHeight);
  const markWidth = vbWidth * scale;
  const markHeight = vbHeight * scale;
  const x = (size - markWidth) / 2;
  const y = (size - markHeight) / 2;
  const radius = rounded ? size * 0.22 : 0;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${radius}" fill="${BRAND}"/>
  <g transform="translate(${x} ${y}) scale(${scale})">${artwork}</g>
</svg>`;
}

const icons = [
  // "any": shown as drawn (install dialogs, desktop app windows).
  { file: "icon-192.png", size: 192, share: 0.56, rounded: true },
  { file: "icon-512.png", size: 512, share: 0.56, rounded: true },
  // "maskable": full-bleed square, mark inside the safe zone.
  { file: "maskable-512.png", size: 512, share: 0.46, rounded: false },
  // iOS home screen: full-bleed, iOS rounds the corners itself.
  { file: "apple-touch-icon.png", size: 180, share: 0.56, rounded: false },
];

await mkdir(OUT, { recursive: true });
for (const icon of icons) {
  await sharp(Buffer.from(iconSvg(icon.size, icon.share, icon.rounded)))
    .png()
    .toFile(`${OUT}/${icon.file}`);
  console.log(`${OUT}/${icon.file}`);
}
