import "./globals.css";
import Layout from "@/components/layout/Layout";
import { Inter, Playfair_Display } from "next/font/google";
import { Poppins } from "next/font/google";
import { League_Spartan, Source_Sans_3 } from "next/font/google";

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
  title: {
    default: "Momo’s Café",
    template: "%s • Momo’s Café",
  },
  description:
    "Warm • Rooted • Resilient • Retro Modern Comfort. The new chapter of Momo’s Café inside Morgen’s Kitchen.",
  openGraph: {
    type: "website",
    url: "https://momovallejo.com",
    siteName: "Momo's Café Vallejo",
    images: [
      {
        url: "https://momovallejo.com/images/icon.png",
        width: 1200,
        height: 630,
        alt: "Momo's Café Vallejo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    images: ["https://momovallejo.com/images/icon.png"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable}`}>
      <body className="font-sans">
        <Layout>{children}</Layout>
      </body>
    </html>
  );
}
