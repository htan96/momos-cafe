import Head from "next/head";

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  url?: string;
}

export default function SEO({
  title = "Momo’s Café Vallejo — Brunch & Comfort Food",
  description = "From our crew to yours — Momo’s Café in Vallejo serves modern brunch, classic comfort food, and local favorites inside Morgen’s Kitchen.",
  keywords = "Momo’s Café, Momo’s Vallejo, brunch Vallejo, breakfast Vallejo, lunch Vallejo, Vallejo diner, Morgen’s Kitchen",
  image = "/images/logo.png",
  url = "https://momovallejo.com",
}: SEOProps) {
  const siteName = "Momo’s Café Vallejo";

  return (
    <Head>
      {/* Primary Meta Tags */}
      <title>{title}</title>
      <meta name="title" content={title} />
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content="website" />
      <meta property="og:url" content={url} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />
      <meta property="og:site_name" content={siteName} />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />

      {/* Schema.org JSON-LD (Local Business / Restaurant) */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Restaurant",
            name: "Momo’s Café Vallejo",
            image: "https://momovallejo.com/images/logo.png",
            "@id": "https://momovallejo.com",
            url: "https://momovallejo.com",
            telephone: "+1 707-555-1234",
            address: {
              "@type": "PostalAddress",
              streetAddress: "1922 Broadway St",
              addressLocality: "Vallejo",
              addressRegion: "CA",
              postalCode: "94590",
              addressCountry: "US",
            },
            servesCuisine: "Brunch, Breakfast, Lunch, Coffee",
            priceRange: "$$",
          }),
        }}
      />
    </Head>
  );
}
