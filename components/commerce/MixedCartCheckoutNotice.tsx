"use client";

import Link from "next/link";
import { useCommerceCart } from "@/context/CartContext";
import { formatMoney } from "@/lib/commerce/fulfillmentPreview";

interface MixedCartCheckoutNoticeProps {
  /** Narrow emphasis during payment step */
  variant?: "cart" | "checkout";
}

export default function MixedCartCheckoutNotice({
  variant = "cart",
}: MixedCartCheckoutNoticeProps) {
  const { merchCount, merchSubtotal } = useCommerceCart();
  if (merchCount === 0) return null;

  return (
    <div
      className={`rounded-xl border border-teal-dark/25 bg-teal-dark/5 px-4 py-3 text-sm text-charcoal ${
        variant === "checkout" ? "mb-3" : "mb-4"
      }`}
      role="status"
    >
      <p className="font-semibold text-teal-dark">
        {merchCount} shop item{merchCount === 1 ? "" : "s"} in your bag
        {merchSubtotal > 0 ? ` · ${formatMoney(merchSubtotal)}` : ""}
      </p>
      <p className="text-charcoal/75 mt-1 leading-snug">
        Everything in your bag checks out together on the{" "}
        <Link href="/checkout" className="font-semibold text-teal-dark underline-offset-2 hover:underline">
          checkout
        </Link>{" "}
        page.
      </p>
    </div>
  );
}
