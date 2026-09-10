import type { NextConfig } from "next";
import { getPublicMediaBaseUrl } from "./infrastructure/config/build-env";

const publicMediaBaseUrl = getPublicMediaBaseUrl();

const nextConfig: NextConfig = {
  output: "standalone",
  eslint: {
    ignoreDuringBuilds: true,
  },
  webpack: (config) => {
    config.module.exprContextCritical = false;
    return config;
  },
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "minio.localhost",
        port: "9000",
      },
      {
        protocol: "https",
        hostname: "*.r2.cloudflarestorage.com",
      },
      {
        protocol: "https",
        hostname: "placehold.co",
      },
      ...(publicMediaBaseUrl
        ? [
            {
              protocol: "https" as const,
              hostname: publicMediaBaseUrl.hostname,
            },
          ]
        : []),
    ],
  },
};

export default nextConfig;
