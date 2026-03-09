import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Increase the default body size limit for API routes (PDF uploads can be large)
    serverActions: {
      bodySizeLimit: "100mb",
    },
  },
};

export default nextConfig;
