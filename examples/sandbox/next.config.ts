import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@sherpacms/cms",
    "@sherpacms/domain",
    "@sherpacms/infrastructure",
    "@sherpacms/form-generator",
  ],
};

export default nextConfig;
