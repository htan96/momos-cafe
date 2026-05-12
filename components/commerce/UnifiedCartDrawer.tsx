"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCommerceCart } from "@/context/CartContext";
import { formatMoney } from "@/lib/commerce/fulfillmentPreview";
import { getCartItemTotal } from "@/types/ordering";
import type { UnifiedFoodLine, UnifiedMerchLine } from "@/types/commerce";
import CommerceQuantityControl from "@/components/commerce/CommerceQuantityControl";

/** Shared shell layout for the global cart surface (bottom sheet on mobile, centered card on desktop). */
export default function UnifiedCartDrawer() {
  const router = useRouter();
  const {
    drawerOpen,
    setDrawerOpen,
    lines,
    fulfillmentSummary,
    grandTotal,
    foodSubtotal,
    merchSubtotal,
    totalCount,
    setMerchQuantity,
    removeMerchLine,
    removeFoodLineAtIndex,
    updateFoodQuantityAtIndex,
  } = useCommerceCart();

  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setDrawerOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawerOpen, setDrawerOpen]);

  if (!drawerOpen) return null;

  const foodLines = lines.filter((l): l is UnifiedFoodLine => l.kind === "food");
  const merchLines = lines.filter((l): l is UnifiedMerchLine => l.kind === "merch");

  return (
    <div className="fixed inset-0 z-[960] flex justify-end lg:justify-center lg:items-start lg:pt-24">
      <button
        type="button"
        aria-label="Close cart"
        className="absolute inset-0 bg-charcoal/50"
        onClick={() => setDrawerOpen(false)}
      />
      <aside className="relative z-[961] w-full max-w-md bg-cream shadow-2xl flex flex-col max-h-[92vh] lg:max-h-[85vh] rounded-t-2xl lg:rounded-2xl overflow-hidden border border-cream-dark pb-[env(safe-area-inset-bottom)] mt-auto lg:mt-0">
        <header className="flex items-start justify-between px-5 py-4 border-b border-cream-dark bg-white gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-teal-dark">
              Your cart
            </p>
            <h2 className="font-display text-xl text-charcoal">Kitchen + shop</h2>
            {fulfillmentSummary.isMixed && (
              <p className="text-xs text-charcoal/60 mt-1 leading-snug">
                Mixed pickup timing — food is ASAP; merch follows retail windows below.
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => setDrawerOpen(false)}
            className="rounded-full border border-cream-dark w-9 h-9 text-charcoal/60 hover:bg-cream text-lg leading-none shrink-0"
          >
            ×
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
          {totalCount === 0 && (
            <div className="text-center py-10 px-2">
              <p className="font-display text-lg text-charcoal">Cart is empty</p>
              <p className="text-sm text-charcoal/55 mt-2">
                Grab breakfast pickup from Order or browse merch in Shop.
              </p>
              <div className="flex flex-col gap-2 mt-6">
                <Link
                  href="/order"
                  className="rounded-xl bg-red text-white font-semibold py-3 text-sm"
                  onClick={() => setDrawerOpen(false)}
                >
                  Order food
                </Link>
                <Link
                  href="/shop"
                  className="rounded-xl border-2 border-teal-dark text-teal-dark font-semibold py-3 text-sm"
                  onClick={() => setDrawerOpen(false)}
                >
                  Visit shop
                </Link>
              </div>
            </div>
          )}
          {totalCount > 0 &&
            fulfillmentSummary.groups.map((g) => (
              <section key={g.pipeline} className="rounded-xl border border-cream-dark bg-white p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-teal-dark">{g.title}</p>
                    <p className="text-xs text-charcoal/55 mt-0.5">{g.subtitle}</p>
                  </div>
                </div>
                <p className="text-sm text-charcoal mt-2 leading-snug">{g.etaHint}</p>
                <ul className="mt-3 space-y-2 border-t border-cream-dark pt-3">
                  {g.pipeline === "KITCHEN"
                    ? foodLines.map((line, labelIdx) => (
                        <li
                          key={line.lineId}
                          className="flex gap-3 text-sm border-b border-cream-dark/60 pb-2 last:border-0 last:pb-0"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-charcoal">{line.name}</p>
                            <p className="text-teal-dark font-semibold text-xs mt-0.5">
                              {formatMoney(
                                getCartItemTotal({
                                  id: line.id,
                                  variationId: line.variationId,
                                  name: line.name,
                                  price: line.price,
                                  quantity: line.quantity,
                                  modifiers: line.modifiers,
                                })
                              )}
                            </p>
                          </div>
                          <CommerceQuantityControl
                            quantity={line.quantity}
                            onDelta={(delta) => updateFoodQuantityAtIndex(labelIdx, delta)}
                          />
                          <button
                            type="button"
                            className="text-xs text-red font-semibold underline-offset-2 hover:underline shrink-0"
                            onClick={() => removeFoodLineAtIndex(labelIdx)}
                          >
                            Remove
                          </button>
                        </li>
                      ))
                    : merchLines.map((line) => (
                        <li
                          key={line.lineId}
                          className="flex gap-3 text-sm border-b border-cream-dark/60 pb-2 last:border-0 last:pb-0"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-charcoal">{line.name}</p>
                            <p className="text-[11px] text-charcoal/50">{line.variantSummary}</p>
                            <p className="text-teal-dark font-semibold text-xs mt-0.5">
                              {formatMoney(line.unitPrice * line.quantity)}
                            </p>
                          </div>
                          <CommerceQuantityControl
                            quantity={line.quantity}
                            onDelta={(delta) => setMerchQuantity(line.lineId, line.quantity + delta)}
                          />
                          <button
                            type="button"
                            className="text-xs text-red font-semibold underline-offset-2 hover:underline shrink-0"
                            onClick={() => removeMerchLine(line.lineId)}
                          >
                            Remove
                          </button>
                        </li>
                      ))}
                </ul>
              </section>
            ))}

          {totalCount > 0 && fulfillmentSummary.messages.length > 0 && (
            <div className="rounded-lg bg-cream-dark/40 border border-cream-dark px-3 py-2 text-xs text-charcoal/75 space-y-1">
              {fulfillmentSummary.messages.map((m, i) => (
                <p key={i}>{m}</p>
              ))}
            </div>
          )}
        </div>

        <footer className="border-t border-cream-dark bg-white px-5 py-4 space-y-3">
          {totalCount > 0 && (
            <>
              <div className="flex justify-between text-sm">
                <span className="text-charcoal/65">Food subtotal</span>
                <span className="font-semibold">{formatMoney(foodSubtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-charcoal/65">Shop subtotal</span>
                <span className="font-semibold">{formatMoney(merchSubtotal)}</span>
              </div>
              <div className="flex justify-between font-display text-lg border-t border-cream-dark pt-2">
                <span>Total</span>
                <span>{formatMoney(grandTotal)}</span>
              </div>
            </>
          )}

          <div className="flex flex-col gap-2">
            {totalCount > 0 && (
              <button
                type="button"
                className="w-full rounded-xl bg-red text-white font-semibold py-3 text-sm tracking-wide hover:opacity-95"
                onClick={() => {
                  setDrawerOpen(false);
                  router.push("/checkout");
                }}
              >
                Checkout
              </button>
            )}
            <div className="flex flex-col gap-2 sm:flex-row">
              <Link
                href="/order"
                className="flex-1 text-center rounded-xl border-2 border-teal-dark text-teal-dark font-semibold py-2.5 text-sm"
                onClick={() => setDrawerOpen(false)}
              >
                Add food
              </Link>
              <Link
                href="/shop"
                className="flex-1 text-center rounded-xl border-2 border-teal-dark text-teal-dark font-semibold py-2.5 text-sm"
                onClick={() => setDrawerOpen(false)}
              >
                Add shop picks
              </Link>
            </div>
          </div>
        </footer>
      </aside>
    </div>
  );
}
