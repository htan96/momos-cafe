import Link from "next/link";

import OpsMetricQuiet from "@/components/operations/OpsMetricQuiet";
import OpsPanel from "@/components/operations/OpsPanel";
import OpsStatusPill from "@/components/operations/OpsStatusPill";
import type { AdminCommerceOrdersIndexPayload } from "@/lib/admin/loadAdminCommerceOrdersIndex";

/** Developer-facing list semantics for delegated super-admin viewers on `/admin/orders`. */
export default function OrdersSuperAdminTechnicalPanel(props: { bundle: AdminCommerceOrdersIndexPayload }) {
  const { bundle } = props;
  const relaxed = bundle.operationalLens;

  return (
    <div className="space-y-10">
      <div className="grid gap-4 sm:grid-cols-3">
        <OpsMetricQuiet
          label="Query posture"
          value={relaxed ? "Exploratory" : "Admin-strict"}
          hint="Operational lens skips paid + partition predicates so drafts / pending-payment shells remain visible inside the UTC placement window."
        />
        <OpsMetricQuiet
          label="Window (days)"
          value={String(bundle.windowDays)}
          hint="Rolling `commerce_orders.created_at` ≥ UTC midnight `(today − N)`."
        />
        <OpsMetricQuiet
          label="Matches (filtered total)"
          value={String(bundle.totalMatching)}
          hint={`Page ${bundle.page}, size ${bundle.pageSize} — count is entire result set matching the active Prisma branch.`}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <OpsPanel title="Prisma filter branch" eyebrow="super_admin operational lens helper">
          <div className="flex items-start justify-between gap-3 mb-4">
            <OpsStatusPill variant={relaxed ? "routing" : "delivered"}>
              {relaxed ? `Relaxed (${bundle.windowDays}d)` : `Strict (${bundle.windowDays}d)`}
            </OpsStatusPill>
          </div>
          {relaxed ?
            <p className="text-[13px] text-charcoal/68 leading-relaxed">
              Placement window only — statuses such as `draft` / `pending_payment` intentionally remain eligible for scanners
              and reconciliation tooling routed from `/super-admin/order-operations`.
            </p>
          : (
            <ul className="list-disc ml-5 text-[13px] text-charcoal/68 space-y-1.5 leading-relaxed">
              <li>
                <span className="font-semibold text-charcoal">Partition</span> — `fulfillment_groups` relation exists (≥ 1 row;
                partitions use `FulfillmentGroup.pipeline`).
              </li>
              <li>
                <span className="font-semibold text-charcoal">Captured payment</span> — `payment_records.status = completed`.
              </li>
              <li>
                <span className="font-semibold text-charcoal">Order status</span> — paid / partially_fulfilled / fulfilled.
              </li>
            </ul>
          )}
        </OpsPanel>

        <OpsPanel title="Cross-links" eyebrow="Heavier consoles">
          <p className="text-[13px] text-charcoal/68 leading-relaxed mb-4">
            Unfiltered exploratory grid (75-row cap), UUID / email search, and richer status predicates stay on governance routes—not surfaced to regular admins.
          </p>
          <Link
            href="/super-admin/order-operations"
            className="inline-flex rounded-lg border border-cream-dark bg-white px-3 py-2 text-[12px] font-semibold text-charcoal/85 uppercase tracking-[0.1em] hover:bg-cream/80 transition-colors"
          >
            Order operations workspace
          </Link>
        </OpsPanel>
      </div>
    </div>
  );
}
