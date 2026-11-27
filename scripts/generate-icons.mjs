/**
 * Regenerates PWA/app icons from the brand mark. Run after changing the logo:
 *   node scripts/generate-icons.mjs
 */
import { writeFileSync } from "node:fs";
import sharp from "sharp";

const bars = `
  <rect x="6.5" y="21" width="5" height="14" rx="2.5" fill="#fff"/>
  <rect x="14" y="14" width="5" height="21" rx="2.5" fill="#fff"/>
  <rect x="21.5" y="18" width="5" height="17" rx="2.5" fill="#de2010"/>
  <rect x="29" y="12" width="5" height="23" rx="2.5" fill="#0a0d0b"/>
  <rect x="36.5" y="23" width="5" height="12" rx="2.5" fill="#ef7d00"/>`;
const grad = `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2bb24c"/><stop offset="1" stop-color="#198a00"/></linearGradient></defs>`;

// Rounded tile (favicon / "any" purpose icons)
const tile = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">${grad}<rect width="48" height="48" rx="12" fill="url(#g)"/>${bars}</svg>`;
// Full-bleed square with the mark inside the 80% safe zone (maskable)
const maskable = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">${grad}<rect width="48" height="48" fill="url(#g)"/><g transform="translate(9.6 9.6) scale(0.6)">${bars}</g></svg>`;
// Apple touch icon: iOS applies its own rounding, so use a square tile
const apple = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">${grad}<rect width="48" height="48" fill="url(#g)"/><g transform="translate(4.8 4.8) scale(0.8)">${bars}</g></svg>`;

writeFileSync("src/app/icon.svg", tile);
await sharp(Buffer.from(tile)).resize(192, 192).png().toFile("public/icons/icon-192.png");
await sharp(Buffer.from(tile)).resize(512, 512).png().toFile("public/icons/icon-512.png");
await sharp(Buffer.from(maskable)).resize(512, 512).png().toFile("public/icons/maskable-512.png");
await sharp(Buffer.from(apple)).resize(180, 180).png().toFile("src/app/apple-icon.png");
await sharp(Buffer.from(tile)).resize(48, 48).png().toFile("src/app/icon.png");
console.log("Icons generated.");
