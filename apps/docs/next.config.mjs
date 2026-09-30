import { syncFavicon } from "@repo/favicons/sync";
import { createMDX } from "fumadocs-mdx/next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isProd = process.env.NODE_ENV === "production";

// Public files live under /_docs so they never collide with the marketing
// site that owns the rest of the domain.
syncFavicon(isProd ? "production" : "dev", path.join(__dirname, "public/_docs/favicon"));

/** @type {import('next').NextConfig} */
const config = {
  // Cloudflare Workers static assets, no Node server.
  output: "export",
  images: { unoptimized: true },
  reactStrictMode: true,
  // ecbot.dev/_next belongs to the marketing site. scripts/postbuild.mjs moves
  // out/_next to out/_docs/_next to match this prefix.
  assetPrefix: isProd ? "/_docs" : undefined,
};

export default createMDX()(config);
