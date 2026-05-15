import "./globals.css";
import { Suspense } from "react";
import { AppProviders } from "@/app/providers";
import Layout from "@/components/layout/Layout";
import {
  Inter,
  League_Spartan,
  Playfair_Display,
  Poppins,
  Source_Sans_3,
} from "next/font/google";

const spartan = League_Spartan({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-spartan",
});

const sourceSans = Source_Sans_3({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-source-sans",
});

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
});
const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-poppins",
});

export const metadata = {
  metadataBase: new URL("https://momovallejo.com"),
  title: {
    default: "Momo’s Café",
    template: "%s • Momo’s Café",
  },
  description:
    "Warm • Rooted • Resilient • Retro Modern Comfort. The new chapter of Momo’s Café inside Morgen’s Kitchen.",
  openGraph: {
    type: "website",
    url: "https://momovallejo.com",
    title: "Momo's Café Vallejo — Big Breakfast. Bold Flavor. Bay Area Soul.",
    description:
      "Hearty breakfast plates, loaded burritos, stacked burgers, and Mexican-American comfort food — served fast, fresh, and with love in Vallejo. Order pickup at Morgen's Kitchen.",
    siteName: "Momo's Café Vallejo",
    images: [
      {
        url: "https://momovallejo.com/images/og-image.png",
        width: 1200,
        height: 630,
        alt: "Momo's Café Vallejo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Momo's Café Vallejo — Big Breakfast. Bold Flavor. Bay Area Soul.",
    description:
      "Hearty breakfast plates, loaded burritos, stacked burgers, and Mexican-American comfort food — served fast, fresh, and with love in Vallejo. Order pickup at Morgen's Kitchen.",
    images: ["https://momovallejo.com/images/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${playfair.variable} ${spartan.variable} ${sourceSans.variable} ${poppins.variable}`}
    >
      <body className="font-sans">
        <AppProviders>
          <Suspense fallback={<div className="min-h-dvh bg-cream text-charcoal" aria-busy="true" />}>
            <Layout>{children}</Layout>
          </Suspense>
        </AppProviders>
      </body>
    </html>
  );
}
