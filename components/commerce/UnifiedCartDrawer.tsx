"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCommerceCart } from "@/context/CartContext";
import { formatMoney } from "@/lib/commerce/fulfillmentPreview";
import { getCartItemTotal } from "@/types/ordering";
import type { UnifiedFoodLine, UnifiedMerchLine } from "@/types/commerce";
import CommerceQuantityControl from "@/components/commerce/CommerceQuantityControl";
import { useAdminSettings } from "@/lib/useAdminSettings";
import { validateCartEligibilityFromAdminSettings } from "@/lib/ordering/validateCartEligibility";

function FoodLineRow({
  line,
  labelIdx,
  updateFoodQuantityAtIndex,
  removeFoodLineAtIndex,
  muted,
}: {
  line: UnifiedFoodLine;
  labelIdx: number;
  updateFoodQuantityAtIndex: (index: number, delta: number) => void;
  removeFoodLineAtIndex: (index: number) => void;
  muted?: boolean;
}) {
  return (
    <li
      className={`flex gap-3 text-sm border-b border-cream-dark/60 pb-2 last:border-0 last:pb-0 ${
        muted ? "opacity-80" : ""
      }`}
    >
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-charcoal">{line.name}</p>
        {muted ? (
          <p className="text-[11px] text-charcoal/50 mt-1 leading-snug">
            This item is currently unavailable but has been saved for later.
          </p>
        ) : null}
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
  );
}

/** Shared shell layout for the global cart surface (bottom sheet on mobile, centered card on desktop). */
export default function UnifiedCartDrawer() {
  const router = useRouter();
  const { settings } = useAdminSettings();
  const {
    drawerOpen,
    setDrawerOpen,
    lines,
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

  const eligibility = useMemo(
    () => validateCartEligibilityFromAdminSettings(new Date(), lines, settings),
    [lines, settings]
  );

  const foodLinesOrdered = lines.filter((l): l is UnifiedFoodLine => l.kind === "food");
  const merchLines = lines.filter((l): l is UnifiedMerchLine => l.kind === "merch");

  const foodIndexByLineId = useMemo(() => {
    const m = new Map<string, number>();
    foodLinesOrdered.forEach((line, i) => m.set(line.lineId, i));
    return m;
  }, [foodLinesOrdered]);

  const payableFoodLines = useMemo(
    () =>
      foodLinesOrdered.filter((l) => {
        if (!eligibility.kitchenAcceptsFoodNow) return false;
        return !l.savedForLater;
      }),
    [foodLinesOrdered, eligibility.kitchenAcceptsFoodNow]
  );

  const savedLaterFoodLines = useMemo(
    () =>
      foodLinesOrdered.filter((l) => {
        if (!eligibility.kitchenAcceptsFoodNow) return true;
        return l.savedForLater === true;
      }),
    [foodLinesOrdered, eligibility.kitchenAcceptsFoodNow]
  );

  const payableFoodSubtotal = useMemo(
    () =>
      payableFoodLines.reduce(
        (s, line) =>
          s +
          getCartItemTotal({
            id: line.id,
            variationId: line.variationId,
            name: line.name,
            price: line.price,
            quantity: line.quantity,
            modifiers: line.modifiers,
          }),
        0
      ),
    [payableFoodLines]
  );

  const drawerGrandTotal = payableFoodSubtotal + merchSubtotal;

  if (!drawerOpen) return null;

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
            <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-teal-dark">Your cart</p>
            <h2 className="font-display text-xl text-charcoal">Your picks</h2>
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
              <p className="text-sm text-charcoal/55 mt-2">Add something from Order or browse Shop — one bag for both.</p>
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

          {totalCount > 0 && (payableFoodLines.length > 0 || merchLines.length > 0) ? (
            <section className="rounded-xl border border-cream-dark bg-white p-4">
              <ul className="space-y-2">
                {payableFoodLines.map((line) => (
                  <FoodLineRow
                    key={line.lineId}
                    line={line}
                    labelIdx={foodIndexByLineId.get(line.lineId) ?? 0}
                    updateFoodQuantityAtIndex={updateFoodQuantityAtIndex}
                    removeFoodLineAtIndex={removeFoodLineAtIndex}
                  />
                ))}
                {payableFoodLines.length > 0 && merchLines.length > 0 ? (
                  <li className="list-none pt-2 mt-1 border-t border-cream-dark/80" aria-hidden />
                ) : null}
                {merchLines.map((line) => (
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
          ) : null}

          {totalCount > 0 && savedLaterFoodLines.length > 0 ? (
            <section className="rounded-xl border border-dashed border-teal-dark/35 bg-teal/5 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-teal-dark">Saved for later</p>
              <p className="text-xs text-charcoal/65 mt-1 leading-snug mb-3">
                {eligibility.kitchenAcceptsFoodNow
                  ? "Not included in today’s total — we’ll bring them back when they’re available again."
                  : "Saved while ordering is paused — still here when you’re ready."}
              </p>
              <ul className="space-y-2 border-t border-cream-dark/60 pt-3">
                {savedLaterFoodLines.map((line) => (
                  <FoodLineRow
                    key={line.lineId}
                    line={line}
                    labelIdx={foodIndexByLineId.get(line.lineId) ?? 0}
                    updateFoodQuantityAtIndex={updateFoodQuantityAtIndex}
                    removeFoodLineAtIndex={removeFoodLineAtIndex}
                    muted
                  />
                ))}
              </ul>
            </section>
          ) : null}

        </div>

        <footer className="border-t border-cream-dark bg-white px-5 py-4 space-y-3">
          {totalCount > 0 && (
            <>
              <div className="flex justify-between font-display text-lg border-t border-cream-dark pt-2">
                <span>Total</span>
                <span>{formatMoney(drawerGrandTotal)}</span>
              </div>
              {savedLaterFoodLines.length > 0 ? (
                <p className="text-[11px] text-charcoal/50 leading-snug">
                  Saved items aren’t included in this total.
                </p>
              ) : null}
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
