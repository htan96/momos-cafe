import Link from "next/link";
import PlatformPlaceholderCard from "@/components/platform/PlatformPlaceholderCard";

export default function AccountShipmentsPage() {
  return (
    <div className="space-y-8">
      <PlatformPlaceholderCard
        title="Shipments"
        description="Carrier labels, tracking links, and delivery status for mail-order items will aggregate here. Open any order from the dashboard or orders list for fulfillment detail in the meantime."
      />
      <p className="text-[14px] text-charcoal/70">
        Order-level tracking lives on{" "}
        <Link href="/account" className="font-semibold text-teal-dark hover:underline underline-offset-2">
          your dashboard
        </Link>{" "}
        and on each order&apos;s detail page.
      </p>
    </div>
  );
}
