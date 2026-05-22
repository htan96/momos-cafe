import Link from "next/link";
import { notFound } from "next/navigation";
import CustomerOrderTimeline from "@/components/account/CustomerOrderTimeline";
import OrderFulfillmentTree from "@/components/account/OrderFulfillmentTree";
import CommunicationRow from "@/components/customer/CommunicationRow";
import CustomerPageHeader from "@/components/customer/CustomerPageHeader";
import CustomerPanel from "@/components/customer/CustomerPanel";
import CustomerShipmentCard from "@/components/customer/CustomerShipmentCard";
import { formatMoney } from "@/lib/commerce/fulfillmentPreview";
import { assertCustomerPlatformLayout } from "@/lib/auth/cognito/assertRoleInLayout";
import { resolveCommerceCustomerId } from "@/lib/account/effectiveAccountContext";
import {
  deriveCustomerShipmentOperationalSteps,
} from "@/lib/account/customerOrderOperationalPresentation";
import {
  loadCustomerOperationalOrderDetail,
  listCustomerRefundCasesForOrder,
  listCustomerSupportIssuesForOrder,
} from "@/lib/account/loadCustomerOperationalOrderDetail";
import { mapToDashboardBrief } from "@/lib/account/dashboardData";
import {
  formatOrderInstant,
  orderDisplayNumber,
  pipelineLabel,
  type CustomerTimelineEvent,
} from "@/lib/account/orderPresentation";
import type { CustomerStatusVariant } from "@/components/customer/CustomerStatusChip";

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

export default async function AccountOrderDetailPage({ params }: PageProps) {
  const session = await assertCustomerPlatformLayout();
  const { orderId } = await params;

  const customerRowId = await resolveCommerceCustomerId({
    cognitoSub: session.sub,
    email: session.email,
  });

  if (!customerRowId) {
    notFound();
  }

  const pack = await loadCustomerOperationalOrderDetail(customerRowId, orderId);
  if (!pack) notFound();

  const { order, operationalActivity, operationalActivityRecords, communications } = pack;
  const brief = mapToDashboardBrief(order);
  const num = orderDisplayNumber(order.id);

  const activityAsTimeline: CustomerTimelineEvent[] = operationalActivity.map((e, i, arr) => ({
    id: e.id,
    at: e.at,
    title: e.title,
    detail: e.detail,
    tone: i === arr.length - 1 ? "current" : "done",
  }));

  const shipmentBlocks = order.fulfillmentGroups.flatMap((g) =>
    g.shipments.map((s) => ({
      groupLabel: g.pipeline,
      shipment: s,
    }))
  );

  const supportRows = listCustomerSupportIssuesForOrder(order);
  const refundRows = listCustomerRefundCasesForOrder(order);

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
            Status updates on this page reflect what we’ve recorded in our systems — fulfillment, payments, shipping
            scans we receive, and notes we mark as customer-visible.
          </>
        }
        illustrationAccentClassName="bg-gold/30"
        aside={
          <div className="text-left lg:text-right">
            <p className="font-display text-3xl text-charcoal tracking-tight tabular-nums">
              {formatMoney(order.totalCents / 100)}
            </p>
            <p className="mt-2 text-[12px] uppercase tracking-[0.2em] text-charcoal/45">
              Updated {brief.updatedAt.toLocaleString()}
            </p>
          </div>
        }
      />

      <div className={`grid gap-10 ${order.items.length > 0 ? "lg:grid-cols-[1fr,minmax(0,280px)]" : ""}`}>
        <div className="flex flex-col gap-10">
          <CustomerPanel title="Fulfillment stages" eyebrow="How we’re assembling this visit" paddingClassName="p-0">
            <div className="px-1 pb-1 md:px-2">
              <OrderFulfillmentTree fulfillmentGroups={order.fulfillmentGroups} />
            </div>
          </CustomerPanel>

          <CustomerPanel title="Recorded activity" eyebrow="From our operations log">
            {activityAsTimeline.length === 0 ? (
              <p className="text-[14px] text-charcoal/65 leading-relaxed px-1 md:px-2">
                When milestones are recorded (payment, fulfillment moves, shipping labels, carrier scans, support
                updates tied to this order), they will appear here — we don’t invent steps.
              </p>
            ) : (
              <div className="px-1 pb-1 md:px-2">
                <CustomerOrderTimeline events={activityAsTimeline} />
              </div>
            )}
          </CustomerPanel>

          {supportRows.length > 0 ? (
            <CustomerPanel title="Support" eyebrow="Open coordination">
              <ul className="space-y-4">
                {supportRows.map((s) => (
                  <li key={s.id} className="rounded-xl border border-cream-dark/80 bg-cream/35 px-4 py-4 md:px-5">
                    <p className="text-[13px] font-semibold text-charcoal">{s.title}</p>
                    <p className="mt-1 text-[13px] text-charcoal/68">{s.statusLabel}</p>
                    <p className="mt-3 text-[11px] uppercase tracking-[0.12em] text-charcoal/45">
                      Updated {formatOrderInstant(s.updatedAt)}
                    </p>
                  </li>
                ))}
              </ul>
            </CustomerPanel>
          ) : null}

          {refundRows.length > 0 ? (
            <CustomerPanel title="Refunds" eyebrow="Ledger updates from our team">
              <ul className="space-y-4">
                {refundRows.map((r) => (
                  <li key={r.id} className="rounded-xl border border-cream-dark/80 bg-cream/35 px-4 py-4 md:px-5">
                    <p className="text-[13px] font-semibold text-charcoal">{r.statusLabel}</p>
                    {r.amountCents != null && r.amountCents > 0 ? (
                      <p className="mt-1 text-[13px] text-charcoal/80 tabular-nums">
                        Amount {formatMoney(r.amountCents / 100)}
                      </p>
                    ) : null}
                    <p className="mt-2 text-[13px] text-charcoal/70 leading-relaxed">{r.reason}</p>
                    <p className="mt-3 text-[11px] uppercase tracking-[0.12em] text-charcoal/45">
                      Updated {formatOrderInstant(r.updatedAt)}
                    </p>
                  </li>
                ))}
              </ul>
            </CustomerPanel>
          ) : null}

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
                    timeline={deriveCustomerShipmentOperationalSteps(s.id, operationalActivityRecords)}
                  />
                ))}
              </div>
            )}
          </CustomerPanel>

          <CustomerPanel title="Communications" eyebrow="Email & customer-visible notes">
            {communications.length === 0 ? (
              <p className="text-[14px] text-charcoal/65 leading-relaxed">
                When we email you about this order — or leave a note flagged as customer-visible — it will show up here.
              </p>
            ) : (
              <div className="space-y-4">
                {communications.map((c) => (
                  <CommunicationRow
                    key={c.id}
                    subject={c.subjectLine}
                    preview={c.preview || "—"}
                    when={formatOrderInstant(c.occurredAt)}
                    channel={
                      c.kind === "staff_note" ?
                        "Momos note"
                      : c.kind === "email_out" ?
                        "Email · from us"
                      : "Email · to us"
                    }
                  />
                ))}
              </div>
            )}
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

        {order.items.length > 0 ? (
          <aside className="lg:sticky lg:top-24 h-fit">
            <CustomerPanel title="Items in this visit" eyebrow="What you selected" paddingClassName="p-5 md:p-6">
              <ul className="space-y-3 text-[13px] text-charcoal/85">
                {order.items.map((it) => (
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
