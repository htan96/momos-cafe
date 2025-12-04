"use client";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Home, BookOpen, Utensils, Briefcase, MapPin, ShoppingBagIcon } from "lucide-react";

export default function Header() {
  const pathname = usePathname();

  const links = [
    { href: "/", label: "Home", icon: <Home size={20} /> },
    { href: "/our-story", label: "Our Story", icon: <BookOpen size={20} /> },
    { href: "/menu", label: "Menu", icon: <Utensils size={20} /> },
    { href: "/catering", label: "Catering", icon: <Briefcase size={20} /> },
    { href: "/shop", label: "Shop", icon: <ShoppingBagIcon size={20} /> },
    { href: "/find-us", label: "Find Us", icon: <MapPin size={20} /> }

  ];


  return (
    <>
      {/* ✅ Top Header (Logo Only on Mobile) */}
      <header className="bg-cream text-teal border-b border-cream/50 shadow-sm sticky top-0 z-50">
        <div className="w-full flex justify-between items-center py-3 px-4 md:py-2 md:px-8 lg:px-12 xl:px-16">
          <Link href="/" className="flex items-center space-x-3">
            <Image
              src="/images/logo.png"
              alt="Momo's Café logo"
              width={160}
              height={80}
              className="h-12 sm:h-14 md:h-16 w-auto"
              priority
            />
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex space-x-8 text-base font-medium tracking-wide">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`transition-colors duration-300 ${
                  pathname === link.href
                    ? "text-gold font-semibold"
                    : "hover:text-gold"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      {/* ✅ Bottom Navigation Bar for Mobile */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-cream border-t border-cream/60 shadow-inner flex justify-around py-2 sm:hidden">
        {links.map((link) => {
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className="flex flex-col items-center text-xs text-teal hover:text-gold transition-colors"
            >
              <motion.div
                whileTap={{ scale: 0.9 }}
                className={`flex flex-col items-center ${
                  isActive ? "text-gold" : "text-teal"
                }`}
              >
                {link.icon}
                <span className="mt-1">{link.label}</span>
              </motion.div>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
