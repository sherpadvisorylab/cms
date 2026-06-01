import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@cms/cms",
    "@cms/domain",
    "@cms/infrastructure",
    "@cms/form-generator",
  ],
};

export default nextConfig;
