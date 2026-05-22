/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    /** Legacy bookmarks from removed `/ops` App Router chrome — canonical execution lives under `/admin/*`. */
    return [
      { source: "/ops", destination: "/admin", permanent: false },
      { source: "/ops/orders/:path*", destination: "/admin/orders/:path*", permanent: false },
      { source: "/ops/settings", destination: "/admin/settings/operations", permanent: false },
      { source: "/ops/support", destination: "/admin/support", permanent: false },
      { source: "/ops/login", destination: "/login", permanent: false },
      { source: "/ops/login/:path*", destination: "/login", permanent: false },
      { source: "/ops/fulfillment", destination: "/admin/fulfillment", permanent: false },
      { source: "/ops/shipping", destination: "/admin/shipping", permanent: false },
      { source: "/ops/communications/:path*", destination: "/admin/communications/:path*", permanent: false },
      { source: "/ops/communications", destination: "/admin/communications", permanent: false },
    ];
  },

  images: {
    remotePatterns: [
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
      /** Square Catalog image CDN (production items bucket — URLs returned by Catalog API). */
      {
        protocol: "https",
        hostname: "items-images-production.s3.us-west-2.amazonaws.com",
        pathname: "/**",
      },
      /** Fallback for other regional Square/S3-hosted catalog image endpoints. */
      {
        protocol: "https",
        hostname: "**.amazonaws.com",
        pathname: "/**",
      },
    ],
  },
};

module.exports = nextConfig;
