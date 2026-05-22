import Link from "next/link";

import { OperationalActionCard, OptionalPreviewPlaceholder } from "@/components/admin/operational/AdminOperationalPrimitives";

/** Admin-focused shipping priorities — anchored to queues on `/admin/shipping`. Super-admin technical notes live separately. */
export default function ShippingOperationalCards(props: {
  ordersWithIssuesCount: number;
  parcelQueueReadyCount: number;
  ordersInProcessCount: number;
  pendingLabelCount: number;
}) {
  const { ordersWithIssuesCount, parcelQueueReadyCount, ordersInProcessCount, pendingLabelCount } = props;

  const ordersWithIssuesInfo =
    "Carrier exceptions and returns—including the retries and alerts shown in detail below—not card or payment declines.";
  const parcelQueueInfo =
    "Retail parcel orders next up for packing or attaching tracking. Rows already marked shipped stay in the list but are excluded from this count.";
  const inProcessInfo =
    "Orders flagged as actively being packed or staged for shipment handoff—not waiting to start.";
  const labelsPendingInfo =
    "Shipments recorded without tracking yet—in the Labels pending list farther down this page.";

  return (
    <div className="space-y-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-charcoal/45">Shipping priorities</p>
      <div className="grid gap-3 sm:grid-cols-3">
        <OperationalActionCard
          href="/admin/shipping#shipping-issues-queue"
          title="Orders with Issues"
          subtitle="Orders that require admin attention"
          count={ordersWithIssuesCount}
          infoAriaLabel={ordersWithIssuesInfo}
        />
        <OperationalActionCard
          href="/admin/shipping#shipping-parcel-queue"
          title="Parcel Queue"
          subtitle="Orders ready for packing and shipment"
          count={parcelQueueReadyCount}
          infoAriaLabel={parcelQueueInfo}
        />
        <OperationalActionCard
          href="/admin/shipping#shipping-in-process-queue"
          title="Orders in Process"
          subtitle="Orders currently being prepared or packaged"
          count={ordersInProcessCount}
          infoAriaLabel={inProcessInfo}
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <OperationalActionCard
          href="/admin/shipping#shipping-labels-pending"
          title="Labels Pending"
          subtitle="Orders waiting for labels"
          count={pendingLabelCount}
          infoAriaLabel={labelsPendingInfo}
        />
        <OptionalPreviewPlaceholder
          title="Sample Packing Slip"
          subtitle="Quick visual reference only."
          body={
            <div className="rounded-lg border border-dashed border-charcoal/[0.12] bg-cream/55 px-3 py-5 text-center">
              <Link
                href="/admin/shipping#shipping-slip-preview"
                className="text-[12px] font-semibold text-teal-dark hover:underline underline-offset-4"
              >
                Open preview lower on this page
              </Link>
            </div>
          }
        />
        <OptionalPreviewPlaceholder
          title="Product Reference"
          subtitle="Synced catalog snapshot timing from Square—not a storefront editor."
          body={
            <div className="rounded-lg border border-dashed border-charcoal/[0.12] bg-cream/55 px-3 py-5 text-center">
              <Link
                href="/admin/shipping#shipping-product-reference"
                className="text-[12px] font-semibold text-teal-dark hover:underline underline-offset-4"
              >
                View sync timing below
              </Link>
            </div>
          }
        />
      </div>
    </div>
  );
}
