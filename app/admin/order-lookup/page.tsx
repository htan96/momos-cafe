import Link from "next/link";
import OpsPageHeader from "@/components/operations/OpsPageHeader";
import OpsPanel from "@/components/operations/OpsPanel";

export default function AdminOrderLookupPage() {
  return (
    <div className="space-y-8">
      <OpsPageHeader title="Order lookup" subtitle="Search is not routed through this scaffold — operational truth lives behind the guarded ops console orders list." />

      <OpsPanel title="Jump to tooling" eyebrow="Live read models">
        <p className="text-[13px] text-charcoal/70 mb-6">
          Use the ops workspace to page real Commerce orders, shipments, refunds, and activities with auth-gated loaders.
        </p>
        <Link
          href="/ops/orders"
          className="inline-flex rounded-lg border border-teal-dark/35 bg-teal/[0.07] px-4 py-2.5 text-[12px] font-semibold uppercase tracking-[0.12em] text-teal-dark hover:bg-teal/15 transition-colors"
        >
          Ops · orders →
        </Link>
      </OpsPanel>

      <OpsPanel title="Operational timeline preview" eyebrow="Not loaded here">
        <p className="text-[13px] text-charcoal/62 leading-relaxed">
          Selecting an individual order attaches `OperationalActivityEvent`, webhook receipts, refunds, shipments, internal comms —
          hydrate those via{" "}
          <Link href="/ops/orders" className="text-teal-dark font-semibold hover:underline underline-offset-4">
            /ops/orders
          </Link>
          .
        </p>
      </OpsPanel>
    </div>
  );
}
