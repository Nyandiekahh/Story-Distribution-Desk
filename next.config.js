/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Playwright and its browser binaries only ever run inside our own
  // server-side lib/playwright code, never bundled for the client.
  experimental: {
    serverComponentsExternalPackages: ['playwright'],
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig;
