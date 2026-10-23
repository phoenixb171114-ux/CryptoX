/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Native/N-API and Node-only modules: keep them external to the server bundle.
  experimental: {
    serverComponentsExternalPackages: ["@node-rs/argon2", "mongodb", "@zip.js/zip.js"],
  },
};

module.exports = nextConfig;
