import Link from "next/link";
import type { OperationalActivityEvent, OperationalActivitySeverity } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import { notFound } from "next/navigation";
import GovPageHeader from "@/components/governance/GovPageHeader";
import OperationalCard from "@/components/governance/OperationalCard";
import StatusPill, { type StatusPillVariant } from "@/components/governance/StatusPill";
import {
  buildSquareDashboardLinks,
  collectWebhookSyncHints,
  readSquareOrderIdFromJson,
} from "@/lib/commerce/squareOperationalVisibility";
import {
  operationalIncidentWhereForOrder,
  readCateringInquiryIdFromCommerceMetadata,
} from "@/lib/operations/operationalContextLinks";
import { OPERATIONAL_EVENT_TYPES } from "@/lib/operations/operationalEventTypes";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const ORDER_ID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const TIMELINE_TYPES = [
  OPERATIONAL_EVENT_TYPES.ORDER_CREATED,
  OPERATIONAL_EVENT_TYPES.PAYMENT_SUCCEEDED,
  OPERATIONAL_EVENT_TYPES.PAYMENT_FAILED,
  OPERATIONAL_EVENT_TYPES.SHIPMENT_LABEL_CREATED,
] as const;

function formatUsd(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

function severityPillVariant(sev: OperationalActivitySeverity): StatusPillVariant {
  switch (sev) {
    case "info":
      return "neutral";
    case "warning":
      return "warning";
    case "error":
      return "degraded";
    case "critical":
      return "critical";
    default:
      return "neutral";
  }
}

function customerBlock(order: {
  customer: {
    email: string | null;
    phone: string | null;
    authMetadata: unknown;
  } | null;
}): { lines: string[] } {
  const c = order.customer;
  if (!c) return { lines: ["No linked customer row"] };
  const lines: string[] = [];
  if (c.email?.trim()) lines.push(`Email · ${c.email.trim()}`);
  if (c.phone?.trim()) lines.push(`Phone · ${c.phone.trim()}`);
  if (c.authMetadata && typeof c.authMetadata === "object" && !Array.isArray(c.authMetadata)) {
    const am = c.authMetadata as Record<string, unknown>;
    for (const key of ["fullName", "name", "displayName"] as const) {
      const v = am[key];
      if (typeof v === "string" && v.trim()) {
        lines.push(`Name · ${v.trim()}`);
        break;
      }
    }
  }
  return { lines: lines.length ? lines : ["Customer row present / no email or phone"] };
}

function buildTimelineWhere(orderId: string, shipmentIds: string[], paymentIds: string[]): Prisma.OperationalActivityEventWhereInput {
  const linkOr: Prisma.OperationalActivityEventWhereInput[] = [
    { message: { contains: orderId } },
    { metadata: { path: ["orderId"], equals: orderId } },
    { metadata: { path: ["commerceOrderId"], equals: orderId } },
    ...shipmentIds.map((id) => ({ metadata: { path: ["shipmentId"], equals: id } })),
    ...paymentIds.map((id) => ({ metadata: { path: ["paymentRecordId"], equals: id } })),
  ];

  return {
    AND: [{ type: { in: [...TIMELINE_TYPES] } }, { OR: linkOr }],
  };
}

function OperationalActivityEventRow({ row }: { row: OperationalActivityEvent }) {
  return (
    <li className="py-4 first:pt-0 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <time
            dateTime={row.createdAt.toISOString()}
            className="text-[11px] font-semibold uppercase tracking-[0.1em] text-charcoal/45"
          >
            {row.createdAt.toLocaleString(undefined, {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </time>
          <StatusPill variant={severityPillVariant(row.severity)}>{row.severity}</StatusPill>
          <span className="text-[11px] font-mono text-charcoal/55 break-all">{row.type}</span>
        </div>
        <p className="text-[13px] text-charcoal leading-snug">{row.message}</p>
        {(row.actorType || row.actorId || row.actorName || row.source) && (
          <p className="text-[12px] text-charcoal/55 leading-relaxed">
            {[row.actorType, row.actorId ? `id:${row.actorId.slice(0, 12)}${row.actorId.length > 12 ? "…" : ""}` : null, row.actorName, row.source]
              .filter(Boolean)
              .join(" · ")}
          </p>
        )}
      </div>
    </li>
  );
}

type PageProps = { params: Promise<{ orderId: string }> };

export default async function SuperAdminOrderDetailPage(props: PageProps) {
  const { orderId } = await props.params;
  if (!ORDER_ID_RE.test(orderId)) {
    notFound();
  }

  const order = await prisma.commerceOrder.findUnique({
    where: { id: orderId },
    include: {
      customer: { select: { email: true, phone: true, authMetadata: true } },
      items: { orderBy: { title: "asc" } },
      payments: { orderBy: { createdAt: "desc" } },
      fulfillmentGroups: {
        orderBy: { id: "asc" },
        include: {
          pickupWindow: { select: { label: true, startsAt: true, endsAt: true } },
          shipments: { orderBy: { createdAt: "desc" } },
        },
      },
    },
  });

  if (!order) {
    notFound();
  }

  const orderSquareOrderId = readSquareOrderIdFromJson(order.metadata);
  const webhookSyncLines = [
    ...collectWebhookSyncHints("CommerceOrder", order.metadata),
    ...order.payments.flatMap((p) => collectWebhookSyncHints("PaymentRecord", p.metadata)),
  ];

  const shipmentIds = order.fulfillmentGroups.flatMap((g) => g.shipments.map((s) => s.id));
  const paymentIds = order.payments.map((p) => p.id);

  const timelineWhere = buildTimelineWhere(order.id, shipmentIds, paymentIds);
  const cateringInquiryId = readCateringInquiryIdFromCommerceMetadata(order.metadata);
  const isCateringPipeline = order.fulfillmentGroups.some(
    (g) => g.pipeline.trim().toUpperCase() === "CATERING"
  );

  const [timelineEvents, relatedIncidents] = await Promise.all([
    prisma.operationalActivityEvent.findMany({
      where: timelineWhere,
      orderBy: { createdAt: "asc" },
      take: 250,
    }),
    prisma.operationalIncident.findMany({
      where: operationalIncidentWhereForOrder(order.id),
      orderBy: { lastDetectedAt: "desc" },
      take: 25,
    }),
  ]);

  const cust = customerBlock(order);
  const linkEnv = process.env;
  const baseSquareLinks = buildSquareDashboardLinks(linkEnv);
  const orderSquareLinks = buildSquareDashboardLinks(linkEnv, { squareOrderId: orderSquareOrderId });
  const hasSquareConsoleBase = Boolean(baseSquareLinks.transactions);

  return (
    <div className="space-y-8">
      <GovPageHeader
        eyebrow="Platform · Commerce"
        title={`Order · ${order.id.slice(0, 8)}…`}
        subtitle="Commerce order with payments, fulfillment groups, shipments, and filtered operational activity (same order id in metadata, linked shipment/payment ids, or message text)."
        actions={
          <Link
            href="/super-admin/order-operations"
            className="rounded-lg border border-cream-dark/60 bg-white px-3 py-1.5 text-[12px] font-semibold text-charcoal/80 shadow-sm transition hover:bg-cream-mid/40"
          >
            All orders
          </Link>
        }
      />

      <OperationalCard title="Lifecycle" meta="commerce_orders">
        <dl className="grid gap-3 sm:grid-cols-2 text-[13px]">
          <div className="sm:col-span-2">
            <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-charcoal/45">Order id</dt>
            <dd className="mt-1 font-mono text-[12px] text-charcoal/80 break-all">{order.id}</dd>
          </div>
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-charcoal/45">Status</dt>
            <dd className="mt-1">
              <StatusPill variant="neutral">{order.status}</StatusPill>
            </dd>
          </div>
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-charcoal/45">Total</dt>
            <dd className="mt-1 font-medium text-charcoal">{formatUsd(order.totalCents)}</dd>
          </div>
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-charcoal/45">Created</dt>
            <dd className="mt-1 text-charcoal/80">
              {order.createdAt.toLocaleString(undefined, { dateStyle: "full", timeStyle: "short" })}
            </dd>
          </div>
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-charcoal/45">Updated</dt>
            <dd className="mt-1 text-charcoal/80">
              {order.updatedAt.toLocaleString(undefined, { dateStyle: "full", timeStyle: "short" })}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-charcoal/45">Guest cart token</dt>
            <dd className="mt-1 font-mono text-[12px] text-charcoal/70 break-all">
              {order.guestCartToken ?? "—"}
            </dd>
          </div>
          {order.metadata != null ? (
            <div className="sm:col-span-2">
              <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-charcoal/45">Metadata</dt>
              <dd className="mt-1 rounded-md border border-cream-dark/50 bg-white/80 p-2 font-mono text-[11px] text-charcoal/80 overflow-x-auto">
                {JSON.stringify(order.metadata, null, 2)}
              </dd>
            </div>
          ) : null}
        </dl>
      </OperationalCard>

      <OperationalCard
        title="Customer"
        meta={order.customerId ? `customers · ${order.customerId.slice(0, 8)}…` : "customers"}
      >
        {order.customerId ? (
          <p className="mb-3">
            <Link
              href={`/super-admin/customer-operations/${order.customerId}`}
              className="inline-flex rounded-lg border border-cream-dark/60 bg-white px-3 py-1.5 text-[12px] font-semibold text-charcoal/80 shadow-sm transition hover:bg-cream-mid/40"
            >
              Open customer operations
            </Link>
          </p>
        ) : null}
        <ul className="space-y-1 text-[13px] text-charcoal/80">
          {cust.lines.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </OperationalCard>

      <OperationalCard title="Related operational context" meta="cross-links · heuristic incidents">
        <div className="space-y-4 text-[13px] text-charcoal/75">
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            {order.customerId ? (
              <Link
                href={`/super-admin/customer-operations/${order.customerId}`}
                className="text-[12px] font-semibold text-teal-dark underline-offset-2 hover:underline"
              >
                Customer
              </Link>
            ) : (
              <span className="text-[12px] text-charcoal/45">Customer · not linked</span>
            )}
            {shipmentIds.length === 0 ? (
              <span className="text-[12px] text-charcoal/45">Shipments · none</span>
            ) : (
              <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-charcoal/45">
                  Shipments
                </span>
                {order.fulfillmentGroups.flatMap((g) =>
                  g.shipments.map((s) => (
                    <Link
                      key={s.id}
                      href={`/super-admin/shipping-operations/${s.id}`}
                      className="font-mono text-[11px] text-teal-dark underline-offset-2 hover:underline"
                    >
                      {s.id.slice(0, 8)}…
                    </Link>
                  ))
                )}
              </span>
            )}
          </div>

          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-charcoal/45 mb-1.5">
              Active incidents
            </p>
            {relatedIncidents.length === 0 ? (
              <p className="text-[12px] text-charcoal/55 leading-relaxed">
                No active incidents matched metadata (
                <span className="font-mono">commerceOrderId</span> / <span className="font-mono">orderId</span>) or the
                first eight characters of this order id in title/description.
              </p>
            ) : (
              <ul className="space-y-2">
                {relatedIncidents.map((inc) => (
                  <li key={inc.id} className="text-[12px] text-charcoal/80">
                    <span className="font-medium">{inc.title}</span>
                    <span className="text-charcoal/45">
                      {" "}
                      · {inc.severity} · {inc.status}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-charcoal/45 mb-1.5">Catering</p>
            {cateringInquiryId ? (
              <p>
                <Link
                  href={`/super-admin/catering-inquiries/${cateringInquiryId}`}
                  className="text-[12px] font-semibold text-teal-dark underline-offset-2 hover:underline"
                >
                  Open catering inquiry
                </Link>
                <span className="block mt-1 text-[11px] text-charcoal/50">
                  From <span className="font-mono">CommerceOrder.metadata</span> UUID keys (
                  <span className="font-mono">cateringInquiryId</span>, etc.).
                </span>
              </p>
            ) : isCateringPipeline ? (
              <p className="text-[12px] text-charcoal/55 leading-relaxed">
                Catering fulfillment pipeline on this order — no catering inquiry UUID stored on order metadata yet (no
                Prisma relation today).
              </p>
            ) : (
              <p className="text-[12px] text-charcoal/55">No catering inquiry metadata or catering pipeline detected.</p>
            )}
          </div>
        </div>
      </OperationalCard>

      <OperationalCard title="Line items" meta={`commerce_order_items · ${order.items.length}`}>
        {order.items.length === 0 ? (
          <p className="text-[13px] text-charcoal/60">No line items.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-cream-dark/50">
            <table className="w-full min-w-[44rem] text-left text-[13px]">
              <thead className="border-b border-cream-dark/50 bg-cream-mid/20 text-[11px] uppercase tracking-[0.08em] text-charcoal/50">
                <tr>
                  <th className="px-3 py-2 font-semibold">Title</th>
                  <th className="px-3 py-2 font-semibold">Kind</th>
                  <th className="px-3 py-2 font-semibold">Pipeline</th>
                  <th className="px-3 py-2 font-semibold">Qty</th>
                  <th className="px-3 py-2 font-semibold">Unit</th>
                  <th className="px-3 py-2 font-semibold">Line</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cream-dark/40">
                {order.items.map((it) => {
                  const lineTotal = it.unitPriceCents * it.quantity;
                  return (
                    <tr key={it.id} className="bg-white/80">
                      <td className="px-3 py-2 text-charcoal">{it.title}</td>
                      <td className="px-3 py-2 font-mono text-[12px] text-charcoal/70">{it.kind}</td>
                      <td className="px-3 py-2 text-charcoal/75">{it.fulfillmentPipeline}</td>
                      <td className="px-3 py-2">{it.quantity}</td>
                      <td className="px-3 py-2">{formatUsd(it.unitPriceCents)}</td>
                      <td className="px-3 py-2 font-medium">{formatUsd(lineTotal)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </OperationalCard>

      <OperationalCard title="Commerce Operations" meta={`Square · payment_records · ${order.payments.length}`}>
        <div className="space-y-5">
          <p className="text-[13px] text-charcoal/75 leading-relaxed">
            Platform payment context for this commerce order (local <span className="font-mono">PaymentRecord</span> rows
            plus Square identifiers when present). Refunds and disputes are not modeled here — use Square for money
            movement.
          </p>

          <div>
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-charcoal/45 mb-2">
              Square console
            </h3>
            {!hasSquareConsoleBase ? (
              <p className="text-[13px] text-charcoal/60">
                Dashboard links are unavailable — set at least one Square env signal (for example{" "}
                <span className="font-mono">SQUARE_ENVIRONMENT</span>,{" "}
                <span className="font-mono">NEXT_PUBLIC_SQUARE_ENVIRONMENT</span>,{" "}
                <span className="font-mono">SQUARE_LOCATION_ID</span>, or <span className="font-mono">SQUARE_MERCHANT_ID</span>
                ).
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                <a
                  href={baseSquareLinks.transactions}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg border border-cream-dark/60 bg-white px-3 py-1.5 text-[12px] font-semibold text-charcoal/80 shadow-sm transition hover:bg-cream-mid/40"
                >
                  Open transactions
                </a>
                {orderSquareOrderId && orderSquareLinks.order ? (
                  <a
                    href={orderSquareLinks.order}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-lg border border-cream-dark/60 bg-white px-3 py-1.5 text-[12px] font-semibold text-charcoal/80 shadow-sm transition hover:bg-cream-mid/40"
                  >
                    Open Square order
                  </a>
                ) : null}
                {order.payments.map((p) => {
                  const payLinks = buildSquareDashboardLinks(linkEnv, {
                    squarePaymentId: p.squarePaymentId,
                    squareOrderId: orderSquareOrderId,
                  });
                  if (!payLinks.payment) return null;
                  return (
                    <a
                      key={`sq-pay-${p.id}`}
                      href={payLinks.payment}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-lg border border-cream-dark/60 bg-white px-3 py-1.5 text-[12px] font-semibold text-charcoal/80 shadow-sm transition hover:bg-cream-mid/40"
                    >
                      Open payment · {p.squarePaymentId!.slice(0, 8)}…
                    </a>
                  );
                })}
              </div>
            )}
            {!orderSquareOrderId ? (
              <p className="mt-2 text-[12px] text-charcoal/55">
                No <span className="font-mono">squareOrderId</span> on this order’s metadata yet — order-level Square deep
                link is hidden. Payment-level links still work when <span className="font-mono">squarePaymentId</span> is
                populated.
              </p>
            ) : null}
          </div>

          <div>
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-charcoal/45 mb-2">
              Webhook / sync hints
            </h3>
            {webhookSyncLines.length === 0 ? (
              <div className="space-y-2 text-[13px] text-charcoal/65 leading-relaxed">
                <p>
                  No webhook or sync audit fields surfaced from <span className="font-mono">CommerceOrder.metadata</span>{" "}
                  or <span className="font-mono">PaymentRecord.metadata</span> (the Square webhook handler updates rows but
                  does not persist receipt timestamps in JSON today).
                </p>
                <p>
                  <Link
                    href="/super-admin/live-operations"
                    className="font-semibold text-charcoal underline decoration-charcoal/25 hover:decoration-charcoal/60"
                  >
                    Live Operations
                  </Link>{" "}
                  — use integration health and presence tools while onsite webhook auditing matures.
                </p>
              </div>
            ) : (
              <ul className="space-y-1.5 text-[12px] text-charcoal/80 font-mono leading-snug">
                {webhookSyncLines.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-charcoal/45 mb-2">Refunds</h3>
            <p className="text-[13px] text-charcoal/70">
              Refund state is not tracked locally on <span className="font-mono">PaymentRecord</span> — use Square for
              refund and adjustment history.
            </p>
          </div>

          {order.payments.length === 0 ? (
            <p className="text-[13px] text-charcoal/60">No payment rows linked to this order.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-cream-dark/50">
              <table className="w-full min-w-[52rem] text-left text-[13px]">
                <thead className="border-b border-cream-dark/50 bg-cream-mid/20 text-[11px] uppercase tracking-[0.08em] text-charcoal/50">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Record</th>
                    <th className="px-3 py-2 font-semibold">Status</th>
                    <th className="px-3 py-2 font-semibold">Square status</th>
                    <th className="px-3 py-2 font-semibold">Amount</th>
                    <th className="px-3 py-2 font-semibold">Provider</th>
                    <th className="px-3 py-2 font-semibold">Square payment id</th>
                    <th className="px-3 py-2 font-semibold">Square order id (metadata)</th>
                    <th className="px-3 py-2 font-semibold">Created</th>
                    <th className="px-3 py-2 font-semibold">Updated</th>
                    <th className="px-3 py-2 font-semibold">Captured</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-cream-dark/40">
                  {order.payments.map((p) => {
                    const metaSquareOrder = readSquareOrderIdFromJson(p.metadata);
                    return (
                      <tr key={p.id} className="bg-white/80">
                        <td className="px-3 py-2 font-mono text-[11px] text-charcoal/65">{p.id.slice(0, 8)}…</td>
                        <td className="px-3 py-2">
                          <StatusPill variant="neutral">{p.status}</StatusPill>
                        </td>
                        <td className="px-3 py-2 font-mono text-[12px] text-charcoal/70">{p.squarePaymentStatus ?? "—"}</td>
                        <td className="px-3 py-2">{formatUsd(p.amountCents)}</td>
                        <td className="px-3 py-2">{p.provider}</td>
                        <td className="px-3 py-2 font-mono text-[11px] text-charcoal/65 break-all">
                          {p.squarePaymentId ?? "—"}
                        </td>
                        <td className="px-3 py-2 font-mono text-[11px] text-charcoal/65 break-all">
                          {metaSquareOrder ?? "—"}
                        </td>
                        <td className="px-3 py-2 text-[12px] text-charcoal/60">
                          {p.createdAt.toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" })}
                        </td>
                        <td className="px-3 py-2 text-[12px] text-charcoal/60">
                          {p.updatedAt.toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" })}
                        </td>
                        <td className="px-3 py-2 text-[12px] text-charcoal/60">
                          {p.capturedAt
                            ? p.capturedAt.toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" })
                            : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {order.payments.some((p) => p.failureReason) ? (
            <div className="rounded-md border border-cream-dark/50 bg-cream-mid/10 p-3 text-[12px] text-charcoal/75">
              <span className="font-semibold text-charcoal/80">Failure reasons (local):</span>
              <ul className="mt-2 space-y-1">
                {order.payments
                  .filter((p) => p.failureReason)
                  .map((p) => (
                    <li key={`fail-${p.id}`} className="font-mono break-all">
                      {p.id.slice(0, 8)}… · {p.failureReason}
                    </li>
                  ))}
              </ul>
            </div>
          ) : null}
        </div>
      </OperationalCard>

      <OperationalCard title="Fulfillment & shipments" meta="fulfillment_groups · shipments">
        {order.fulfillmentGroups.length === 0 ? (
          <p className="text-[13px] text-charcoal/60">No fulfillment groups.</p>
        ) : (
          <ul className="space-y-6">
            {order.fulfillmentGroups.map((g) => (
              <li key={g.id} className="rounded-lg border border-cream-dark/50 bg-white/70 p-4 space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-mono text-charcoal/55">{g.id}</span>
                  <StatusPill variant="neutral">{g.pipeline}</StatusPill>
                  <StatusPill variant="neutral">{g.status}</StatusPill>
                </div>
                {g.pickupWindow ? (
                  <p className="text-[13px] text-charcoal/75">
                    Pickup window · <span className="font-medium">{g.pickupWindow.label}</span> ·{" "}
                    {g.pickupWindow.startsAt.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })} –{" "}
                    {g.pickupWindow.endsAt.toLocaleString(undefined, { timeStyle: "short" })}
                  </p>
                ) : null}
                {g.estimatedReadyAt ? (
                  <p className="text-[12px] text-charcoal/60">
                    Estimated ready · {g.estimatedReadyAt.toLocaleString()}
                  </p>
                ) : null}
                {g.shipments.length === 0 ? (
                  <p className="text-[13px] text-charcoal/55">No shipment rows for this group.</p>
                ) : (
                  <div className="overflow-x-auto rounded-md border border-cream-dark/40">
                    <table className="w-full min-w-[40rem] text-left text-[12px]">
                      <thead className="border-b border-cream-dark/50 bg-cream-mid/15 text-[10px] uppercase tracking-[0.08em] text-charcoal/50">
                        <tr>
                          <th className="px-2 py-1.5 font-semibold">Shipment</th>
                          <th className="px-2 py-1.5 font-semibold">Status</th>
                          <th className="px-2 py-1.5 font-semibold">Carrier</th>
                          <th className="px-2 py-1.5 font-semibold">Tracking</th>
                          <th className="px-2 py-1.5 font-semibold">Shipped</th>
                          <th className="px-2 py-1.5 font-semibold">Shipping</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-cream-dark/35">
                        {g.shipments.map((s) => (
                          <tr key={s.id}>
                            <td className="px-2 py-1.5 font-mono text-[11px] text-charcoal/65">
                              <Link
                                href={`/super-admin/shipping-operations/${s.id}`}
                                className="text-charcoal underline decoration-charcoal/25 hover:decoration-charcoal/60"
                              >
                                {s.id.slice(0, 8)}…
                              </Link>
                            </td>
                            <td className="px-2 py-1.5">{s.status}</td>
                            <td className="px-2 py-1.5">{s.carrier ?? "—"}</td>
                            <td className="px-2 py-1.5 font-mono text-[11px] break-all">{s.trackingNumber ?? "—"}</td>
                            <td className="px-2 py-1.5 text-charcoal/60">
                              {s.shippedAt ? s.shippedAt.toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" }) : "—"}
                            </td>
                            <td className="px-2 py-1.5">
                              {s.shippingCents != null ? formatUsd(s.shippingCents) : "—"}
                              {s.shippingService ? ` · ${s.shippingService}` : ""}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </OperationalCard>

      <OperationalCard
        title="Operational timeline"
        meta={`operational_activity_events · filtered (${TIMELINE_TYPES.join(", ")})`}
      >
        {timelineEvents.length === 0 ? (
          <div className="space-y-2 text-[13px] text-charcoal/70 leading-relaxed">
            <p>No operational events linked to this order id yet.</p>
            <p className="text-[12px] text-charcoal/55">
              The stream matches rows whose <span className="font-mono">metadata</span> includes this order id (
              <span className="font-mono">orderId</span> / <span className="font-mono">commerceOrderId</span>), references
              shipment or payment ids for this order, or whose <span className="font-mono">message</span> contains the full
              order uuid. To improve coverage, emitters should include{" "}
              <span className="font-mono">commerceOrderId</span> (and related ids) in event metadata —{" "}
              <span className="font-mono">order.created</span> now stores both <span className="font-mono">orderId</span> and{" "}
              <span className="font-mono">commerceOrderId</span> for new drafts.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-cream-dark/40">
            {timelineEvents.map((row) => (
              <OperationalActivityEventRow key={row.id} row={row} />
            ))}
          </ul>
        )}
        <p className="mt-4 text-[12px] text-charcoal/55 leading-relaxed">
          <span className="font-semibold text-charcoal/65">Payment events:</span>{" "}
          <span className="font-mono">payment.succeeded</span> / <span className="font-mono">payment.failed</span> in this
          filter include Square webhook terminal transitions (source <span className="font-mono">webhooks.square</span> via{" "}
          <span className="font-mono">reconcileSquarePaymentWebhook</span>) and legacy checkout API failures (source{" "}
          <span className="font-mono">api.order</span>). Webhook HTTP delivery or signature failures are not written to
          this stream — they surface as HTTP errors / logs on <span className="font-mono">/api/webhooks/square</span>.
        </p>
      </OperationalCard>
    </div>
  );
}
