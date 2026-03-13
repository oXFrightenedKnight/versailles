import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  transpilePackages: ["@repo/shared"],
  logging: false,
};

export default nextConfig;
