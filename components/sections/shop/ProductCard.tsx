"use client";

import Image from "next/image";
import type { MerchProduct } from "@/types/merch";

function formatMoney(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

const FALLBACK: Record<
  NonNullable<MerchProduct["imageFallbackKey"]>,
  string
> = {
  teal: "from-teal-dark via-teal to-cream-mid",
  cream: "from-cream-dark via-cream to-white",
  gold: "from-gold/90 via-yellow-700 to-charcoal",
  charcoal: "from-charcoal via-charcoal/85 to-teal-dark",
  red: "from-red via-red/85 to-charcoal",
};

function InventoryRibbon({ inventory }: { inventory: MerchProduct["inventory"] }) {
  if (inventory === "out_of_stock") {
    return (
      <span className="absolute left-2 top-2 rounded bg-charcoal/90 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white">
        Sold out
      </span>
    );
  }
  if (inventory === "low_stock") {
    return (
      <span className="absolute left-2 top-2 rounded bg-red px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white shadow-sm">
        Low stock
      </span>
    );
  }
  return null;
}

function formatPriceDisplay(product: MerchProduct): string {
  if (product.priceLabel) return product.priceLabel;
  return formatMoney(product.price);
}

export interface ProductCardProps {
  product: MerchProduct;
  index?: number;
  onConfigure: (product: MerchProduct) => void;
  onQuickAdd: (product: MerchProduct) => void;
}

export default function ProductCard({
  product,
  index = 0,
  onConfigure,
  onQuickAdd,
}: ProductCardProps) {
  const needsOptions =
    Boolean(product.sizes?.length) ||
    Boolean(product.colors?.length) ||
    Boolean(product.amountOptions?.length);
  const disabled = product.inventory === "out_of_stock";

  const handlePrimary = () => {
    if (disabled) return;
    if (needsOptions || product.buttonLabel === "Choose options") {
      onConfigure(product);
      return;
    }
    onQuickAdd(product);
  };

  const fallbackGrad = FALLBACK[product.imageFallbackKey ?? "teal"];

  return (
    <article
      className="group flex flex-col rounded-xl overflow-hidden bg-white border border-cream-dark/90 shadow-[0_1px_0_rgba(0,0,0,0.04)] transition-all hover:border-teal/35 hover:shadow-[0_8px_24px_-10px_rgba(74,139,140,0.35)]"
      style={{
        animationDelay: `${Math.min(index, 12) * 35}ms`,
      }}
    >
      <button
        type="button"
        onClick={() => !disabled && onConfigure(product)}
        className={`relative aspect-[4/5] w-full overflow-hidden block text-left ${disabled ? "opacity-60 grayscale pointer-events-none" : ""}`}
        aria-label={`${product.name} — details`}
      >
        <InventoryRibbon inventory={product.inventory} />
        {product.image ? (
          <Image
            src={product.image}
            alt={product.name}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            sizes="(max-width: 768px) 45vw, 280px"
          />
        ) : (
          <div
            className={`absolute inset-0 bg-gradient-to-br ${fallbackGrad} flex flex-col items-center justify-center`}
          >
            <span className="font-display text-3xl md:text-4xl text-white/25 select-none tracking-tight">
              M
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-[0.35em] text-white/35 mt-1">
              Momo&apos;s
            </span>
          </div>
        )}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-charcoal/50 to-transparent opacity-70 transition-opacity group-hover:opacity-90" />

        <div className="absolute bottom-2 left-2 right-2 flex flex-wrap gap-1">
          <span className="rounded-full bg-white/92 backdrop-blur-sm px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-teal-dark shadow-sm ring-1 ring-white/60">
            {product.fulfillment.badgeLabel}
          </span>
          {product.badges?.slice(0, 1).map((b) => (
            <span
              key={b}
              className="rounded-full bg-gold/95 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-charcoal shadow-sm"
            >
              {b}
            </span>
          ))}
        </div>
      </button>

      <div className="flex flex-1 flex-col p-3 md:p-3.5 gap-2">
        {product.subtitle && (
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-teal-dark leading-none">
            {product.subtitle}
          </p>
        )}
        <h3 className="font-semibold text-[13px] md:text-sm leading-snug text-charcoal line-clamp-2 min-h-[2.35rem]">
          {product.name}
        </h3>

        <div className="mt-auto flex items-end justify-between gap-2 pt-1 border-t border-cream-dark/60">
          <div className="min-w-0">
            <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0">
              <span className="font-display text-lg md:text-xl text-red leading-none">
                {formatPriceDisplay(product)}
              </span>
              {product.compareAtPrice != null && product.compareAtPrice > product.price && (
                <span className="text-[11px] text-charcoal/40 line-through">
                  {formatMoney(product.compareAtPrice)}
                </span>
              )}
            </div>
            <p className="text-[10px] text-charcoal/45 mt-0.5 truncate">{product.fulfillment.headline}</p>
          </div>
          <button
            type="button"
            onClick={handlePrimary}
            disabled={disabled}
            className="shrink-0 rounded-lg bg-charcoal px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wide text-cream shadow-[0_2px_0_#111] transition-all hover:bg-teal-dark hover:shadow-[0_2px_0_#1a4a4a] disabled:opacity-40 disabled:shadow-none disabled:cursor-not-allowed active:translate-y-px"
          >
            {disabled ? "Unavailable" : needsOptions ? "Options" : "Add"}
          </button>
        </div>
      </div>
    </article>
  );
}
