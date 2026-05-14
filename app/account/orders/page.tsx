import Link from "next/link";
import PlatformPlaceholderCard from "@/components/platform/PlatformPlaceholderCard";

export default function AccountOrdersListPage() {
  return (
    <div className="space-y-10">
      <PlatformPlaceholderCard
        title="Orders list"
        description="A dedicated list view is coming. Your live orders, history, and per-order tracking already appear on the account dashboard — open any order for status, shipments, and timeline."
      />
      <div className="flex flex-wrap gap-4 text-[14px]">
        <Link
          href="/account"
          className="inline-flex font-semibold text-teal-dark hover:text-red underline-offset-4 hover:underline"
        >
          ← Back to dashboard
        </Link>
        <span className="text-charcoal/30" aria-hidden>
          |
        </span>
        <span className="text-charcoal/65">
          Tip: use <span className="font-semibold text-charcoal">/account/orders/[id]</span> for a specific order you have the link for.
        </span>
      </div>
    </div>
  );
}
