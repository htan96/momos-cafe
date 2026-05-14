import Link from "next/link";
import CustomerPageHeader from "@/components/customer/CustomerPageHeader";
import CustomerShipmentCard from "@/components/customer/CustomerShipmentCard";
import type { CustomerTimelineStep } from "@/components/customer/CustomerTimeline";
import { mockShipments } from "@/lib/customer/mockAccount";

function toSteps(rows: { label: string; time: string }[]): CustomerTimelineStep[] {
  return rows.map((r, i) => ({
    id: `ship-${i}-${r.label}`,
    title: r.label,
    meta: r.time,
    tone: i === rows.length - 1 ? "current" : "done",
  }));
}

export default function AccountShipmentsPage() {
  return (
    <div className="space-y-10">
      <CustomerPageHeader
        eyebrow="Delivery"
        title="Parcels we’re watching for you"
        subtitle="Each card is a story in motion — tracking is masked for calm, full detail stays on your order page."
        illustrationAccentClassName="bg-teal/15"
      />

      <p className="-mt-2 text-[14px] text-charcoal/65 leading-relaxed">
        Live routing will aggregate here across visits. Until then, savor a few sample paths — including one running a
        touch behind.
      </p>

      <div className="grid gap-6 md:grid-cols-2">
        {mockShipments.map((s) => (
          <CustomerShipmentCard
            key={s.id}
            orderRef={s.orderRef}
            carrier={s.carrier}
            destination={s.destination}
            trackingMasked={s.trackingMasked}
            status={s.status}
            delayed={s.delayed}
            timeline={toSteps(s.timeline)}
          />
        ))}
      </div>

      <p className="text-[14px] text-charcoal/68">
        Need the full context?{" "}
        <Link href="/account" className="font-semibold text-teal-dark underline-offset-2 hover:underline">
          Open your dashboard
        </Link>{" "}
        or visit a specific order for items and receipts.
      </p>
    </div>
  );
}
