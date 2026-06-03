import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@sherpacms/cms",
    "@sherpacms/domain",
    "@sherpacms/infrastructure",
    "@sherpacms/form-generator",
  ],
  // Keeping firebase-admin external in production avoids bundling Node built-ins,
  // while disabling it in dev prevents unstable .next manifest generation on Windows.
  ...(process.env.NODE_ENV === "production"
    ? { serverExternalPackages: ["firebase-admin"] }
    : {}),
};

export default nextConfig;
