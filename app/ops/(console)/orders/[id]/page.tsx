import Link from "next/link";
import { notFound } from "next/navigation";
import OpsPageHeader from "@/components/ops/OpsPageHeader";
import OpsTimeline, { type OpsTimelineItem } from "@/components/ops/OpsTimeline";
import StateChip from "@/components/ops/StateChip";
import { opsLoadOrderDetail } from "@/lib/ops/queries";
import { formatUsdFromCents } from "@/lib/ops/formatUsd";

export default async function OpsOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const order = await opsLoadOrderDetail(id);
  if (!order) notFound();

  const timeline: OpsTimelineItem[] = [];

  timeline.push({
    id: "created",
    title: "Order created",
    subtitle: `Status · ${order.status} · ${formatUsdFromCents(order.totalCents)}`,
    ts: order.createdAt,
  });

  for (const p of order.payments) {
    timeline.push({
      id: p.id,
      title: `Payment ${p.status}`,
      subtitle: `${formatUsdFromCents(p.amountCents)} · ${p.provider}${
        p.squarePaymentId ? ` · ${p.squarePaymentId}` : ""
      }`,
      ts: p.createdAt,
    });
  }

  for (const g of order.fulfillmentGroups) {
    timeline.push({
      id: g.id,
      title: `Fulfillment · ${g.pipeline}`,
      subtitle: `Snapshot · ${g.status}${
        g.pickupWindow ? ` · pickup window ${g.pickupWindow.label}` : ""
      }`,
      ts: order.updatedAt,
    });
    for (const s of g.shipments) {
      timeline.push({
        id: s.id,
        title: `Shipment · ${s.status}`,
        subtitle: `${s.carrier ?? "carrier TBD"} · ${s.trackingNumber ?? "no tracking"}`,
        ts: s.createdAt,
      });
    }
  }

  for (const th of order.emailThreads) {
    for (const m of th.messages) {
      timeline.push({
        id: m.id,
        title: `Email · ${m.direction}`,
        subtitle: `${m.subject ?? th.subjectSnapshot ?? ""} · ${m.deliveryStatus}`,
        ts: m.createdAt,
      });
    }
  }

  timeline.sort((a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime());

  return (
    <>
      <OpsPageHeader
        title={`Order ${order.id.slice(0, 8)}…`}
        description="Timeline-first snapshot — payments, fulfillment, shipments, communications."
        actions={
          <Link
            href="/ops/orders"
            className="text-[12px] text-[#8FC4C4] hover:underline"
          >
            ← All orders
          </Link>
        }
      />

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div>
          <h2 className="text-[13px] font-semibold text-[#f5e5c0] mb-3">Timeline</h2>
          <OpsTimeline items={timeline} />
        </div>

        <aside className="space-y-6">
          <div className="rounded-lg border border-[#3d3830] bg-[#252119] p-4">
            <h3 className="text-[12px] uppercase tracking-wide text-[#c9bba8]/70 mb-2">
              Line items
            </h3>
            <ul className="space-y-2">
              {order.items.map((item) => (
                <li key={item.id} className="text-[12px] text-[#f5e5c0]/90">
                  <span className="font-medium">{item.title}</span> × {item.quantity}
                  <div className="text-[11px] text-[#c9bba8]/70">{item.fulfillmentPipeline}</div>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-lg border border-[#3d3830] bg-[#252119] p-4">
            <h3 className="text-[12px] uppercase tracking-wide text-[#c9bba8]/70 mb-2">
              Threads
            </h3>
            <div className="flex flex-wrap gap-2">
              {order.emailThreads.length === 0 ? (
                <span className="text-[12px] text-[#c9bba8]/75">No linked threads.</span>
              ) : (
                order.emailThreads.map((t) => (
                  <Link key={t.id} href={`/ops/communications/${t.id}`}>
                    <StateChip label={t.subjectSnapshot?.slice(0, 24) ?? "thread"} tone="teal" />
                  </Link>
                ))
              )}
            </div>
          </div>

          <div className="rounded-lg border border-dashed border-[#3d3830] bg-[#1c1916]/60 p-4">
            <h3 className="text-[12px] uppercase tracking-wide text-[#c9bba8]/70 mb-2">
              Notes
            </h3>
            <p className="text-[12px] text-[#c9bba8]/75">
              Operator notes + CRM context hook here — structured note model not shipped yet.
            </p>
          </div>
        </aside>
      </div>
    </>
  );
}
