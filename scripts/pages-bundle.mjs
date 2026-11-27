// Builds the drag-and-drop bundle for Cloudflare Pages (no terminal needed on Cloudflare's side):
//   dist/              the React app (vite build)
//   dist/_worker.js    the whole API in one file (Pages "advanced mode", entry worker/pages-entry.ts)
//   dist/_routes.json  only /api/* starts the Worker; everything else is a static file
// zipped as pos-upload.zip with every file at the zip's root. See docs/cloudflare/deploy-pages-upload.md.
//
//   npm run pages:bundle
import { execFileSync, execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { readFile, rm, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { build } from "esbuild";

const root = join(import.meta.dirname, "..");
const dist = join(root, "dist");
const run = (cmd) => execSync(cmd, { cwd: root, stdio: "inherit" });

// `npm run build` runs scripts/migrations.mjs first, so the embedded migrations are current.
run("npm run build");

await build({
  absWorkingDir: root,
  entryPoints: ["worker/pages-entry.ts"],
  outfile: "dist/_worker.js",
  bundle: true,
  format: "esm",
  platform: "browser",
  conditions: ["workerd", "worker", "browser"],
  target: "es2022",
  minify: true,
  legalComments: "none",
  external: ["node:*", "cloudflare:*"],
  logLevel: "warning",
});

await writeFile(join(dist, "_routes.json"), JSON.stringify({ version: 1, include: ["/api/*"], exclude: [] }) + "\n");

const nodeImports = (await readFile(join(dist, "_worker.js"), "utf8")).match(/from\s*"node:[a-z/]+"/g);
if (nodeImports)
  console.warn(`Note: _worker.js imports ${[...new Set(nodeImports)].join(", ")} (turn on nodejs_compat).`);
console.log(`_worker.js ${((await stat(join(dist, "_worker.js"))).size / 1024).toFixed(0)} KiB`);

const zip = join(root, "pos-upload.zip");
if (existsSync(zip)) await rm(zip);
execFileSync("zip", ["-qr", zip, "."], { cwd: dist, stdio: "inherit" });
console.log(`pos-upload.zip ready (${((await stat(zip)).size / 1024).toFixed(0)} KiB). Upload it in Cloudflare Pages.`);
