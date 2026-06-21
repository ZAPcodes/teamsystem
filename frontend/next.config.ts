import type { NextConfig } from "next";

/**
 * Unified API: browser calls `/api/*` on the same origin.
 * Next.js rewrites those requests to the Render backend (BACKEND_URL).
 */
const backendUrl = (process.env.BACKEND_URL ?? "http://localhost:4000").replace(/\/$/, "");

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${backendUrl}/:path*`,
      },
    ];
  },
};

export default nextConfig;
