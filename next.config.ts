/** @type {import('next').NextConfig} */
const nextConfig = {
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
