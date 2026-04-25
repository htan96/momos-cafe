/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    // Next does not serve public/print-menu/index.html at /print-menu (trailing-slash redirect lands on 404).
    return [
      { source: "/print-menu", destination: "/print-menu/index.html" },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "ccwditgtfnlgbmbxoxmz.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: "**.squarecdn.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "**.squareup.com",
        pathname: "/**",
      },
    ],
  },
};

module.exports = nextConfig;
