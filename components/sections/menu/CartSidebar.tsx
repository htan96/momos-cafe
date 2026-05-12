"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useRouter } from "next/navigation";
import type { CartItem } from "@/types/ordering";
import { getCartItemTotal } from "@/types/ordering";
import { getEstimatedPickupTime, formatPickupTime } from "@/lib/pickupTime";
import { useCommerceCart } from "@/context/CartContext";
import CommerceQuantityControl from "@/components/commerce/CommerceQuantityControl";

interface CartSidebarProps {
  headerOffset?: number;
  orderingDisabled?: boolean;
}

export default function CartSidebar({
  headerOffset = 128,
  orderingDisabled = false,
}: CartSidebarProps) {
  const router = useRouter();
  const {
    lines,
    merchCount,
    merchSubtotal,
    grandTotal,
    foodSubtotal,
    removeFoodLineAtIndex,
    updateFoodQuantityAtIndex,
    removeMerchLine,
    setMerchQuantity,
  } = useCommerceCart();

  const items: CartItem[] = useMemo(
    () =>
      lines
        .filter((l): l is typeof lines[number] & { kind: "food" } => l.kind === "food")
        .map((line) => ({
          id: line.id,
          variationId: line.variationId,
          name: line.name,
          price: line.price,
          quantity: line.quantity,
          modifiers: line.modifiers,
        })),
    [lines]
  );

  const merchLines = useMemo(
    () =>
      lines.filter((l): l is typeof lines[number] & { kind: "merch" } => l.kind === "merch"),
    [lines]
  );

  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);
  const estimatedPickupTime = useMemo(
    () => (itemCount > 0 ? getEstimatedPickupTime(itemCount) : null),
    [itemCount]
  );

  const checkoutDisabled =
    orderingDisabled &&
    merchCount === 0 &&
    items.length > 0;

  return (
    <aside
      className="sticky hidden lg:flex flex-col bg-white border-[1.5px] border-cream-dark rounded-2xl overflow-hidden"
      style={{
        top: `${headerOffset + 52 + 20}px`,
        maxHeight: `calc(100vh - ${headerOffset + 52 + 40}px)`,
      }}
    >
      <div className="bg-teal-dark px-5 py-4 flex items-center justify-between">
        <h3 className="font-display text-[22px] text-cream tracking-wide">Your Cart</h3>
        <span className="font-semibold text-[11px] text-white/65 tracking-wider uppercase">
          Kitchen + Shop
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {items.length === 0 && merchLines.length === 0 ? (
          <div className="text-center py-10">
            <span className="text-5xl block mb-3 opacity-50">🛒</span>
            <p className="font-semibold text-sm text-gray-mid tracking-wide">Your cart is empty</p>
            <small className="text-xs text-charcoal/40 block mt-1.5">Add items from the menu or Shop</small>
          </div>
        ) : (
          <div className="space-y-5">
            {items.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-teal-dark mb-2">Kitchen</p>
                <div className="space-y-0">
                  {items.map((item, foodIdx) => (
                    <div
                      key={`${item.id}-${item.variationId ?? "v"}-${foodIdx}`}
                      className="flex gap-3 items-start py-3 border-b border-cream-dark last:border-0"
                    >
                      <span className="text-2xl flex-shrink-0">🍽️</span>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm text-charcoal mb-0.5">{item.name}</div>
                        {item.modifiers && item.modifiers.length > 0 && (
                          <div className="text-[11.5px] text-gray-mid leading-snug">
                            {item.modifiers.map((m) => m.name).join(", ")}
                          </div>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          <CommerceQuantityControl
                            size="sm"
                            quantity={item.quantity}
                            onDelta={(delta) => updateFoodQuantityAtIndex(foodIdx, delta)}
                          />
                          <button
                            type="button"
                            className="text-[11px] font-semibold text-red uppercase tracking-wide hover:underline"
                            onClick={() => removeFoodLineAtIndex(foodIdx)}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                      <span className="font-display text-xl text-red flex-shrink-0">
                        ${getCartItemTotal(item).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {merchLines.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-teal-dark mb-2">Shop</p>
                <div className="space-y-2">
                  {merchLines.map((line) => (
                    <div key={line.lineId} className="flex gap-2 items-start py-2 border-b border-cream-dark/70 last:border-0">
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm text-charcoal">{line.name}</div>
                        <div className="text-[11px] text-charcoal/50">{line.variantSummary}</div>
                        <div className="flex items-center gap-2 mt-1.5">
                          <CommerceQuantityControl
                            size="sm"
                            quantity={line.quantity}
                            onDelta={(delta) => setMerchQuantity(line.lineId, line.quantity + delta)}
                          />
                          <button
                            type="button"
                            className="text-[11px] font-semibold text-red uppercase tracking-wide hover:underline"
                            onClick={() => removeMerchLine(line.lineId)}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                      <span className="font-display text-lg text-teal-dark shrink-0 mt-1">
                        ${(line.unitPrice * line.quantity).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {(items.length > 0 || merchLines.length > 0) && (
        <div className="p-4 border-t border-cream-dark bg-cream-mid space-y-2">
          <div className="flex justify-between items-center text-sm text-charcoal/70">
            <span>Food subtotal</span>
            <span>${foodSubtotal.toFixed(2)}</span>
          </div>
          {merchCount > 0 && (
            <div className="flex justify-between items-center text-sm text-charcoal/70">
              <span>Shop subtotal</span>
              <span>${merchSubtotal.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between items-baseline border-t border-cream-dark pt-2">
            <span className="font-semibold text-sm text-gray-mid tracking-wider uppercase">Total</span>
            <strong className="font-display text-[26px] text-charcoal">${grandTotal.toFixed(2)}</strong>
          </div>
          <button
            type="button"
            disabled={checkoutDisabled}
            className={`w-full py-3.5 px-4 rounded-lg font-semibold text-base transition-all ${
              checkoutDisabled
                ? "bg-gray-mid text-white/80 cursor-not-allowed shadow-none"
                : "bg-red text-white shadow-[0_3px_0_#800] hover:-translate-y-0.5"
            }`}
            onClick={() => {
              if (checkoutDisabled) return;
              router.push("/checkout");
            }}
          >
            {checkoutDisabled ? "Ordering is unavailable" : "Checkout →"}
          </button>
          <p className="text-center text-[11px] text-gray-mid font-medium tracking-wide">
            {orderingDisabled && items.length > 0 && merchCount > 0
              ? "Food ordering is paused — you can still finish shop items at checkout."
              : estimatedPickupTime
                ? `Est. food pickup: ${formatPickupTime(estimatedPickupTime)}`
                : "Pickup at Morgen's Kitchen"}
          </p>
          <div className="text-center text-[11px] text-charcoal/45">
            <Link href="/shop" className="text-teal-dark font-semibold hover:underline">
              Continue shopping
            </Link>
          </div>
        </div>
      )}
    </aside>
  );
}
