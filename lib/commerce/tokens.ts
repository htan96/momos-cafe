/**
 * Storefront commerce rhythm — complements Tailwind theme (cream/teal/red).
 * Keep ops-facing tokens in `lib/ops/designTokens.ts`.
 */
export const commerceRadius = {
  card: "0.75rem",
  drawer: "1rem",
  pill: "9999px",
} as const;

export const commerceSectionSpacing = {
  gap: "gap-2.5 md:gap-4",
  sectionMb: "mb-14",
} as const;

/** Main header (64px) + sticky in-page category rail (~52px) + breathing room */
export const commerceMenuScrollMargin = "scroll-mt-[128px]";

/** Sticky collection / menu category chrome — pairs with `CollectionFilterBar` */
export const commerceCategoryStripShell =
  "bg-cream/95 backdrop-blur-md border-y border-cream-dark/70 shadow-[0_8px_20px_-12px_rgba(44,44,44,0.18)]";

/** Shared checkout / shop shell — cream field, teal structure, red CTAs */
export const commerceCheckoutShell = {
  page: "min-h-screen bg-cream text-charcoal",
  card: "rounded-2xl border border-cream-dark bg-white shadow-sm",
  cardHeader:
    "bg-teal-dark text-cream px-4 py-3 rounded-t-2xl border border-cream-dark border-b-0",
  sectionLabel: "text-[10px] font-semibold uppercase tracking-[0.28em] text-teal-dark",
  input:
    "mt-1 block w-full rounded-xl border border-cream-dark px-3 py-2.5 bg-cream text-[15px] text-charcoal focus:outline-none focus:ring-2 focus:ring-teal/25",
} as const;
