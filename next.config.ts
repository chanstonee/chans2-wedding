import type { NextConfig } from "next";

const pagesBuild = process.env.PAGES_BUILD === "1";
const pagesBasePath = (process.env.PAGES_BASE_PATH ?? "/wedding").replace(/\/$/, "");

const nextConfig: NextConfig = pagesBuild
  ? {
      output: "export",
      basePath: pagesBasePath,
      trailingSlash: true,
      distDir: "out",
      images: { unoptimized: true },
      typescript: { tsconfigPath: "tsconfig.pages.json" },
    }
  : {};

export default nextConfig;
