import Link from "next/link";
import OpsPageHeader from "@/components/operations/OpsPageHeader";
import OpsPanel from "@/components/operations/OpsPanel";

/** Staff redirect target from legacy `/ops/order-lookup`. */
export default function AdminOrderLookupPage() {
  return (
    <div className="space-y-8">
      <OpsPageHeader title="Order lookup" subtitle="Commerce UUID search — open the staffed orders inbox for SSR timelines." />

      <OpsPanel title="Operational truth" eyebrow="/admin/orders">
        <p className="text-[13px] text-charcoal/70 mb-6">
          Every row opens <span className="font-mono text-[13px]">OperationalOrderConsole</span> timelines (payments · fulfillment ·
          webhooks · comms stubs) without bouncing through the storefront.
        </p>
        <Link
          href="/admin/orders"
          className="inline-flex rounded-lg border border-teal-dark/35 bg-teal/[0.07] px-4 py-2.5 text-[12px] font-semibold uppercase tracking-[0.12em] text-teal-dark hover:bg-teal/15 transition-colors"
        >
          Staff orders inbox →
        </Link>
      </OpsPanel>
    </div>
  );
}
