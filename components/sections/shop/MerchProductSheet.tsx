"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import type { MerchProduct } from "@/types/merch";
import { useMerchCart } from "@/context/MerchCartContext";
import { useToast } from "@/context/ToastContext";

function formatMoney(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

interface MerchProductSheetProps {
  product: MerchProduct | null;
  open: boolean;
  onClose: () => void;
}

export default function MerchProductSheet({ product, open, onClose }: MerchProductSheetProps) {
  const { addMerchLine } = useMerchCart();
  const showToast = useToast();

  const [size, setSize] = useState<string>("");
  const [colorId, setColorId] = useState<string>("");
  const [amount, setAmount] = useState<number>(10);
  const [qty, setQty] = useState(1);

  useEffect(() => {
    if (!product) return;
    setSize(product.sizes?.[0] ?? "");
    setColorId(product.colors?.[0]?.id ?? "");
    setAmount(product.amountOptions?.[0] ?? product.price);
    setQty(1);
  }, [product]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const variantSummary = useMemo(() => {
    if (!product) return "";
    const parts: string[] = [];
    if (product.amountOptions?.length) parts.push(`${formatMoney(amount)} card`);
    else {
      if (size) parts.push(size);
      const c = product.colors?.find((x) => x.id === colorId);
      if (c) parts.push(c.label);
    }
    return parts.join(" · ") || "Standard";
  }, [product, size, colorId, amount]);

  const unitPrice = useMemo(() => {
    if (!product) return 0;
    if (product.amountOptions?.length) return amount;
    return product.price;
  }, [product, amount]);

  const handleAdd = () => {
    if (!product || product.inventory === "out_of_stock") return;
    if (product.sizes?.length && !size) {
      showToast("Pick a size first.");
      return;
    }
    if (product.colors?.length && !colorId) {
      showToast("Pick a color.");
      return;
    }
    addMerchLine({
      productId: product.id,
      squareVariationId: undefined,
      name: product.name,
      quantity: qty,
      unitPrice,
      variantSummary,
      image: product.image,
      fulfillmentSlug: product.fulfillment.slug,
    });
    showToast(`Added ${product.name} to your bag`);
    onClose();
  };

  if (!product || !open) return null;

  const disabled = product.inventory === "out_of_stock";

  return (
    <div className="fixed inset-0 z-[120] flex items-end md:items-center justify-center md:p-6">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-charcoal/55 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="merch-sheet-title"
        className="relative z-[121] w-full max-h-[min(92vh,760px)] md:max-w-lg rounded-t-2xl md:rounded-2xl bg-cream shadow-[0_-8px_40px_rgba(0,0,0,0.18)] md:shadow-2xl overflow-hidden flex flex-col"
      >
        <div className="flex-shrink-0 h-1 w-12 rounded-full bg-cream-dark mx-auto mt-2 md:hidden" />

        <div className="flex flex-1 flex-col md:flex-row md:min-h-[340px] overflow-hidden">
          <div className="relative aspect-[5/4] md:aspect-auto md:w-[42%] md:min-h-[280px] bg-charcoal shrink-0">
            {product.image ? (
              <Image src={product.image} alt="" fill className="object-cover" sizes="(max-width:768px) 100vw, 280px" />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-teal-dark to-charcoal text-white/30">
                <span className="font-display text-6xl">M</span>
              </div>
            )}
            <span className="absolute left-3 top-3 rounded-full bg-white/95 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-teal-dark shadow">
              {product.fulfillment.badgeLabel}
            </span>
          </div>

          <div className="flex flex-col flex-1 min-h-0 overflow-y-auto p-5 md:p-6">
            <div className="flex justify-between gap-3 items-start">
              <div>
                {product.subtitle && (
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-teal-dark mb-1">
                    {product.subtitle}
                  </p>
                )}
                <h2 id="merch-sheet-title" className="font-display text-2xl text-charcoal leading-tight">
                  {product.name}
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-cream-dark w-9 h-9 text-charcoal/60 hover:bg-white hover:text-charcoal text-lg leading-none shrink-0"
              >
                ×
              </button>
            </div>

            <p className="text-[13px] text-charcoal/65 leading-relaxed mt-3">{product.description}</p>

            <div className="rounded-lg bg-teal/10 border border-teal/20 px-3 py-2 mt-4">
              <p className="text-[11px] font-semibold text-teal-dark uppercase tracking-wide mb-0.5">
                Fulfillment
              </p>
              <p className="text-[12px] text-charcoal/75 leading-snug">{product.fulfillment.detail}</p>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {product.fulfillment.pickupEligible && (
                  <span className="text-[10px] font-semibold uppercase tracking-wide bg-white rounded-full px-2 py-0.5 border border-cream-dark">
                    Pickup eligible
                  </span>
                )}
                {product.fulfillment.shippingEligible ? (
                  <span className="text-[10px] font-semibold uppercase tracking-wide bg-white rounded-full px-2 py-0.5 border border-cream-dark">
                    Shipping eligible
                  </span>
                ) : (
                  <span className="text-[10px] font-semibold uppercase tracking-wide bg-charcoal/5 rounded-full px-2 py-0.5 border border-cream-dark text-charcoal/45">
                    Shipping · Coming soon
                  </span>
                )}
              </div>
            </div>

            {product.amountOptions?.length ? (
              <div className="mt-5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-charcoal/55 mb-2">
                  Amount
                </p>
                <div className="flex flex-wrap gap-2">
                  {product.amountOptions.map((a) => (
                    <button
                      key={a}
                      type="button"
                      onClick={() => setAmount(a)}
                      className={`rounded-lg px-3 py-2 text-sm font-semibold border transition-all ${
                        amount === a
                          ? "bg-charcoal text-cream border-charcoal"
                          : "bg-white border-cream-dark text-charcoal hover:border-teal"
                      }`}
                    >
                      {formatMoney(a)}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {product.sizes?.length ? (
              <div className="mt-5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-charcoal/55 mb-2">
                  Size
                </p>
                <div className="flex flex-wrap gap-2">
                  {product.sizes.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSize(s)}
                      className={`min-w-[2.5rem] rounded-lg px-2.5 py-1.5 text-xs font-bold border transition-all ${
                        size === s
                          ? "bg-charcoal text-cream border-charcoal"
                          : "bg-white border-cream-dark text-charcoal hover:border-teal"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {product.colors?.length ? (
              <div className="mt-5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-charcoal/55 mb-2">
                  Color
                </p>
                <div className="flex flex-wrap gap-2">
                  {product.colors.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setColorId(c.id)}
                      className={`rounded-full pl-1 pr-3 py-1 text-xs font-semibold border flex items-center gap-2 transition-all ${
                        colorId === c.id
                          ? "bg-charcoal text-cream border-charcoal"
                          : "bg-white border-cream-dark text-charcoal hover:border-teal"
                      }`}
                    >
                      {c.hex ? (
                        <span
                          className="w-5 h-5 rounded-full border border-white/40 shadow-inner shrink-0"
                          style={{ backgroundColor: c.hex }}
                        />
                      ) : (
                        <span className="w-5 h-5 rounded-full bg-cream-dark shrink-0" />
                      )}
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="mt-6 flex items-center justify-between gap-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-charcoal/55 mb-1">
                  Quantity
                </p>
                <div className="inline-flex rounded-lg border border-cream-dark bg-white overflow-hidden">
                  <button
                    type="button"
                    className="px-3 py-2 text-charcoal hover:bg-cream font-semibold"
                    onClick={() => setQty((q) => Math.max(1, q - 1))}
                  >
                    −
                  </button>
                  <span className="px-4 py-2 font-semibold text-charcoal min-w-[2.5rem] text-center">{qty}</span>
                  <button
                    type="button"
                    className="px-3 py-2 text-charcoal hover:bg-cream font-semibold"
                    onClick={() => setQty((q) => q + 1)}
                  >
                    +
                  </button>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-charcoal/55">Line total</p>
                <p className="font-display text-2xl text-red">{formatMoney(unitPrice * qty)}</p>
              </div>
            </div>

            <button
              type="button"
              disabled={disabled}
              onClick={handleAdd}
              className="mt-6 w-full rounded-xl bg-red py-3.5 font-bold text-sm uppercase tracking-wider text-white shadow-[0_4px_0_#800] hover:opacity-95 disabled:opacity-40 disabled:shadow-none transition-all"
            >
              {disabled ? "Sold out" : "Add to bag"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
