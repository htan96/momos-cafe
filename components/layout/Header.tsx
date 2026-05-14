"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useHeaderSubNav } from "@/context/HeaderSubNavContext";
import { useCommerceCart } from "@/context/CartContext";
import { useCartNav } from "@/context/CartNavContext";
import HeaderAuthLink from "./HeaderAuthLink";
import { useCustomerSessionPhase } from "@/lib/auth/cognito/useCustomerSessionPhase";
import { NavAccountIcon, NavCartIcon, NavSignInIcon } from "@/components/icons/navigation/NavIcons";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/menu", label: "Menu" },
  { href: "/catering", label: "Catering" },
  { href: "/find-us", label: "Find Us" },
  { href: "/our-story", label: "Our Story" },
  { href: "/shop", label: "Shop" },
];

function HeaderMobileAccount() {
  const phase = useCustomerSessionPhase();

  if (phase === "loading") {
    return (
      <span
        className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-cream-dark/35 animate-pulse"
        aria-hidden
      />
    );
  }

  if (phase === "in") {
    return (
      <Link
        href="/account"
        className="inline-flex h-10 w-10 items-center justify-center rounded-full text-teal-dark hover:bg-teal/10 transition-colors"
        aria-label="Account"
        title="Account"
      >
        <NavAccountIcon className="w-6 h-6" />
      </Link>
    );
  }

  return (
    <Link
      href="/login"
      className="inline-flex h-10 w-10 items-center justify-center rounded-full text-teal-dark hover:bg-teal/10 transition-colors"
      aria-label="Sign in"
      title="Sign in"
    >
      <NavSignInIcon className="w-6 h-6" />
    </Link>
  );
}

function HeaderMobileCart() {
  const pathname = usePathname();
  const { totalCount, setDrawerOpen } = useCommerceCart();
  const cartNav = useCartNav();
  const isOrderPage = pathname === "/order";

  const onClick = () => {
    if (isOrderPage) {
      cartNav?.callCartClick();
    } else {
      setDrawerOpen(true);
    }
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className="relative inline-flex h-10 w-10 items-center justify-center rounded-full text-red hover:bg-red/5 transition-colors"
      aria-label={totalCount > 0 ? `Cart, ${totalCount} items` : "Open cart"}
    >
      <NavCartIcon className="w-6 h-6" />
      {totalCount > 0 ? (
        <span className="absolute -top-0.5 -right-0.5 min-w-[15px] h-[15px] px-0.5 rounded-full bg-red text-white text-[9px] font-bold flex items-center justify-center">
          {totalCount > 99 ? "99+" : totalCount}
        </span>
      ) : null}
    </button>
  );
}

export default function Header() {
  const pathname = usePathname();
  const { subNav } = useHeaderSubNav() ?? { subNav: null };

  return (
    <header
      className="sticky top-0 left-0 right-0 z-[900] w-full bg-cream border-b-[3px] border-gold"
      style={{ transform: "translateZ(0)", WebkitBackfaceVisibility: "hidden" as const }}
    >
      <div className="max-w-[1140px] mx-auto px-5 h-16 flex relative items-center justify-center md:justify-between">
        <div className="absolute left-5 top-1/2 -translate-y-1/2 flex items-center gap-1 md:hidden">
          <HeaderMobileAccount />
        </div>

        <Link href="/" className="flex items-center hover:opacity-90 transition-opacity">
          <Image
            src="/images/logo.png"
            alt="Momo's Café"
            width={140}
            height={70}
            className="h-10 md:h-12 w-auto"
            priority
          />
        </Link>

        <div className="absolute right-5 top-1/2 -translate-y-1/2 flex items-center md:hidden">
          <HeaderMobileCart />
        </div>

        <nav className="hidden md:flex items-center gap-1.5">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`font-semibold text-[13px] tracking-[0.15em] uppercase py-2 px-3.5 rounded-md transition-colors duration-200 ${
                pathname === link.href
                  ? "text-red"
                  : "text-teal-dark hover:bg-teal/10 hover:text-teal-dark"
              }`}
            >
              {link.label}
            </Link>
          ))}
          <HeaderAuthLink />
          <Link
            href="/order"
            className="font-semibold text-[13px] tracking-[0.15em] uppercase py-2.5 px-4 rounded-md bg-red text-white hover:bg-red-dark hover:shadow-[0_2px_8px_rgba(128,0,0,0.35)] transition-all duration-200 ml-2"
          >
            Order Now
          </Link>
        </nav>
      </div>
      {subNav && (
        <div
          className={
            pathname === "/order"
              ? "h-[52px] border-t border-cream-dark/70 bg-cream/95 backdrop-blur-md shadow-[0_8px_20px_-12px_rgba(44,44,44,0.14)]"
              : "h-[52px] border-t border-gold/30 bg-teal-dark"
          }
        >
          {subNav}
        </div>
      )}
    </header>
  );
}
