/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    /**
     * Transitional `/ops/**` aliases → canonical `/admin/**` where execution surfaces exist.
     * See `docs/architecture/admin-ops-consolidation-deliverables.md`.
     */
    return [
      { source: "/ops/fulfillment", destination: "/admin/fulfillment", permanent: false },
      { source: "/ops/shipping", destination: "/admin/shipping", permanent: false },
      { source: "/ops/support", destination: "/admin/support", permanent: false },
      { source: "/ops/communications/:threadId", destination: "/admin/communications", permanent: false },
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
