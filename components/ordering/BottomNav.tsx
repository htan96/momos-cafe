"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCommerceCart } from "@/context/CartContext";
import { useCartNav } from "@/context/CartNavContext";
import { formatMoney } from "@/lib/commerce/fulfillmentPreview";
import { useCustomerSessionPhase } from "@/lib/auth/cognito/useCustomerSessionPhase";
import { getMobileNavSurfaceKind } from "@/lib/navigation/mobileNavSurface";
import { getStorefrontMobileTabs, type StorefrontMobileTab } from "@/lib/navigation/storefrontMobileNav";
import { CUSTOMER_MOBILE_TABS } from "@/lib/navigation/customerMobileNav";
import {
  ADMIN_MOBILE_PRIMARY_TABS,
  getAdminMobileMoreLinks,
  type AdminMobileTab,
} from "@/lib/navigation/adminMobileNav";
import {
  SUPER_ADMIN_MOBILE_PRIMARY_TABS,
  getSuperAdminMobileMoreLinks,
  type SuperAdminMobileTab,
} from "@/lib/navigation/superAdminMobileNav";
import { pathMatchesNav } from "@/lib/navigation/pathMatchesNav";
import { NavGlyph, type NavigationGlyphId } from "@/components/icons/navigation/NavIcons";
import MobileNavMoreSheet from "@/components/ordering/MobileNavMoreSheet";

function tabClass(active: boolean) {
  return `flex-1 flex flex-col items-center justify-center gap-0.5 min-w-0 transition-colors py-2 ${
    active ? "text-red" : "text-teal-dark hover:bg-cream-dark/50 active:bg-cream-dark"
  }`;
}

function storefrontIcon(
  tab: StorefrontMobileTab,
  phase: "loading" | "in" | "out"
): NavigationGlyphId {
  if (tab.type === "auth") {
    if (phase === "in") return "account";
    return "signIn";
  }
  if (tab.type === "cart") return "cart";
  return tab.icon;
}

