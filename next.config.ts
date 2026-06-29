import type { NextConfig } from "next";

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
      ...(process.env.NEXT_PUBLIC_STORAGE_BASE_URL
        ? [
            {
              protocol: "https" as const,
              hostname: new URL(process.env.NEXT_PUBLIC_STORAGE_BASE_URL).hostname,
            },
          ]
        : []),
    ],
  },
};

export default nextConfig;
