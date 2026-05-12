"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useCommerceCart } from "@/context/CartContext";
import { formatMoney } from "@/lib/commerce/fulfillmentPreview";

/**
 * Registers a draft `CommerceOrder` with retail lines via POST /api/orders.
 * Payment capture remains on Square rails — draft exists for fulfillment grouping / ops visibility.
 */
export default function RetailDraftCheckoutSection() {
  const { guestCartToken: token, lines: allLines, merchSubtotal } = useCommerceCart();

  const merchLines = useMemo(() => allLines.filter((l) => l.kind === "merch"), [allLines]);
  const serialized = useMemo(() => merchLines.map((l) => ({ ...l })), [merchLines]);

  const [loading, setLoading] = useState(false);
  const [resultMsg, setResultMsg] = useState<string | null>(null);

  const createDraft = async () => {
    if (serialized.length === 0) return;
    setLoading(true);
    setResultMsg(null);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guestToken: token ?? undefined,
          lines: serialized,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        orderId?: string;
        fulfillmentGroupsCreated?: number;
        error?: string;
      };
      if (!res.ok) {
        setResultMsg(typeof data?.error === "string" ? data.error : "Could not create shop order draft.");
      } else {
        setResultMsg(
          `Shop draft ready — order ${(data.orderId ?? "").slice(0, 8)}… (${data.fulfillmentGroupsCreated ?? 0} fulfillment group(s)). Team will confirm payment/shipping shortly.`
        );
      }
    } catch {
      setResultMsg("Network error creating draft order.");
    } finally {
      setLoading(false);
    }
  };

  if (merchLines.length === 0) return null;

  return (
    <section
      aria-label="Shop checkout"
      className="rounded-2xl border border-cream-dark bg-white shadow-sm overflow-hidden"
    >
      <div className="bg-charcoal px-5 py-3 flex items-center justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-white/65">Shop pickup & ship</p>
          <p className="font-display text-lg text-cream">Retail lines</p>
        </div>
        <span className="font-display text-xl text-gold">{formatMoney(merchSubtotal)}</span>
      </div>
      <div className="p-5 space-y-3 text-sm text-charcoal/80 leading-snug">
        <p>
          Food pickup uses the checkout steps beside this card when both are present. Submit a merch draft order so fulfillment groups can mirror your bag (pickup desk vs ship-eligible SKU).
        </p>
        <button
          type="button"
          disabled={loading}
          onClick={createDraft}
          className="w-full rounded-xl border-2 border-teal-dark text-teal-dark font-semibold py-3 text-sm tracking-wide hover:bg-teal-dark/5 disabled:opacity-50"
        >
          {loading ? "Submitting draft…" : "Create shop draft order"}
        </button>
        {resultMsg && <p className="text-xs text-charcoal/70">{resultMsg}</p>}
        <p className="text-[11px] text-charcoal/45">
          Browse more in{" "}
          <Link href="/shop" className="text-teal-dark font-semibold underline-offset-2 hover:underline">
            Shop
          </Link>
          . Square payment reconciliation for bundled carts continues on the roadmap.
        </p>
      </div>
    </section>
  );
}
