"use client";

import { useEffect } from "react";
import Link from "next/link";

type Props = {
  open: boolean;
  onClose: () => void;
  title: string;
  links: { href: string; label: string }[];
};

/** Bottom sheet listing extra platform links (admin/super-admin “More”). */
export default function MobileNavMoreSheet({ open, onClose, title, links }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[1200] flex justify-center items-end lg:hidden">
      <button
        type="button"
        aria-label="Close menu"
        className="absolute inset-0 bg-charcoal/45"
        onClick={onClose}
      />
      <aside
        className="relative z-[1201] w-full max-w-lg bg-cream rounded-t-2xl border border-cream-dark shadow-2xl max-h-[min(78vh,560px)] flex flex-col pb-[env(safe-area-inset-bottom)]"
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <header className="flex items-center justify-between px-5 py-3 border-b border-cream-dark">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-teal-dark">{title}</p>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-cream-dark w-9 h-9 text-charcoal/60 hover:bg-white text-lg leading-none"
          >
            ×
          </button>
        </header>
        <nav className="overflow-y-auto px-2 py-2" aria-label={title}>
          <ul className="flex flex-col">
            {links.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onClose}
                  className="block rounded-xl px-3 py-3 text-sm font-semibold text-charcoal hover:bg-cream-dark/40 active:bg-cream-dark/55 uppercase tracking-[0.08em]"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </aside>
    </div>
  );
}
