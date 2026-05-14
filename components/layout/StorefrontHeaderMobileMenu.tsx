"use client";

import { useEffect } from "react";
import Link from "next/link";
import HeaderAuthLink from "./HeaderAuthLink";
import { STOREFRONT_HEADER_NAV_LINKS } from "@/lib/navigation/storefrontHeaderNav";

type Props = {
  open: boolean;
  onClose: () => void;
  pathname: string;
};

const linkClass =
  "block w-full rounded-xl px-3 py-3 text-sm font-semibold uppercase tracking-[0.1em] text-charcoal hover:bg-cream-dark/45 active:bg-cream-dark/60";

const ctaClass =
  "block w-full text-center rounded-xl px-3 py-3.5 text-sm font-semibold uppercase tracking-[0.12em] bg-red text-white hover:bg-red-dark";

/**
 * Full-height overlay + sheet for primary storefront navigation on small viewports.
 * z-index sits above the sticky global header (`z-[900]`) so the sheet is usable.
 */
export default function StorefrontHeaderMobileMenu({ open, onClose, pathname }: Props) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="momos-header-mobile-only fixed inset-0 z-[1200] flex justify-center items-end md:hidden">
      <button type="button" aria-label="Close menu" className="absolute inset-0 bg-charcoal/50" onClick={onClose} />
      <aside
        className="relative z-[1201] w-full max-w-lg bg-cream rounded-t-2xl border-2 border-cream-dark shadow-2xl max-h-[min(82vh,580px)] flex flex-col pb-[env(safe-area-inset-bottom)]"
        role="dialog"
        aria-modal="true"
        aria-label="Site menu"
      >
        <header className="flex items-center justify-between px-5 py-3 border-b border-cream-dark">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-teal-dark">Menu</p>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-cream-dark w-9 h-9 text-charcoal/70 hover:bg-white text-xl leading-none font-light"
            aria-label="Close"
          >
            ×
          </button>
        </header>
        <nav className="overflow-y-auto px-2 py-2 flex flex-col gap-1" aria-label="Primary">
          <ul className="flex flex-col gap-0.5">
            {STOREFRONT_HEADER_NAV_LINKS.map((link) => {
              const active = pathname === link.href;
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    onClick={onClose}
                    className={`${linkClass} ${active ? "text-red bg-red/5" : ""}`}
                    aria-current={active ? "page" : undefined}
                  >
                    {link.label}
                  </Link>
                </li>
              );
            })}
          </ul>
          <div className="px-1 pt-2 border-t border-cream-dark/60 flex flex-col gap-2">
            <HeaderAuthLink layout="stack" />
            <Link href="/order" onClick={onClose} className={ctaClass}>
              Order Now
            </Link>
          </div>
        </nav>
      </aside>
    </div>
  );
}
