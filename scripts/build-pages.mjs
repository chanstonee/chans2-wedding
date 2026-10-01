import { spawnSync } from "node:child_process";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

// Keep the existing Sites build unchanged. Pages exports the same app without a server.
const basePath = (process.env.PAGES_BASE_PATH ?? "/wedding").replace(/\/$/, "");
if (basePath && !/^\/[a-zA-Z0-9_-]+$/.test(basePath)) {
  throw new Error("PAGES_BASE_PATH must be empty or a single repository path, e.g. /wedding");
}
const result = spawnSync(process.execPath, ["node_modules/next/dist/bin/next", "build", "--webpack"], {
  stdio: "inherit",
  env: { ...process.env, PAGES_BUILD: "1", PAGES_BASE_PATH: basePath, NEXT_TELEMETRY_DISABLED: "1" },
});
if (result.status !== 0) process.exit(result.status ?? 1);

// Raw <img> paths and CSS public URLs do not automatically inherit Next's basePath.
// Rewrite only our known public asset paths, not external links or hash navigation.
async function prefixPublicAssets(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) await prefixPublicAssets(path);
    else if (/\.(html|css|js|txt|json)$/.test(entry.name)) {
      const original = await readFile(path, "utf8");
      const updated = original.replace(/(["'(])\/(assets\/|Favicon\.png|og\.png)/g, `$1${basePath}/$2`);
      if (updated !== original) await writeFile(path, updated);
    }
  }
}
await prefixPublicAssets("out");
await writeFile("out/.nojekyll", "");
const html = await readFile("out/index.html", "utf8");
if (!html.includes(`${basePath}/_next/`) || !html.includes(`${basePath}/assets/`)) {
  throw new Error("Export verification failed: missing repository-relative scripts or assets");
}
console.log(`GitHub Pages export verified: out/ → ${basePath || "/"}`);
