"use client";

import { formatMoney } from "@/lib/commerce/fulfillmentPreview";
import { commerceCheckoutShell } from "@/lib/commerce/tokens";
import { buildCheckoutDisplayGroups } from "@/lib/commerce/checkoutDisplayGroups";
import type { UnifiedCartLine, UnifiedFoodLine, UnifiedMerchLine } from "@/types/commerce";
import { useMemo, useState } from "react";

function lineTitle(l: UnifiedCartLine): string {
  if (l.kind === "food") {
    const f = l as UnifiedFoodLine;
    return f.quantity > 1 ? `${f.name} ×${f.quantity}` : f.name;
  }
  const m = l as UnifiedMerchLine;
  const variant = m.variantSummary?.trim();
  const base = variant ? `${m.name} (${variant})` : m.name;
  return m.quantity > 1 ? `${base} ×${m.quantity}` : base;
}

export default function CheckoutOrderSummary({
  lines,
  heldAsideFoodLines,
  variant = "both",
}: {
  lines: UnifiedCartLine[];
  /** Food lines present in the bag but not payable in this checkout window (informational). */
  heldAsideFoodLines?: UnifiedFoodLine[];
  variant?: "mobile" | "desktop" | "both";
}) {
  const groups = useMemo(() => buildCheckoutDisplayGroups(lines), [lines]);
  const [mobileOpen, setMobileOpen] = useState(false);

  const subtotals = useMemo(() => {
    let food = 0;
    let merch = 0;
    for (const l of lines) {
      if (l.kind === "food") {
        const f = l as UnifiedFoodLine;
        const mod = f.modifiers?.reduce((s, m) => s + (Number(m.price) || 0), 0) ?? 0;
        food += (f.price + mod) * f.quantity;
      } else {
        const m = l as UnifiedMerchLine;
        merch += m.unitPrice * m.quantity;
      }
    }
    return { food, merch, total: food + merch };
  }, [lines]);

  const inner = (
    <>
      <div className="px-4 py-3 border-b border-cream-dark bg-teal-dark/95 text-cream">
        <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-cream/80">
          Checkout summary
        </p>
        <p className="font-display text-lg mt-0.5">Your order</p>
      </div>
      <div className="p-4 space-y-5 max-h-[min(62vh,520px)] overflow-y-auto">
        {groups.length === 0 &&
        (!heldAsideFoodLines || heldAsideFoodLines.length === 0) ? (
          <p className="text-sm text-charcoal/55">Nothing here yet.</p>
        ) : (
          groups.map((g) => (
            <div key={g.key}>
              {g.title ? (
                <p className="text-[11px] font-semibold uppercase tracking-wider text-teal-dark mb-2">{g.title}</p>
              ) : null}
              <ul className="space-y-2">
                {g.lines.map((l) => (
                  <li
                    key={l.lineId}
                    className="flex justify-between gap-3 text-sm text-charcoal/85 leading-snug"
                  >
                    <span className="min-w-0">{lineTitle(l)}</span>
                    <span className="shrink-0 font-medium text-charcoal">
                      {l.kind === "food"
                        ? formatMoney(
                            ((l as UnifiedFoodLine).price +
                              ((l as UnifiedFoodLine).modifiers?.reduce(
                                (s, m) => s + (Number(m.price) || 0),
                                0
                              ) ?? 0)) *
                              (l as UnifiedFoodLine).quantity
                          )
                        : formatMoney((l as UnifiedMerchLine).unitPrice * (l as UnifiedMerchLine).quantity)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))
        )}
        {heldAsideFoodLines && heldAsideFoodLines.length > 0 ? (
          <div className="border-t border-dashed border-cream-dark pt-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-teal-dark mb-2">Saved for later</p>
            <p className="text-xs text-charcoal/60 leading-relaxed mb-3">
              Not part of today’s total — we’ll bring them back when they’re available again.
            </p>
            <ul className="space-y-2">
              {heldAsideFoodLines.map((f) => (
                <li
                  key={f.lineId}
                  className="flex justify-between gap-3 text-sm text-charcoal/65 leading-snug border-l-2 border-teal-dark/20 pl-3 -ml-0.5"
                >
                  <span className="min-w-0">{lineTitle(f)}</span>
                  <span className="shrink-0 font-medium">
                    {formatMoney(
                      (f.price + (f.modifiers?.reduce((s, m) => s + (Number(m.price) || 0), 0) ?? 0)) *
                        f.quantity
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
      <div className="px-4 py-3 border-t border-cream-dark bg-cream/80 text-sm space-y-1">
        <div className="flex justify-between font-display text-lg text-charcoal pt-1">
          <span>Subtotal</span>
          <span>{formatMoney(subtotals.total)}</span>
        </div>
        <p className="text-[11px] text-charcoal/45 leading-snug pt-1">
          Tax and final total are confirmed beside payment.
        </p>
      </div>
    </>
  );

  return (
    <>
      {(variant === "mobile" || variant === "both") && (
      <div className="md:hidden sticky top-0 z-10 bg-cream/95 backdrop-blur border-b border-cream-dark px-4 py-2">
        <button
          type="button"
          onClick={() => setMobileOpen((o) => !o)}
          className="w-full flex items-center justify-between text-sm font-semibold text-teal-dark"
          aria-expanded={mobileOpen}
        >
          <span>{mobileOpen ? "Hide summary" : "Show order summary"}</span>
          <span className="font-display text-charcoal">{formatMoney(subtotals.total)}</span>
        </button>
        {mobileOpen ? <div className="mt-2 rounded-xl border border-cream-dark overflow-hidden">{inner}</div> : null}
      </div>
      )}

      {(variant === "desktop" || variant === "both") && (
      <aside
        className={`hidden md:block ${commerceCheckoutShell.card} md:sticky md:top-24 overflow-hidden`}
        aria-label="Order summary"
      >
        {inner}
      </aside>
      )}
    </>
  );
}
