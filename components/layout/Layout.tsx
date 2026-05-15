"use client";

import Header from "./Header";
import Footer from "./Footer";
import BottomNav from "@/components/ordering/BottomNav";
import ShopStickyMerchCart from "@/components/sections/shop/ShopStickyMerchCart";
import UnifiedCartDrawer from "@/components/commerce/UnifiedCartDrawer";
import { isPlatformPath } from "@/lib/navigation/platformPaths";
import { usePathname } from "next/navigation";
import { CartProvider } from "@/context/CartContext";
import { CartNavProvider } from "@/context/CartNavContext";
import { ToastProvider } from "@/context/ToastContext";
import { HeaderSubNavProvider } from "@/context/HeaderSubNavContext";

export default function Layout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (pathname.startsWith("/ops")) {
    return <>{children}</>;
  }

  if (isPlatformPath(pathname)) {
    return (
      <CartProvider>
        <ToastProvider>
          <CartNavProvider>
            <HeaderSubNavProvider>
              <div className="flex flex-col min-h-dvh bg-cream text-charcoal">
                <Header />
                <div className="flex flex-1 flex-col min-h-0 min-w-0 w-full">{children}</div>
                <BottomNav />
                <UnifiedCartDrawer />
                <div className="lg:hidden h-16" aria-hidden="true" />
              </div>
            </HeaderSubNavProvider>
          </CartNavProvider>
        </ToastProvider>
      </CartProvider>
    );
  }

  if (
    pathname === "/login" ||
    pathname.startsWith("/login/") ||
    pathname === "/signup" ||
    pathname.startsWith("/signup/") ||
    pathname === "/forgot-password" ||
    pathname.startsWith("/forgot-password/")
  ) {
    return (
      <div className="flex flex-col min-h-dvh bg-cream text-charcoal">
        <main className="flex-1 flex items-center justify-center px-6 py-16">{children}</main>
      </div>
    );
  }

  const isFullWidth =
    pathname === "/" ||
    pathname === "/index" ||
    pathname === "/home" ||
    pathname === "/menu" ||
    pathname === "/order" ||
    pathname === "/our-story" ||
    pathname === "/catering" ||
    pathname === "/find-us" ||
    pathname === "/shop" ||
    pathname === "/checkout";

  return (
    <CartProvider>
      <ToastProvider>
        <CartNavProvider>
          <HeaderSubNavProvider>
            <div className="flex flex-col min-h-dvh bg-cream text-charcoal">
              <Header />

              <main
                className={`flex flex-1 flex-col min-h-0 w-full pt-0 ${isFullWidth ? "" : "px-6 md:px-12 lg:px-20"}`}
              >
                {children}
              </main>

              <Footer />
              <BottomNav />
              <UnifiedCartDrawer />
              <ShopStickyMerchCart />
              <div className="lg:hidden h-16" aria-hidden="true" />
            </div>
          </HeaderSubNavProvider>
        </CartNavProvider>
      </ToastProvider>
    </CartProvider>
  );
}
