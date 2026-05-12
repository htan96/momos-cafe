"use client";

import Link from "next/link";
import { useCommerceCart } from "@/context/CartContext";

interface MixedCartCheckoutNoticeProps {
  /** Narrow emphasis during payment step */
  variant?: "cart" | "checkout";
}

export default function MixedCartCheckoutNotice({
  variant = "cart",
}: MixedCartCheckoutNoticeProps) {
  const { merchCount, fulfillmentSummary, merchSubtotal } = useCommerceCart();
  if (merchCount === 0) return null;

  return (
    <div
      className={`rounded-xl border border-teal-dark/25 bg-teal-dark/5 px-4 py-3 text-sm text-charcoal ${
        variant === "checkout" ? "mb-3" : "mb-4"
      }`}
      role="region"
      aria-label="Shop bag reminder"
    >
      <p className="font-semibold text-teal-dark">
        You still have {merchCount} shop item{merchCount === 1 ? "" : "s"} in your unified cart
        {merchSubtotal > 0 ? ` (~$${merchSubtotal.toFixed(2)})` : ""}.
      </p>
      <p className="text-charcoal/75 mt-1 leading-snug">
        Visit{" "}
        <Link href="/checkout" className="font-semibold text-teal-dark underline-offset-2 hover:underline">
          Checkout
        </Link>{" "}
        to pay for food pickup — shop items submit a separate retail draft so fulfillment groups stay aligned.
      </p>
      <ul className="mt-2 space-y-1 text-xs text-charcoal/65">
        {fulfillmentSummary.groups.map((g) => (
          <li key={g.pipeline}>
            <span className="font-semibold text-charcoal/80">{g.title}:</span> {g.etaHint}
          </li>
        ))}
      </ul>
      {fulfillmentSummary.isMixed && (
        <p className="mt-2 text-xs text-charcoal/55">{fulfillmentSummary.messages[0]}</p>
      )}
    </div>
  );
}
