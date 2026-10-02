import type { NextConfig } from "next";

const pagesBuild = process.env.PAGES_BUILD === "1";
const pagesBasePath = (process.env.PAGES_BASE_PATH ?? "/wedding").replace(/\/$/, "");

// NEXT_PUBLIC values are embedded in JavaScript. Reject private keys before
// bundling, even if an unused fallback would otherwise hide the mistake.
for (const name of ["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "NEXT_PUBLIC_SUPABASE_ANON_KEY"]) {
  const key = process.env[name]?.trim();
  if (!key) continue;
  let publicKey = key.startsWith("sb_publishable_");
  if (!publicKey) {
    try {
      publicKey = JSON.parse(Buffer.from(key.split(".")[1] ?? "", "base64url").toString("utf8")).role === "anon";
    } catch { /* Invalid and private keys fail closed. */ }
  }
  if (!publicKey) throw new Error(`${name} must be a publishable or legacy anon key. Private Supabase keys cannot be bundled.`);
}

const nextConfig: NextConfig = pagesBuild
  ? {
      output: "export",
      basePath: pagesBasePath,
      trailingSlash: true,
      env: { NEXT_PUBLIC_SITE_BASE_PATH: pagesBasePath },
      distDir: "out",
      images: { unoptimized: true },
      typescript: { tsconfigPath: "tsconfig.pages.json" },
    }
  : { env: { NEXT_PUBLIC_SITE_BASE_PATH: "" } };

export default nextConfig;
