"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import type { UnifiedFoodLine, UnifiedMerchLine } from "@/types/commerce";
import { useCommerceCart } from "@/context/CartContext";
import { formatMoney } from "@/lib/commerce/fulfillmentPreview";
import { getCartItemTotal } from "@/types/ordering";
import CommerceQuantityControl from "@/components/commerce/CommerceQuantityControl";

interface CartSidebarProps {
  headerOffset?: number;
  orderingDisabled?: boolean;
}

export default function CartSidebar({
  headerOffset = 64,
  orderingDisabled = false,
}: CartSidebarProps) {
  const router = useRouter();
  const {
    lines,
    fulfillmentSummary,
    merchCount,
    merchSubtotal,
    grandTotal,
    foodSubtotal,
    totalCount,
    removeFoodLineAtIndex,
    updateFoodQuantityAtIndex,
    removeMerchLine,
    setMerchQuantity,
    setDrawerOpen,
  } = useCommerceCart();

  const foodLines = useMemo(
    () => lines.filter((l): l is UnifiedFoodLine => l.kind === "food"),
    [lines]
  );
  const merchLines = useMemo(
    () => lines.filter((l): l is UnifiedMerchLine => l.kind === "merch"),
    [lines]
  );

  const checkoutDisabled = orderingDisabled && merchCount === 0 && foodLines.length > 0;

  const stickyTop = headerOffset + 52 + 16;
  const stickyMaxH = `calc(100vh - ${headerOffset + 52 + 40}px)`;

  return (
    <aside
      className="sticky hidden lg:flex flex-col w-full max-w-[360px] rounded-2xl border border-cream-dark bg-cream overflow-hidden shadow-[0_12px_40px_-24px_rgba(44,44,44,0.35)]"
      style={{
        top: `${stickyTop}px`,
        maxHeight: stickyMaxH,
      }}
    >
      <header className="flex items-start justify-between px-5 py-4 border-b border-cream-dark bg-white gap-3 shrink-0">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-teal-dark">Your cart</p>
          <h3 className="font-display text-xl text-charcoal leading-tight">Kitchen + shop</h3>
          {fulfillmentSummary.isMixed && (
            <p className="text-xs text-charcoal/60 mt-1 leading-snug">
              Mixed pickup timing — food is ASAP; retail follows its own window.
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className="text-[11px] font-semibold uppercase tracking-wide text-teal-dark hover:text-charcoal shrink-0"
        >
          Expand
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5 min-h-0">
        {totalCount === 0 ? (
          <div className="text-center py-10 px-2 rounded-xl border border-dashed border-cream-dark bg-white">
            <p className="font-display text-lg text-charcoal">Cart is empty</p>
            <p className="text-sm text-charcoal/55 mt-2 leading-snug">
              Add plates from the menu — shop picks live in the same bag.
            </p>
            <Link
              href="/shop"
              className="inline-block mt-5 text-sm font-semibold text-teal-dark hover:underline underline-offset-2"
            >
              Browse the shop
            </Link>
          </div>
        ) : (
          <>
            {fulfillmentSummary.groups.map((g) => (
              <section key={g.pipeline} className="rounded-xl border border-cream-dark bg-white p-4">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-teal-dark">{g.title}</p>
                  <p className="text-xs text-charcoal/55 mt-0.5">{g.subtitle}</p>
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
                            {line.modifiers && line.modifiers.length > 0 && (
                              <p className="text-[11px] text-charcoal/50 mt-0.5 leading-snug">
                                {line.modifiers.map((m) => m.name).join(", ")}
                              </p>
                            )}
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
                            className="text-xs text-red font-semibold underline-offset-2 hover:underline shrink-0 self-start pt-0.5"
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
                            className="text-xs text-red font-semibold underline-offset-2 hover:underline shrink-0 self-start pt-0.5"
                            onClick={() => removeMerchLine(line.lineId)}
                          >
                            Remove
                          </button>
                        </li>
                      ))}
                </ul>
              </section>
            ))}

            {fulfillmentSummary.messages.length > 0 && (
              <div className="rounded-lg bg-cream-dark/40 border border-cream-dark px-3 py-2 text-xs text-charcoal/75 space-y-1">
                {fulfillmentSummary.messages.map((m, i) => (
                  <p key={i}>{m}</p>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {totalCount > 0 && (
        <footer className="border-t border-cream-dark bg-white px-5 py-4 space-y-3 shrink-0">
          <div className="flex justify-between text-sm">
            <span className="text-charcoal/65">Food subtotal</span>
            <span className="font-semibold">{formatMoney(foodSubtotal)}</span>
          </div>
          {merchCount > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-charcoal/65">Shop subtotal</span>
              <span className="font-semibold">{formatMoney(merchSubtotal)}</span>
            </div>
          )}
          <div className="flex justify-between font-display text-lg border-t border-cream-dark pt-2">
            <span className="text-charcoal">Total</span>
            <span>{formatMoney(grandTotal)}</span>
          </div>

          <button
            type="button"
            disabled={checkoutDisabled}
            className={`w-full rounded-xl font-semibold py-3 text-sm tracking-wide transition-opacity ${
              checkoutDisabled
                ? "bg-charcoal/25 text-charcoal/50 cursor-not-allowed"
                : "bg-red text-white hover:opacity-95"
            }`}
            onClick={() => {
              if (checkoutDisabled) return;
              router.push("/checkout");
            }}
          >
            {checkoutDisabled ? "Kitchen checkout paused" : "Checkout"}
          </button>

          <p className="text-center text-[11px] text-charcoal/55 leading-snug">
            {orderingDisabled && foodLines.length > 0 && merchCount > 0
              ? "Food checkout follows the next open window — shop items can still finish at checkout when eligible."
              : "Same checkout as Shop — one ticket, coordinated pickup notes."}
          </p>

          <div className="flex justify-center gap-3 text-[11px]">
            <button
              type="button"
              className="font-semibold text-teal-dark hover:underline underline-offset-2"
              onClick={() => setDrawerOpen(true)}
            >
              Open full cart
            </button>
            <span className="text-charcoal/25" aria-hidden>
              ·
            </span>
            <Link href="/shop" className="font-semibold text-teal-dark hover:underline underline-offset-2">
              Add shop picks
            </Link>
          </div>
        </footer>
      )}
    </aside>
  );
}
