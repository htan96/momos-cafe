"use client";

import Header from "./Header";
import Footer from "./Footer";
import BottomNav from "@/components/ordering/BottomNav";
import { usePathname } from "next/navigation";
import { CartProvider } from "@/context/CartContext";
import { CartNavProvider } from "@/context/CartNavContext";
import { ToastProvider } from "@/context/ToastContext";

export default function Layout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // These pages get full-width layout (hero sections, menu, order, our-story, catering, find-us, shop)
  const isFullWidth =
    pathname === "/" ||
    pathname === "/index" ||
    pathname === "/home" ||
    pathname === "/menu" ||
    pathname === "/order" ||
    pathname === "/our-story" ||
    pathname === "/catering" ||
    pathname === "/find-us" ||
    pathname === "/shop";

  return (
    <CartProvider>
      <ToastProvider>
        <CartNavProvider>
          <div className="flex flex-col min-h-screen bg-cream text-charcoal">
            <Header />

            <main className={`flex-1 ${isFullWidth ? "" : "px-6 md:px-12 lg:px-20"}`}>
              {children}
            </main>

            <Footer />
            <BottomNav />
            {/* Spacer for fixed bottom nav on mobile */}
            <div className="lg:hidden h-16" aria-hidden="true" />
          </div>
        </CartNavProvider>
      </ToastProvider>
    </CartProvider>
  );
}