"use client";
import Image from "next/image";
import Link from "next/link";

export default function Header() {
  return (
    <header className="bg-cream text-teal border-b border-cream/50 shadow-sm sticky top-0 z-50">
      <div className="w-full flex justify-between items-center py-1.5 pl-4 pr-2 md:pl-8 md:pr-6 lg:pl-12 lg:pr-8 xl:pl-16 xl:pr-10">
        {/* Logo */}
        <Link href="/" className="flex items-center space-x-3">
          <Image
            src="/images/logo.png"
            alt="Momo's Café logo"
            width={160}
            height={80}
            className="h-14 sm:h-16 md:h-18 w-auto"
            priority
          />
        </Link>

        {/* Navigation */}
        <nav className="flex space-x-8 text-base md:text-lg font-poppins font-medium tracking-wide">
          <Link
            href="/"
            className="transition-colors duration-300 hover:text-gold"
          >
            Home
          </Link>
          <Link
            href="/our-story"
            className="transition-colors duration-300 hover:text-gold"
          >
            Our Story
          </Link>
          <Link
            href="/menu"
            className="transition-colors duration-300 hover:text-gold"
          >
            Menu
          </Link>
          <Link
            href="/catering"
            className="transition-colors duration-300 hover:text-gold"
          >
            Catering
          </Link>
          <Link
            href="/find-us"
            className="transition-colors duration-300 hover:text-gold"
          >
            Find Us
          </Link>
        </nav>
      </div>
    </header>
  );
}
