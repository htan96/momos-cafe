import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import CustomerOrderTimeline from "@/components/account/CustomerOrderTimeline";
import OrderFulfillmentTree from "@/components/account/OrderFulfillmentTree";
import CommunicationRow from "@/components/customer/CommunicationRow";
import CustomerPageHeader from "@/components/customer/CustomerPageHeader";
import CustomerPanel from "@/components/customer/CustomerPanel";
import CustomerShipmentCard from "@/components/customer/CustomerShipmentCard";
import { formatMoney } from "@/lib/commerce/fulfillmentPreview";
import { getCustomerSession } from "@/lib/auth/getCustomerSession";
import { loadCustomerCommerceOrder, mapToDashboardBrief } from "@/lib/account/dashboardData";
import {
  buildCustomerOrderTimeline,
  formatOrderInstant,
  orderDisplayNumber,
  pipelineLabel,
} from "@/lib/account/orderPresentation";
import type { CustomerStatusVariant } from "@/components/customer/CustomerStatusChip";
import type { CustomerTimelineStep } from "@/components/customer/CustomerTimeline";

type PageProps = { params: Promise<{ orderId: string }> };

function maskTracking(tn: string | null | undefined): string {
  if (!tn) return "•••• · arriving soon";
  const t = tn.trim();
  if (t.length <= 6) return "•••• · pending scan";
  return `${t.slice(0, 4)}·**··**··${t.slice(-4)}`;
}

function shipmentStatusVariant(
  shipmentStatus: string,
  groupPipeline: string
): CustomerStatusVariant {
  const s = shipmentStatus.toLowerCase();
  if (s.includes("exception") || s.includes("failure") || s.includes("error") || s.includes("delay")) {
    return "exception";
  }
  if (s.includes("deliver") || s === "delivered") return "delivered";
  if (s.includes("ship") || s.includes("transit")) return "shipped";
  if (groupPipeline.toUpperCase() === "CATERING") return "scheduled";
  return "shipped";
}

function shipmentTimelineSteps(args: {
  id: string;
  createdAt: Date;
  shippedAt: Date | null;
  updatedAt: Date;
}): CustomerTimelineStep[] {
  const steps: CustomerTimelineStep[] = [
    {
      id: `${args.id}-prep`,
      title: "Preparing label & handoff",
      meta: formatOrderInstant(args.createdAt),
      tone: "done",
    },
  ];
  if (args.shippedAt) {
    steps.push({
      id: `${args.id}-shipped`,
      title: "Shipped",
      meta: formatOrderInstant(args.shippedAt),
      tone: "done",
    });
  }
  steps.push({
    id: `${args.id}-latest`,
    title: "Latest carrier touchpoint",
    meta: formatOrderInstant(args.updatedAt),
    tone: "current",
  });
  return steps;
}

