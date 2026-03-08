import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  serverExternalPackages: ['node-vibrant', 'puppeteer-core', '@sparticuz/chromium'],
};

export default nextConfig;
