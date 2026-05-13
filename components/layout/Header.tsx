"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useHeaderSubNav } from "@/context/HeaderSubNavContext";
import HeaderAuthLink from "./HeaderAuthLink";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/menu", label: "Menu" },
  { href: "/catering", label: "Catering" },
  { href: "/find-us", label: "Find Us" },
  { href: "/our-story", label: "Our Story" },
  { href: "/shop", label: "Shop" },
];

export default function Header() {
  const pathname = usePathname();
  const { subNav } = useHeaderSubNav() ?? { subNav: null };

  return (
    <header
      className="sticky top-0 left-0 right-0 z-[900] w-full bg-cream border-b-[3px] border-gold"
      style={{ transform: "translateZ(0)", WebkitBackfaceVisibility: "hidden" as const }}
    >
      <div className="max-w-[1140px] mx-auto px-5 h-16 flex items-center justify-center md:justify-between">
        {/* Logo — centered on mobile, left on desktop */}
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

        {/* Desktop nav */}
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
            href="/account"
            className="font-semibold text-[13px] tracking-[0.15em] uppercase py-2 px-3.5 rounded-md text-teal-dark hover:bg-teal/10 hover:text-teal-dark transition-colors duration-200"
          >
            Track order
          </Link>
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
