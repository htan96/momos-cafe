"use client";

import Header from "./Header";
import Footer from "./Footer";
import { usePathname } from "next/navigation";

export default function Layout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // These pages get full-width layout (hero sections)
  const isFullWidth =
    pathname === "/" || pathname === "/index" || pathname === "/home";

  return (
    <div className="flex flex-col min-h-screen bg-brand-cream text-brand-charcoal">
      <Header />

      <main className={`flex-1 ${isFullWidth ? "" : "px-6 md:px-12 lg:px-20"}`}>
        {children}
      </main>

      <Footer />
    </div>
  );
}