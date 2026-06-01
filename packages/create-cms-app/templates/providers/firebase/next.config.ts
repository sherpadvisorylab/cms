import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@cms/cms",
    "@cms/domain",
    "@cms/infrastructure",
    "@cms/form-generator",
  ],
  // firebase-admin uses Node.js built-ins (node:crypto, node:stream, etc.)
  // that must never be bundled by webpack for the browser.
  serverExternalPackages: ["firebase-admin"],
};

export default nextConfig;
