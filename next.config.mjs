/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: [],
  },
  eslint: {
    ignoreDuringBuilds: process.env.CI !== "1",
  },
  /** Common store / legal URL variants → canonical slug (also helps if bookmarks use hyphenated paths). */
  async redirects() {
    return [
      { source: "/privacy-policy", destination: "/privacypolicy", permanent: true },
      { source: "/privacy", destination: "/privacypolicy", permanent: true },
      { source: "/legal/privacy", destination: "/privacypolicy", permanent: true },
    ];
  },
};

export default nextConfig;

