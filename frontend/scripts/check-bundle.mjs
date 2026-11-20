// Fails when demo or test code ends up in the production bundle.
// Run after `vite build`: `npm run check:bundle`.
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const assetsDir = join(dirname(fileURLToPath(import.meta.url)), "..", "dist", "assets");

const MARKERS = [
  "westforce_demo_state",
  "westforce_demo_signed_out",
  "demoApi",
  "Demo mode, local only",
  "emma.demo@example.com",
  "WestForce123",
  "demo@westforce.com",
  // The demo PIN (src/demo/demoInsights.js) as a quoted string literal, which
  // survives minifying. The bare digits also sit inside base64 alphabets.
  '"123456"',
  "'123456'",
  "demoUnlockResponse",
];

// Demo chunks can leak with no text marker at all (minified names), so any
// built file named demo* fails too. Files copied as they are from public/
// (the landing page demo.mp4 and demo-poster.jpg) are real site media.
const distDir = join(assetsDir, "..");
const publicDir = join(distDir, "..", "public");

function listFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? listFiles(join(dir, entry.name)) : [join(dir, entry.name)]
  );
}

const fromPublic = (name) => existsSync(join(publicDir, name));

if (!existsSync(assetsDir)) {
  console.error(`check:bundle: ${assetsDir} not found. Run the build first.`);
  process.exit(1);
}

const jsFiles = readdirSync(assetsDir).filter((name) => name.endsWith(".js"));

if (jsFiles.length === 0) {
  console.error("check:bundle: no .js files in dist/assets.");
  process.exit(1);
}

const hits = [];

for (const file of listFiles(distDir)) {
  const name = file.slice(distDir.length + 1);
  if (/^demo/i.test(name.split(/[\\/]/).pop()) && !fromPublic(name)) hits.push(`${name}: file named demo*`);
}

for (const name of jsFiles) {
  const text = readFileSync(join(assetsDir, name), "utf8");
  for (const marker of MARKERS) {
    if (text.includes(marker)) hits.push(`${name}: "${marker}"`);
  }
}

if (hits.length > 0) {
  console.error("check:bundle: demo code found in the production bundle:");
  for (const hit of hits) console.error(`  ${hit}`);
  process.exit(1);
}

console.log(`check:bundle: ok (${jsFiles.length} files, no demo markers)`);
