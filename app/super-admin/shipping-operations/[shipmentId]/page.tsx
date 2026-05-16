import Link from "next/link";
import type { OperationalActivityEvent, OperationalActivitySeverity } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import { notFound } from "next/navigation";
import GovPageHeader from "@/components/governance/GovPageHeader";
import OperationalCard from "@/components/governance/OperationalCard";
import OpsPurchaseShippoLabelButton from "@/components/governance/OpsPurchaseShippoLabelButton";
import ShippoIntegrationStatusStrip from "@/components/governance/ShippoIntegrationStatusStrip";
import StatusPill, { type StatusPillVariant } from "@/components/governance/StatusPill";
import { INTEGRATION_SYSTEM_KEYS } from "@/lib/operations/integrationHealth/types";
import { OPERATIONAL_EVENT_TYPES } from "@/lib/operations/operationalEventTypes";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const UUID_RE =
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

function buildShipmentTimelineWhere(
  shipmentId: string,
  orderId: string,
  paymentIds: string[]
): Prisma.OperationalActivityEventWhereInput {
  const linkOr: Prisma.OperationalActivityEventWhereInput[] = [
    { message: { contains: orderId } },
    { metadata: { path: ["orderId"], equals: orderId } },
    { metadata: { path: ["commerceOrderId"], equals: orderId } },
    { metadata: { path: ["shipmentId"], equals: shipmentId } },
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

function pickAddressSnapshot(meta: unknown): Record<string, unknown> | null {
  if (!meta || typeof meta !== "object" || Array.isArray(meta)) return null;
  const m = meta as Record<string, unknown>;
  const keys = ["address", "shipTo", "destination", "addressSnapshot", "shipToAddress", "toAddress"] as const;
  const out: Record<string, unknown> = {};
  for (const k of keys) {
    if (k in m) out[k] = m[k];
  }
  return Object.keys(out).length ? out : null;
}

type PageProps = { params: Promise<{ shipmentId: string }> };

export default async function SuperAdminShipmentDetailPage(props: PageProps) {
  const { shipmentId } = await props.params;
  if (!UUID_RE.test(shipmentId)) {
    notFound();
  }

  const [shipment, shippoHealth] = await Promise.all([
    prisma.shipment.findUnique({
      where: { id: shipmentId },
      include: {
        fulfillmentGroup: {
          include: {
            order: {
              include: {
                customer: { select: { email: true, phone: true, authMetadata: true } },
                payments: { select: { id: true }, orderBy: { createdAt: "desc" } },
              },
            },
            pickupWindow: true,
          },
        },
      },
    }),
    prisma.integrationHealthSnapshot.findUnique({
      where: { systemKey: INTEGRATION_SYSTEM_KEYS.SHIPPO },
      select: {
        currentStatus: true,
        category: true,
        latencyMs: true,
        lastSuccessfulCheckAt: true,
        lastFailedCheckAt: true,
        lastErrorMessage: true,
        updatedAt: true,
      },
    }),
  ]);

  if (!shipment) {
    notFound();
  }

  const order = shipment.fulfillmentGroup.order;
  const paymentIds = order.payments.map((p) => p.id);
  const timelineEvents = await prisma.operationalActivityEvent.findMany({
    where: buildShipmentTimelineWhere(shipment.id, order.id, paymentIds),
    orderBy: { createdAt: "asc" },
    take: 250,
  });

  const addrSnap = pickAddressSnapshot(shipment.metadata);
  const metaObj =
    shipment.metadata && typeof shipment.metadata === "object" && !Array.isArray(shipment.metadata)
      ? (shipment.metadata as Record<string, unknown>)
      : null;
  const labelUrl = typeof metaObj?.labelUrl === "string" && metaObj.labelUrl.trim() ? metaObj.labelUrl.trim() : null;
  const rateId = shipment.selectedShippoRateId?.trim() ?? "";
  const tracking = shipment.trackingNumber?.trim() ?? "";
  const canPurchaseLabel = Boolean(rateId) && !tracking;

  return (
    <div className="space-y-8">
      <GovPageHeader
        eyebrow="Platform · Fulfillment"
        title={`Shipment · ${shipment.id.slice(0, 8)}…`}
        subtitle="Operational shipment row with fulfillment group, commerce order, optional pickup window, and operational events tied to this shipment id or parent order payments."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link
              href="/super-admin/shipping-operations"
              className="rounded-lg border border-cream-dark/60 bg-white px-3 py-1.5 text-[12px] font-semibold text-charcoal/80 shadow-sm transition hover:bg-cream-mid/40"
            >
              All shipments
            </Link>
            <Link
              href={`/super-admin/order-operations/${order.id}`}
              className="rounded-lg border border-cream-dark/60 bg-white px-3 py-1.5 text-[12px] font-semibold text-charcoal/80 shadow-sm transition hover:bg-cream-mid/40"
            >
              Order detail
            </Link>
          </div>
        }
      />

      <ShippoIntegrationStatusStrip snapshot={shippoHealth} />

      <OperationalCard title="Shipment" meta="shipments">
        <dl className="grid gap-3 sm:grid-cols-2 text-[13px]">
          <div className="sm:col-span-2">
            <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-charcoal/45">Shipment id</dt>
            <dd className="mt-1 font-mono text-[12px] text-charcoal/80 break-all">{shipment.id}</dd>
          </div>
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-charcoal/45">Status</dt>
            <dd className="mt-1">
              <StatusPill variant="neutral">{shipment.status}</StatusPill>
            </dd>
          </div>
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-charcoal/45">Carrier</dt>
            <dd className="mt-1 text-charcoal/80">{shipment.carrier ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-charcoal/45">Service</dt>
            <dd className="mt-1 text-charcoal/80">{shipment.shippingService ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-charcoal/45">Shipping charge</dt>
            <dd className="mt-1 text-charcoal/80">
              {shipment.shippingCents != null ? formatUsd(shipment.shippingCents) : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-charcoal/45">Tracking</dt>
            <dd className="mt-1 font-mono text-[12px] text-charcoal/80 break-all">{tracking || "—"}</dd>
          </div>
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-charcoal/45">Shipped at</dt>
            <dd className="mt-1 text-charcoal/80">
              {shipment.shippedAt
                ? shipment.shippedAt.toLocaleString(undefined, { dateStyle: "full", timeStyle: "short" })
                : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-charcoal/45">Updated</dt>
            <dd className="mt-1 text-charcoal/80">
              {shipment.updatedAt.toLocaleString(undefined, { dateStyle: "full", timeStyle: "short" })}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-charcoal/45">Saved Shippo rate id</dt>
            <dd className="mt-1 font-mono text-[11px] text-charcoal/75 break-all">{rateId || "—"}</dd>
          </div>
          {shipment.notes ? (
            <div className="sm:col-span-2">
              <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-charcoal/45">Notes</dt>
              <dd className="mt-1 text-charcoal/80 whitespace-pre-wrap">{shipment.notes}</dd>
            </div>
          ) : null}
        </dl>
      </OperationalCard>

      <OperationalCard
        title="Address snapshot (metadata)"
        meta={addrSnap ? "json subset" : "none detected"}
      >
        {addrSnap ? (
          <pre className="overflow-x-auto rounded-md border border-cream-dark/50 bg-white/80 p-3 font-mono text-[11px] text-charcoal/80">
            {JSON.stringify(addrSnap, null, 2)}
          </pre>
        ) : (
          <p className="text-[13px] text-charcoal/65 leading-relaxed">
            No recognised address keys on this row&apos;s <span className="font-mono">metadata</span> yet (
            <span className="font-mono">address</span>, <span className="font-mono">shipTo</span>,{" "}
            <span className="font-mono">destination</span>, <span className="font-mono">addressSnapshot</span>, etc.). If your
            pipeline stores a snapshot elsewhere, extend emitters to persist it on <span className="font-mono">Shipment.metadata</span>.
          </p>
        )}
      </OperationalCard>

      <OperationalCard title="Shipment metadata" meta={shipment.metadata != null ? "json" : "empty"}>
        {shipment.metadata != null ? (
          <div className="space-y-3">
            {labelUrl ? (
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-charcoal/45">Label URL</p>
                <a
                  href={labelUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-block font-mono text-[12px] text-teal-dark break-all hover:underline"
                >
                  {labelUrl}
                </a>
              </div>
            ) : null}
            <pre className="overflow-x-auto rounded-md border border-cream-dark/50 bg-white/80 p-3 font-mono text-[11px] text-charcoal/80">
              {JSON.stringify(shipment.metadata, null, 2)}
            </pre>
          </div>
        ) : (
          <p className="text-[13px] text-charcoal/60">No `metadata` json on this shipment row.</p>
        )}
      </OperationalCard>

      <OperationalCard title="Fulfillment group" meta="fulfillment_groups">
        <dl className="grid gap-3 sm:grid-cols-2 text-[13px]">
          <div className="sm:col-span-2">
            <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-charcoal/45">Group id</dt>
            <dd className="mt-1 font-mono text-[12px] break-all text-charcoal/80">{shipment.fulfillmentGroup.id}</dd>
          </div>
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-charcoal/45">Pipeline</dt>
            <dd className="mt-1">
              <StatusPill variant="neutral">{shipment.fulfillmentGroup.pipeline}</StatusPill>
            </dd>
          </div>
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-charcoal/45">Status</dt>
            <dd className="mt-1">
              <StatusPill variant="neutral">{shipment.fulfillmentGroup.status}</StatusPill>
            </dd>
          </div>
          {shipment.fulfillmentGroup.pickupWindow ? (
            <div className="sm:col-span-2">
              <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-charcoal/45">Pickup window</dt>
              <dd className="mt-1 text-charcoal/80">
                <span className="font-medium">{shipment.fulfillmentGroup.pickupWindow.label}</span>
                {" · "}
                {shipment.fulfillmentGroup.pickupWindow.startsAt.toLocaleString(undefined, {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}{" "}
                –{" "}
                {shipment.fulfillmentGroup.pickupWindow.endsAt.toLocaleString(undefined, {
                  timeStyle: "short",
                })}
              </dd>
            </div>
          ) : (
            <div className="sm:col-span-2 text-[13px] text-charcoal/55">No pickup window linked on this fulfillment group.</div>
          )}
        </dl>
      </OperationalCard>

      <OperationalCard title="Commerce order" meta="commerce_orders">
        <dl className="grid gap-3 sm:grid-cols-2 text-[13px]">
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-charcoal/45">Order id</dt>
            <dd className="mt-1">
              <Link href={`/super-admin/order-operations/${order.id}`} className="font-mono text-[12px] text-teal-dark break-all hover:underline">
                {order.id}
              </Link>
            </dd>
          </div>
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-charcoal/45">Order status</dt>
            <dd className="mt-1">
              <StatusPill variant="neutral">{order.status}</StatusPill>
            </dd>
          </div>
        </dl>
      </OperationalCard>

      <OperationalCard title="Operational actions" meta="api/ops/shipping">
        <div className="space-y-3 text-[13px] text-charcoal/80">
          {canPurchaseLabel ? (
            <div className="rounded-lg border border-cream-dark/50 bg-cream-mid/10 p-3">
              <p className="mb-2 text-[12px] text-charcoal/65">
                A Shippo rate is saved and tracking is not set — you can purchase a label via the existing ops endpoint (requires Cognito
                session with <span className="font-mono">shipping:write</span>, same as the Ops console).
              </p>
              <OpsPurchaseShippoLabelButton shipmentId={shipment.id} rateIdPresent={canPurchaseLabel} />
            </div>
          ) : (
            <p className="text-[13px] text-charcoal/65">
              Purchase is only offered when a <span className="font-mono">selected_shippo_rate_id</span> exists and tracking is still
              empty (avoids duplicate label buys).
            </p>
          )}
          <p className="text-[12px] text-charcoal/55 leading-relaxed border-t border-cream-dark/35 pt-3">
            Manual tracking rows and the parcel queue are implemented under the Ops shell — open{" "}
            <Link href="/ops/shipping" className="font-semibold text-teal-dark hover:underline">
              /ops/shipping
            </Link>{" "}
            to create manual <span className="font-mono">Shipment</span> rows or work the queue. There is no void-label API in this
            codebase; nothing else to wire here.
          </p>
        </div>
      </OperationalCard>

      <OperationalCard
        title="Operational timeline"
        meta={`operational_activity_events · filtered (${TIMELINE_TYPES.join(", ")})`}
      >
        {timelineEvents.length === 0 ? (
          <div className="space-y-2 text-[13px] text-charcoal/70 leading-relaxed">
            <p>No operational events matched this shipment id and parent order linkage yet.</p>
            <p className="text-[12px] text-charcoal/55">
              This query includes <span className="font-mono">order.created</span>, <span className="font-mono">payment.succeeded</span>,{" "}
              <span className="font-mono">payment.failed</span>, and <span className="font-mono">shipment.label_created</span> when
              metadata references <span className="font-mono">shipmentId</span>, the order uuid, or payment ids on this order — or when
              the message body contains the order uuid.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-cream-dark/40">
            {timelineEvents.map((row) => (
              <OperationalActivityEventRow key={row.id} row={row} />
            ))}
          </ul>
        )}
      </OperationalCard>
    </div>
  );
}
