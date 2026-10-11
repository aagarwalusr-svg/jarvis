import type { NextConfig } from "next";
import path from "node:path";
const nextConfig: NextConfig = {
  reactStrictMode: true,
  turbopack: { root: path.resolve(__dirname, "..") },
  poweredByHeader: false,
  allowedDevOrigins: ["127.0.0.1", "localhost"],
};
export default nextConfig;
