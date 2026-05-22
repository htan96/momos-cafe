import Link from "next/link";

import { OperationalActionCard, OptionalPreviewPlaceholder } from "@/components/admin/operational/AdminOperationalPrimitives";

import type { loadAdminFulfillmentWorkload } from "@/lib/admin/adminConsoleLoaders";

type WorkloadMetrics = Awaited<ReturnType<typeof loadAdminFulfillmentWorkload>>["metrics"];

/**
 * Admin-focused fulfillment KPI row — plain language priorities (see platform TODO Admin-Focused Fulfillment).
 * Super-admin-only technical heuristics and API notes live elsewhere.
 */
export default function FulfillmentOperationalCards(props: {
  metrics: WorkloadMetrics;
  packingQueueCount: number;
}) {
  const { metrics, packingQueueCount } = props;

  const ordersDelayedInfo =
    "Counts orders whose fulfillment milestones look stuck using the same daily checks as the ops console—not a billing or payment status.";
  const kitchenFollowUpInfo =
    "Includes pickup- and prep-heavy pipelines when they appear in stuck or slow-moving slices.";
  const shippingReviewInfo =
    "Retail shipments that still need packing confirmation or a shipped label.";
  const packingQueueInfo = "Paid orders with an open fulfillment group in the packing list below.";
  const labelsPendingInfo = "Shipments staged for labeling that do not yet have tracking.";

  return (
    <div className="space-y-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-charcoal/45">Fulfillment priorities</p>
      <div className="grid gap-3 sm:grid-cols-3">
        <OperationalActionCard
          href="/admin/fulfillment#fulfillment-floor-board"
          title="Orders Delayed"
          subtitle="Orders that have not progressed today"
          count={metrics.coldChainOrLateStuckAttention}
          infoAriaLabel={ordersDelayedInfo}
        />
        <OperationalActionCard
          href="/admin/fulfillment?tab=pickup"
          title="Kitchen Follow-up"
          subtitle="Orders flagged for prep or timing issues"
          count={metrics.kitchenAttentionEstimate}
          infoAriaLabel={kitchenFollowUpInfo}
        />
        <OperationalActionCard
          href="/admin/fulfillment?tab=shipping"
          title="Shipping Review"
          subtitle="Orders needing label or packing confirmation"
          count={metrics.retailShipAttentionEstimate}
          infoAriaLabel={shippingReviewInfo}
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <OperationalActionCard
          href="/admin/fulfillment#fulfillment-packing-queue"
          title="Packing Queue"
          subtitle="Orders currently in packing"
          count={packingQueueCount}
          infoAriaLabel={packingQueueInfo}
        />
        <OperationalActionCard
          href="/admin/shipping"
          title="Labels Pending"
          subtitle="Orders waiting for labels"
          count={metrics.labelPendingCount}
          infoAriaLabel={labelsPendingInfo}
        />
        <OptionalPreviewPlaceholder
          title="Sample Packing Slip"
          subtitle="Quick visual check only—printing uses live order data elsewhere."
          body={
            <div className="rounded-lg border border-dashed border-charcoal/[0.12] bg-cream/55 px-3 py-5 text-center">
              <Link
                href="#fulfillment-slip-preview"
                className="text-[12px] font-semibold text-teal-dark hover:underline underline-offset-4"
              >
                Open preview lower on this page
              </Link>
            </div>
          }
        />
      </div>
    </div>
  );
}
