import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Pin the workspace root: a stray lockfile at the drive root otherwise
  // confuses Next's root inference and breaks file tracing on deploy.
  outputFileTracingRoot: import.meta.dirname,
};

export default nextConfig;
