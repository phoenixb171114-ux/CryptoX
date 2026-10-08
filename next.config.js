/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Native/N-API modules: keep them external to the server bundle.
  experimental: {
    serverComponentsExternalPackages: ["@node-rs/argon2", "@prisma/client"],
  },
};

module.exports = nextConfig;