export default function BottomNav() {
  const { totalCount, grandTotal, setDrawerOpen } = useCommerceCart();
  const pathname = usePathname();
  const cartNav = useCartNav();
  const phase = useCustomerSessionPhase();
  const surface = getMobileNavSurfaceKind(pathname);
  const [moreOpen, setMoreOpen] = useState(false);

  const isOrderPage = pathname === "/order";

  const handleCartClick = () => {
    if (isOrderPage) {
      cartNav?.callCartClick();
    } else {
      setDrawerOpen(true);
    }
  };

  const ariaMoney = formatMoney(grandTotal);

  const storefrontTabs = getStorefrontMobileTabs();

  return (
    <>
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-[700] bg-cream-mid border-t-2 border-gold shadow-[0_-4px_20px_rgba(0,0,0,0.06)] pb-[env(safe-area-inset-bottom)]"
        role="navigation"
        aria-label="Bottom navigation"
      >
        <div className="max-w-[1140px] mx-auto px-2 sm:px-5">
          <div className="flex items-stretch h-14">
            {surface === "storefront" || surface === "portal" ? (
              <>
                {storefrontTabs.map((tab) => {
                  if (tab.type === "link") {
                    const active = pathMatchesNav(pathname, tab.href);
                    return (
                      <Link
                        key={tab.id}
                        href={tab.href}
                        className={tabClass(active)}
                        aria-label={tab.label}
                        aria-current={active ? "page" : undefined}
                      >
                        <NavGlyph name={storefrontIcon(tab, phase)} className="w-6 h-6" aria-hidden />
                        <span className="font-semibold text-[10px] tracking-wider uppercase leading-tight text-center">
                          {tab.label}
                        </span>
                      </Link>
                    );
                  }
                  if (tab.type === "cart") {
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={handleCartClick}
                        className={`flex-1 flex flex-col items-center justify-center gap-0.5 min-w-0 text-red hover:bg-red/5 active:bg-red/10 transition-colors relative py-2`}
                        aria-label={
                          totalCount > 0 ? `View cart, ${totalCount} items, ${ariaMoney}` : "View cart"
                        }
                      >
                        <span className="relative inline-flex" aria-hidden>
                          <NavGlyph name="cart" className="w-6 h-6" />
                          {totalCount > 0 && (
                            <span className="absolute -top-1 -right-2 min-w-[16px] h-4 rounded-full bg-red text-white text-[10px] font-bold flex items-center justify-center">
                              {totalCount}
                            </span>
                          )}
                        </span>
                        <span className="font-semibold text-[10px] tracking-wider uppercase leading-tight text-center">
                          {totalCount > 0 ? ariaMoney : tab.label}
                        </span>
                      </button>
                    );
                  }
                  if (tab.type === "auth") {
                    const inAccount = phase === "in";
                    const target = inAccount ? tab.customer : tab.guest;
                    const active =
                      phase !== "loading" &&
                      ((!inAccount && (pathname === "/login" || pathname.startsWith("/login/"))) ||
                        (inAccount && (pathname === "/account" || pathname.startsWith("/account/"))));
                    return (
                      <Link
                        key={tab.id}
                        href={target.href}
                        className={tabClass(active)}
                        aria-label={target.label}
                      >
                        <NavGlyph name={storefrontIcon(tab, phase)} className="w-6 h-6" aria-hidden />
                        <span className="font-semibold text-[10px] tracking-wider uppercase leading-tight text-center">
                          {target.label}
                        </span>
                      </Link>
                    );
                  }
                  return null;
                })}
              </>
            ) : null}

            {surface === "customer"
              ? CUSTOMER_MOBILE_TABS.map((tab) => {
                  const active = pathMatchesNav(pathname, tab.href);
                  return (
                    <Link
                      key={tab.id}
                      href={tab.href}
                      className={tabClass(active)}
                      aria-label={tab.label}
                      aria-current={active ? "page" : undefined}
                    >
                      <NavGlyph name={tab.icon as NavigationGlyphId} className="w-6 h-6 shrink-0" aria-hidden />
                      <span className="font-semibold text-[9px] sm:text-[10px] tracking-wider uppercase leading-tight text-center px-0.5">
                        {tab.label}
                      </span>
                    </Link>
                  );
                })
              : null}

            {surface === "admin"
              ? ADMIN_MOBILE_PRIMARY_TABS.map((tab: AdminMobileTab) => {
                  if (tab.type === "more") {
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        className={tabClass(false)}
                        aria-label={`${tab.label}, show all ${tab.label.toLowerCase()} links`}
                        onClick={() => setMoreOpen(true)}
                      >
                        <NavGlyph name="more" className="w-6 h-6" aria-hidden />
                        <span className="font-semibold text-[10px] tracking-wider uppercase leading-tight text-center">
                          {tab.label}
                        </span>
                      </button>
                    );
                  }
                  const active = pathMatchesNav(pathname, tab.href);
                  return (
                    <Link
                      key={tab.id}
                      href={tab.href}
                      className={tabClass(active)}
                      aria-label={tab.label}
                      aria-current={active ? "page" : undefined}
                    >
                      <NavGlyph name={tab.icon as NavigationGlyphId} className="w-6 h-6 shrink-0" aria-hidden />
                      <span className="font-semibold text-[9px] sm:text-[10px] tracking-wider uppercase leading-tight text-center px-0.5">
                        {tab.label}
                      </span>
                    </Link>
                  );
                })
              : null}

            {surface === "super_admin"
              ? SUPER_ADMIN_MOBILE_PRIMARY_TABS.map((tab: SuperAdminMobileTab) => {
                  if (tab.type === "more") {
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        className={tabClass(false)}
                        aria-label={`${tab.label}, show all ${tab.label.toLowerCase()} links`}
                        onClick={() => setMoreOpen(true)}
                      >
                        <NavGlyph name="more" className="w-6 h-6" aria-hidden />
                        <span className="font-semibold text-[10px] tracking-wider uppercase leading-tight text-center">
                          {tab.label}
                        </span>
                      </button>
                    );
                  }
                  const active = pathMatchesNav(pathname, tab.href);
                  return (
                    <Link
                      key={tab.id}
                      href={tab.href}
                      className={tabClass(active)}
                      aria-label={tab.label}
                      aria-current={active ? "page" : undefined}
                    >
                      <NavGlyph name={tab.icon as NavigationGlyphId} className="w-6 h-6 shrink-0" aria-hidden />
                      <span className="font-semibold text-[9px] sm:text-[10px] tracking-wider uppercase leading-tight text-center px-0.5">
                        {tab.label}
                      </span>
                    </Link>
                  );
                })
              : null}
          </div>
        </div>
      </nav>

      {surface === "admin" ? (
        <MobileNavMoreSheet
          open={moreOpen}
          onClose={() => setMoreOpen(false)}
          title="All admin"
          links={getAdminMobileMoreLinks()}
        />
      ) : null}
      {surface === "super_admin" ? (
        <MobileNavMoreSheet
          open={moreOpen}
          onClose={() => setMoreOpen(false)}
          title="All platform"
          links={getSuperAdminMobileMoreLinks()}
        />
      ) : null}
    </>
  );
}