export default async function AccountOrderDetailPage({ params }: PageProps) {
  const session = await getCustomerSession();
  const { orderId } = await params;

  if (!session) {
    redirect(`/login?next=${encodeURIComponent(`/account/orders/${orderId}`)}`);
  }

  const row = await loadCustomerCommerceOrder(session.sub, orderId);
  if (!row) notFound();

  const brief = mapToDashboardBrief(row);
  const timeline = buildCustomerOrderTimeline(brief);
  const num = orderDisplayNumber(row.id);

  const shipmentBlocks = row.fulfillmentGroups.flatMap((g) =>
    g.shipments.map((s) => ({
      groupLabel: g.pipeline,
      shipment: s,
    }))
  );

  return (
    <>
      <Link
        href="/account"
        className="text-[12px] font-semibold uppercase tracking-[0.2em] text-teal-dark underline-offset-[6px] hover:underline"
      >
        ← Back to account
      </Link>

      <CustomerPageHeader
        eyebrow={`Order #${num}`}
        title="Here’s where things stand"
        subtitle={
          <>
            Café pickup, shop treats, and anything headed out by mail — one calm page with timing and tracking when
            it&apos;s available.
          </>
        }
        illustrationAccentClassName="bg-gold/30"
        aside={
          <div className="text-left lg:text-right">
            <p className="font-display text-3xl text-charcoal tracking-tight tabular-nums">
              {formatMoney(row.totalCents / 100)}
            </p>
            <p className="mt-2 text-[12px] uppercase tracking-[0.2em] text-charcoal/45">
              Updated {brief.updatedAt.toLocaleString()}
            </p>
          </div>
        }
      />

      <div className={`grid gap-10 ${row.items.length > 0 ? "lg:grid-cols-[1fr,minmax(0,280px)]" : ""}`}>
        <div className="flex flex-col gap-10">
          <CustomerPanel title="Fulfillment stages" eyebrow="How we’re assembling this visit" paddingClassName="p-0">
            <div className="px-1 pb-1 md:px-2">
              <OrderFulfillmentTree fulfillmentGroups={row.fulfillmentGroups} />
            </div>
          </CustomerPanel>

          <CustomerPanel title="Timeline" eyebrow="Beat by beat">
            <CustomerOrderTimeline events={timeline} />
          </CustomerPanel>

          <CustomerPanel title="Shipments & tracking" eyebrow="En route details">
            {shipmentBlocks.length === 0 ? (
              <p className="text-[14px] text-charcoal/65 leading-relaxed">
                Nothing outbound yet — when parcels leave our hands, tracking lands here without you needing to ask.
              </p>
            ) : (
              <div className="space-y-5">
                {shipmentBlocks.map(({ groupLabel, shipment: s }) => (
                  <CustomerShipmentCard
                    key={s.id}
                    orderRef={`Order #${num} · ${groupLabel}`}
                    carrier={s.carrier ?? "Carrier updates soon"}
                    trackingMasked={maskTracking(s.trackingNumber)}
                    status={shipmentStatusVariant(s.status, groupLabel)}
                    delayed={s.status.toLowerCase().includes("delay")}
                    timeline={shipmentTimelineSteps({
                      id: s.id,
                      createdAt: s.createdAt,
                      shippedAt: s.shippedAt,
                      updatedAt: s.updatedAt,
                    })}
                  />
                ))}
              </div>
            )}
          </CustomerPanel>

          <CustomerPanel title="Notes we’ve sent" eyebrow="Communications">
            <div className="space-y-4">
              <CommunicationRow
                subject="Order confirmation"
                preview="We’ve received every line item — kitchen and shop lanes are aligned."
                when={formatOrderInstant(row.createdAt)}
                channel="Email"
              />
              <CommunicationRow
                subject="When tracking appears"
                preview="You’ll see carrier scans mirrored here the moment they publish — no extra apps required."
                when="Helpful tip"
                channel="System"
              />
            </div>
          </CustomerPanel>

          <CustomerPanel title="Receipts & invoices" eyebrow="Paperwork, softly offered">
            <p className="text-[14px] text-charcoal/65 leading-relaxed">
              Downloads will anchor here for catering and consolidated retail visits — for now, these are gentle
              placeholders.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                disabled
                className="rounded-xl border border-cream-dark bg-white px-4 py-2.5 text-[12px] font-semibold uppercase tracking-[0.12em] text-charcoal/45"
              >
                Download PDF (soon)
              </button>
              <button
                type="button"
                disabled
                className="rounded-xl border border-cream-dark bg-white px-4 py-2.5 text-[12px] font-semibold uppercase tracking-[0.12em] text-charcoal/45"
              >
                Email receipt (soon)
              </button>
            </div>
          </CustomerPanel>
        </div>

        {row.items.length > 0 ? (
          <aside className="lg:sticky lg:top-24 h-fit">
            <CustomerPanel title="Items in this visit" eyebrow="What you selected" paddingClassName="p-5 md:p-6">
              <ul className="space-y-3 text-[13px] text-charcoal/85">
                {row.items.map((it) => (
                  <li key={it.id} className="flex justify-between gap-3">
                    <span className="min-w-0">
                      <span className="font-semibold">{it.quantity}×</span> {it.title}
                    </span>
                    <span className="shrink-0 text-[11px] uppercase tracking-wide text-charcoal/50">
                      {pipelineLabel(it.fulfillmentPipeline)}
                    </span>
                  </li>
                ))}
              </ul>
            </CustomerPanel>
          </aside>
        ) : null}
      </div>
    </>
  );
}
