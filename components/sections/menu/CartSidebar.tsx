"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import type { UnifiedFoodLine, UnifiedMerchLine } from "@/types/commerce";
import { useCommerceCart } from "@/context/CartContext";
import { formatMoney } from "@/lib/commerce/fulfillmentPreview";
import { getCartItemTotal } from "@/types/ordering";
import CommerceQuantityControl from "@/components/commerce/CommerceQuantityControl";
import { useAdminSettings } from "@/lib/useAdminSettings";
import { validateCartEligibilityFromAdminSettings } from "@/lib/ordering/validateCartEligibility";

interface CartSidebarProps {
  headerOffset?: number;
  orderingDisabled?: boolean;
}

function SidebarFoodRow({
  line,
  labelIdx,
  muted,
  updateFoodQuantityAtIndex,
  removeFoodLineAtIndex,
}: {
  line: UnifiedFoodLine;
  labelIdx: number;
  muted?: boolean;
  updateFoodQuantityAtIndex: (index: number, delta: number) => void;
  removeFoodLineAtIndex: (index: number) => void;
}) {
  return (
    <li
      className={`flex gap-3 text-sm border-b border-cream-dark/60 pb-2 last:border-0 last:pb-0 ${
        muted ? "opacity-85" : ""
      }`}
    >
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-charcoal">{line.name}</p>
        {line.modifiers && line.modifiers.length > 0 && (
          <p className="text-[11px] text-charcoal/50 mt-0.5 leading-snug">
            {line.modifiers.map((m) => m.name).join(", ")}
          </p>
        )}
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
        className="text-xs text-red font-semibold underline-offset-2 hover:underline shrink-0 self-start pt-0.5"
        onClick={() => removeFoodLineAtIndex(labelIdx)}
      >
        Remove
      </button>
    </li>
  );
}

export default function CartSidebar({
  headerOffset = 64,
  orderingDisabled = false,
}: CartSidebarProps) {
  const router = useRouter();
  const { settings } = useAdminSettings();
  const {
    lines,
    merchCount,
    merchSubtotal,
    totalCount,
    removeFoodLineAtIndex,
    updateFoodQuantityAtIndex,
    removeMerchLine,
    setMerchQuantity,
    setDrawerOpen,
  } = useCommerceCart();

  const eligibility = useMemo(
    () => validateCartEligibilityFromAdminSettings(new Date(), lines, settings),
    [lines, settings]
  );

  const foodLinesOrdered = useMemo(
    () => lines.filter((l): l is UnifiedFoodLine => l.kind === "food"),
    [lines]
  );

  const merchLines = useMemo(
    () => lines.filter((l): l is UnifiedMerchLine => l.kind === "merch"),
    [lines]
  );

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

  /** Checkout disabled when ordering is paused and nothing in the bag is payable now. */
  const checkoutDisabled = orderingDisabled && merchCount === 0 && payableFoodLines.length === 0;

  const stickyTop = headerOffset + 52 + 16;
  const stickyMaxH = `calc(100dvh - ${headerOffset + 52 + 40}px)`;

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
          <h3 className="font-display text-xl text-charcoal leading-tight">Your picks</h3>
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
              Add plates from the menu or browse the shop — same bag.
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
            {payableFoodLines.length > 0 || merchLines.length > 0 ? (
              <section className="rounded-xl border border-cream-dark bg-white p-4">
                <ul className="space-y-2">
                  {payableFoodLines.map((line) => (
                    <SidebarFoodRow
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
                        className="text-xs text-red font-semibold underline-offset-2 hover:underline shrink-0 self-start pt-0.5"
                        onClick={() => removeMerchLine(line.lineId)}
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {savedLaterFoodLines.length > 0 ? (
              <section className="rounded-xl border border-dashed border-teal-dark/35 bg-teal/5 p-4">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-teal-dark">Saved for later</p>
                <p className="text-xs text-charcoal/65 mt-1 leading-snug mb-3">
                  {eligibility.kitchenAcceptsFoodNow
                    ? "Not included in today’s total — we’ll bring them back when they’re available again."
                    : "Saved while ordering is paused — still here when you’re ready."}
                </p>
                <ul className="space-y-2 border-t border-cream-dark/60 pt-3">
                  {savedLaterFoodLines.map((line) => (
                    <SidebarFoodRow
                      key={line.lineId}
                      muted
                      line={line}
                      labelIdx={foodIndexByLineId.get(line.lineId) ?? 0}
                      updateFoodQuantityAtIndex={updateFoodQuantityAtIndex}
                      removeFoodLineAtIndex={removeFoodLineAtIndex}
                    />
                  ))}
                </ul>
              </section>
            ) : null}

          </>
        )}
      </div>

      {totalCount > 0 && (
        <footer className="border-t border-cream-dark bg-white px-5 py-4 space-y-3 shrink-0">
          <div className="flex justify-between font-display text-lg border-t border-cream-dark pt-2">
            <span className="text-charcoal">Total</span>
            <span>{formatMoney(drawerGrandTotal)}</span>
          </div>
          {savedLaterFoodLines.length > 0 ? (
            <p className="text-[11px] text-charcoal/50 leading-snug">Saved items aren’t included in this total.</p>
          ) : null}

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
            {checkoutDisabled ? "Ordering paused" : "Checkout"}
          </button>

          <p className="text-center text-[11px] text-charcoal/55 leading-snug">
            {orderingDisabled && foodLinesOrdered.length > 0 && merchCount > 0
              ? "Café items join in on the next open window — shop picks can still check out."
              : "One checkout for everything in your bag."}
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
