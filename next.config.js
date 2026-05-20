/** @type {import("next").NextConfig} */
const nextConfig = {
  // Development-only LAN access helpers.
  // Best used with machine hostnames (for example: my-counter.local) rather than changing raw IPs.
  allowedDevOrigins: [
    'localhost',
    '127.0.0.1',
    '*.local',
    '*.lan',
    '*.home.arpa',
  ],
};

module.exports = nextConfig;
