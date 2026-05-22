import Link from "next/link";
import type { ReactNode } from "react";
import type {
  OperationalOrderConsoleSnapshot,
  OperationalTimelineEntry,
} from "@/lib/operations/orderConsole/loadOperationalOrderConsole";
import { buildSquareDashboardLinks } from "@/lib/commerce/squareOperationalVisibility";
import OperationalCard from "@/components/governance/OperationalCard";
import StatusPill from "@/components/governance/StatusPill";
import OpsPurchaseShippoLabelButton from "@/components/governance/OpsPurchaseShippoLabelButton";
import { formatUsdFromCents } from "@/lib/ops/formatUsd";
import {
  bucketForTimelineRow,
  bucketLabel,
  bucketPillClass,
  severityPillVariant,
  WebhookReceiptStatusPill,
} from "@/components/operations/order-console/orderTimelineTokens";
import FulfillmentTransitionButtons from "@/components/operations/order-console/FulfillmentTransitionButtons";
import OrderConsoleSuperAdminRecoveryClient from "@/components/operations/order-console/OrderConsoleSuperAdminRecoveryClient";
import type { FulfillmentPipeline } from "@/types/commerce";

export type OperationalOrderConsoleFlags = {
  canFulfillmentWrite: boolean;
  canShippingWrite: boolean;
  canRecovery: boolean;
  canGovernanceDebug: boolean;
};

export default function OperationalOrderConsole({
  audience,
  snapshot,
  flags,
}: {
  audience: "ops" | "super_admin";
  snapshot: OperationalOrderConsoleSnapshot;
  flags: OperationalOrderConsoleFlags;
}) {
  const order = snapshot.order!;
  const linkEnv = process.env;
  const baseSquareLinks = buildSquareDashboardLinks(linkEnv);
  const orderSquareLinks = buildSquareDashboardLinks(linkEnv, { squareOrderId: snapshot.orderSquareOrderId });
  const hasSquareConsoleBase = Boolean(baseSquareLinks.transactions);
  const allOrdersHref = audience === "ops" ? "/ops/orders" : "/super-admin/order-operations";

  const cust = customerLines(order);
  const hasRetailPipeline = order.fulfillmentGroups.some((g) => g.pipeline.trim().toUpperCase() === "RETAIL");

  function customerOpsLink(): ReactNode {
    if (!order.customerId) return null;
    if (audience === "super_admin") {
      return (
        <Link
          href={`/super-admin/users/customers/${order.customerId}`}
          className="inline-flex rounded-lg border border-cream-dark/60 bg-white px-3 py-1.5 text-[12px] font-semibold text-charcoal/80 shadow-sm transition hover:bg-cream-mid/40"
        >
          Customer operations dossier
        </Link>
      );
    }
    if (flags.canRecovery) {
      return (
        <Link
          href={`/super-admin/users/customers/${order.customerId}`}
          className="inline-flex rounded-lg border border-cream-dark/60 bg-white px-3 py-1.5 text-[12px] font-semibold text-charcoal/80 shadow-sm transition hover:bg-cream-mid/40"
        >
          Customer · super-admin
        </Link>
      );
    }
    return (
      <p className="text-[12px] text-charcoal/55">
        Customer id <span className="font-mono">{order.customerId.slice(0, 8)}…</span> — upgrade to super-admin workspace
        for account tooling.
      </p>
    );
  }

  return (
    <div className="space-y-8">
      <OperationalCard
        title="Order overview"
        meta={`${order.source ?? "unknown source"} · ${order.fulfillmentMode}${snapshot.mixedKitchenRetailBadge ? " · mixed pipelines" : ""}`}
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-display text-xl text-teal-dark tracking-tight">
                {snapshot.metaLabels.orderLabel ?? `Commerce order · ${order.id.slice(0, 8)}…`}
              </h3>
              <StatusPill variant="neutral">{order.status}</StatusPill>
              {snapshot.orphanPaymentSignals ? (
                <StatusPill variant="warning">Orphan PSP risk</StatusPill>
              ) : null}
              {snapshot.mixedKitchenRetailBadge ? (
                <StatusPill variant="neutral">Kitchen + retail split</StatusPill>
              ) : null}
            </div>
            <p className="text-[11px] font-mono text-charcoal/55 break-all">UUID · {order.id}</p>
            <p className="text-[13px] text-charcoal/75">
              Created ·{" "}
              <time dateTime={order.createdAt.toISOString()}>{formattedFull(order.createdAt)}</time>
              {order.updatedAt.getTime() !== order.createdAt.getTime() ?
                <>
                  {" "}
                  · Updated {formattedFull(order.updatedAt)}
                </>
              : null}
            </p>
            <p className="text-[13px] font-semibold text-charcoal">{formatUsdFromCents(order.totalCents)} total</p>
            {typeof order.kitchenSubtotalCents === "number" && typeof order.retailSubtotalCents === "number" ?
              <p className="text-[12px] text-charcoal/55">
                Kitchen subtotal · {formatUsdFromCents(order.kitchenSubtotalCents)} · Retail subtotal ·{" "}
                {formatUsdFromCents(order.retailSubtotalCents)}
              </p>
            : null}
          </div>

          <div className="flex flex-col gap-2 items-start">
            <Link
              href={allOrdersHref}
              className="rounded-lg border border-cream-dark/60 bg-white px-3 py-1.5 text-[12px] font-semibold text-charcoal/80 shadow-sm transition hover:bg-cream-mid/40"
            >
              All orders
            </Link>
            {customerOpsLink()}
          </div>
        </div>

        <dl className="mt-6 grid gap-4 sm:grid-cols-2 text-[13px]">
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-charcoal/45">Fulfillment mode</dt>
            <dd className="mt-1">
              <StatusPill variant="neutral">{order.fulfillmentMode}</StatusPill>
            </dd>
          </div>
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-charcoal/45">Source</dt>
            <dd className="mt-1 text-charcoal">{order.source ?? "—"}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-charcoal/45">Guest cart token</dt>
            <dd className="mt-1 font-mono text-[12px] text-charcoal/65 break-all">{order.guestCartToken ?? "—"}</dd>
          </div>
        </dl>
      </OperationalCard>

      <OperationalCard title="Customer snapshot" meta="commerce_customers · contact">
        <ul className="space-y-1 text-[13px] text-charcoal/80">
          {cust.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </OperationalCard>

      <OperationalCard title="Fulfillment nucleus" meta="kitchen · retail pipelines">
        {order.fulfillmentGroups.length === 0 ?
          <p className="text-[13px] text-charcoal/60">No fulfillment groups.</p>
        : (
          <div className="space-y-6">
            {order.fulfillmentGroups.map((g) => {
              const pipelineUpper = g.pipeline.trim().toUpperCase();
              const isKitchen = pipelineUpper === "KITCHEN";
              const isRetail = pipelineUpper === "RETAIL";
              const latestShip = g.shipments[0];
              const label = isKitchen ? "External kitchen · Square-facing" : isRetail ? "Native retail shipping" : "Other pipeline";

              return (
                <div key={g.id} className="rounded-xl border border-cream-dark/50 bg-white/80 p-4 space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-charcoal/40">
                      {label}
                    </span>
                    <StatusPill variant="neutral">{g.pipeline}</StatusPill>
                    <StatusPill variant="neutral">{g.status}</StatusPill>
                  </div>
                  <p className="text-[11px] font-mono text-charcoal/52 break-all">Group · {g.id}</p>

                  {g.pickupWindow ?
                    <p className="text-[13px] text-charcoal/75">
                      Pickup window · <span className="font-semibold">{g.pickupWindow.label}</span> ·{" "}
                      {g.pickupWindow.startsAt.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
                      –
                      {g.pickupWindow.endsAt.toLocaleString(undefined, { timeStyle: "short" })}
                    </p>
                  : null}

                  {isKitchen ?
                    <>
                      <p className="text-[12px] text-charcoal/55 leading-relaxed">
                        Kitchen copy lives in Square timelines — these transitions only mutate our shadow row for storefront
                        operators.
                      </p>
                      {(() => {
                        const pipe = normalizePipeline(g.pipeline);
                        return pipe ?
                            <FulfillmentTransitionButtons
                              orderId={order.id}
                              groupId={g.id}
                              pipeline={pipe}
                              status={g.status}
                              canFulfillmentWrite={flags.canFulfillmentWrite}
                            />
                          : null;
                      })()}
                    </>
                  : null}

                  {isRetail ?
                    <>
                      {!latestShip ?
                        <p className="text-[13px] text-charcoal/55">Shipment row pending for this RETAIL partition.</p>
                      : (
                        <div className="rounded-lg border border-cream-dark/40 bg-cream-mid/15 p-3 space-y-2 text-[13px]">
                          <div className="flex flex-wrap items-center gap-3">
                            <span className="font-mono text-[12px] text-charcoal/70">{latestShip.id}</span>
                            {audience === "super_admin" ?
                              <Link
                                href={`/super-admin/shipping-operations/${latestShip.id}`}
                                className="text-[12px] font-semibold text-teal-dark underline-offset-2 hover:underline"
                              >
                                Shipping console
                              </Link>
                            : null}
                            <span className="text-[11px] text-charcoal/50">{latestShip.carrier ?? "carrier TBD"}</span>
                          </div>
                          <p className="font-mono text-[11px] text-charcoal/70 break-all">
                            Tracking · {latestShip.trackingNumber ?? "—"}
                          </p>
                          <p className="text-[12px] text-charcoal/60">
                            Shippo quote rate id ·{" "}
                            <span className={latestShip.selectedShippoRateId ? "font-mono text-charcoal/80" : ""}>
                              {latestShip.selectedShippoRateId ?? "—"}
                            </span>
                          </p>
                          {flags.canShippingWrite && Boolean(latestShip.selectedShippoRateId) ?
                            <OpsPurchaseShippoLabelButton
                              shipmentId={latestShip.id}
                              rateIdPresent={Boolean(latestShip.selectedShippoRateId)}
                            />
                          : flags.canShippingWrite ?
                            <p className="text-[12px] text-charcoal/50">
                              Waiting on storefront quote — Shippo purchase disabled until{" "}
                              <span className="font-mono">selected_shippo_rate_id</span> is saved.
                            </p>
                          : (
                            <p className="text-[12px] text-charcoal/50">
                              Shipping label purchase requires an ops session with <span className="font-mono">shipping:write</span>.
                            </p>
                          )}
                        </div>
                      )}
                      {(() => {
                        const pipe = normalizePipeline(g.pipeline);
                        return pipe ?
                            <div className="pt-3">
                              <FulfillmentTransitionButtons
                                orderId={order.id}
                                groupId={g.id}
                                pipeline={pipe}
                                status={g.status}
                                canFulfillmentWrite={flags.canFulfillmentWrite}
                              />
                            </div>
                          : null;
                      })()}
                    </>
                  : null}

                  {!isKitchen && !isRetail ?
                    <p className="text-[12px] text-charcoal/55">
                      Pipeline `{g.pipeline}` does not expose scripted kitchen/retail buttons here yet.
                    </p>
                  : null}

                  {!isRetail && g.shipments.length ?
                    <div className="text-[12px] text-charcoal/60">
                      <span className="font-semibold text-charcoal/70">{g.shipments.length}</span> shipment row(s)
                      historically attached outside RETAIL partitioning — investigate before mutating manually.
                    </div>
                  : null}
                </div>
              );
            })}
          </div>
        )}
      </OperationalCard>

      <OperationalCard title="Payments & Square" meta={`payment_records · ${order.payments.length}`}>
        <div className="space-y-4 text-[13px] text-charcoal/75 leading-relaxed">
          <div>
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-charcoal/45 mb-2">Dashboard</h3>
            {!hasSquareConsoleBase ?
              <p className="text-[13px] text-charcoal/60">
                Square links unavailable — configure at least one Square env signal referenced in docs for this module.
              </p>
            : (
              <div className="flex flex-wrap gap-2">
                <a
                  href={baseSquareLinks.transactions}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg border border-cream-dark/60 bg-white px-3 py-1.5 text-[12px] font-semibold text-charcoal/80 shadow-sm transition hover:bg-cream-mid/40"
                >
                  Transactions
                </a>
                {snapshot.orderSquareOrderId && orderSquareLinks.order ?
                  <a
                    href={orderSquareLinks.order}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-lg border border-cream-dark/60 bg-white px-3 py-1.5 text-[12px] font-semibold text-charcoal/80 shadow-sm transition hover:bg-cream-mid/40"
                  >
                    Square order
                  </a>
                : null}
                {order.payments.map((p) => {
                  const links = buildSquareDashboardLinks(linkEnv, {
                    squarePaymentId: p.squarePaymentId,
                    squareOrderId: snapshot.orderSquareOrderId,
                  });
                  return links.payment ?
                      <a
                        key={`sq-pay-${p.id}`}
                        href={links.payment}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-lg border border-cream-dark/60 bg-white px-3 py-1.5 text-[12px] font-semibold text-charcoal/80 shadow-sm transition hover:bg-cream-mid/40"
                      >
                        Payment · {(p.squarePaymentId ?? "").slice(0, 8)}…
                      </a>
                    : null;
                })}
              </div>
            )}
          </div>

          {!order.payments.length ?
            <p className="text-[13px] text-charcoal/60">No payment rows tied to this order.</p>
          : (
            <div className="overflow-x-auto rounded-lg border border-cream-dark/50">
              <table className="w-full min-w-[48rem] text-left text-[13px]">
                <thead className="border-b border-cream-dark/50 bg-cream-mid/20 text-[11px] uppercase tracking-[0.08em] text-charcoal/50">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Record</th>
                    <th className="px-3 py-2 font-semibold">Status</th>
                    <th className="px-3 py-2 font-semibold">Sq status</th>
                    <th className="px-3 py-2 font-semibold">Amount</th>
                    <th className="px-3 py-2 font-semibold">Provider</th>
                    <th className="px-3 py-2 font-semibold">Captured</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-cream-dark/40">
                  {order.payments.map((p) => (
                    <tr key={p.id} className="bg-white/80">
                      <td className="px-3 py-2 font-mono text-[11px]">{p.id.slice(0, 8)}…</td>
                      <td className="px-3 py-2">
                        <StatusPill variant="neutral">{p.status}</StatusPill>
                      </td>
                      <td className="px-3 py-2 font-mono text-[12px]">{p.squarePaymentStatus ?? "—"}</td>
                      <td className="px-3 py-2">{formatUsdFromCents(p.amountCents)}</td>
                      <td className="px-3 py-2">{p.provider}</td>
                      <td className="px-3 py-2 text-[12px] text-charcoal/60">
                        {p.capturedAt ?
                          p.capturedAt.toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" })
                        : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {snapshot.webhookSyncLines.length ?
            <div className="rounded-lg border border-cream-dark/40 bg-cream-mid/15 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-charcoal/45 mb-2">Sync hints</p>
              <ul className="space-y-1 text-[11px] font-mono leading-snug text-charcoal/75">
                {snapshot.webhookSyncLines.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </div>
          : null}
        </div>
      </OperationalCard>

      <OperationalCard title="Line items" meta={`commerce_order_items · ${order.items.length}`}>
        {order.items.length === 0 ?
          <p className="text-[13px] text-charcoal/60">No persisted line rows.</p>
        : (
          <div className="overflow-x-auto rounded-lg border border-cream-dark/50">
            <table className="w-full min-w-[42rem] text-left text-[13px]">
              <thead className="border-b border-cream-dark/50 bg-cream-mid/20 text-[11px] uppercase tracking-[0.08em] text-charcoal/50">
                <tr>
                  <th className="px-3 py-2 font-semibold">Title</th>
                  <th className="px-3 py-2 font-semibold">Pipeline</th>
                  <th className="px-3 py-2 font-semibold">Qty</th>
                  <th className="px-3 py-2 font-semibold">Unit</th>
                  <th className="px-3 py-2 font-semibold">Line</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cream-dark/35">
                {order.items.map((it) => {
                  const total = it.unitPriceCents * it.quantity;
                  return (
                    <tr key={it.id} className="bg-white/80">
                      <td className="px-3 py-2">{it.title}</td>
                      <td className="px-3 py-2">{it.fulfillmentPipeline}</td>
                      <td className="px-3 py-2">{it.quantity}</td>
                      <td className="px-3 py-2">{formatUsdFromCents(it.unitPriceCents)}</td>
                      <td className="px-3 py-2">{formatUsdFromCents(total)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </OperationalCard>

      <OperationalCard title="Operational timeline (merged)" meta="payments · fulfillment · webhooks · recovery">
        {snapshot.unifiedTimeline.length ?
          (
            <ul className="divide-y divide-cream-dark/35">
              {snapshot.unifiedTimeline.map((entry) => (
                <UnifiedTimelineRow key={entry.id} entry={entry} />
              ))}
            </ul>
          )
        : (
          <p className="text-[13px] text-charcoal/60">No stitched operational rows yet.</p>
        )}
        <p className="mt-4 text-[12px] text-charcoal/55 leading-relaxed">
          Feed merges OperationalActivityEnvelope matches (canonical types + PSP webhook taxonomy), Postgres webhook receipts,
          and recent notification-queue rows keyed to this commerce order shell.
        </p>
      </OperationalCard>

      <OperationalCard title="Recovery routing" meta="deep links · super-admin tooling">
        <RecoverySection snapshot={snapshot} flags={flags} hasRetailPipeline={hasRetailPipeline} />

        {!flags.canGovernanceDebug ?
          <div className="mt-5 rounded-lg border border-dashed border-cream-dark/45 bg-white/85 p-3 text-[12px] text-charcoal/65">
            Super-admin recovery POST routes stay hidden until you elevate to super-admin tooling — admins still use ops APIs
            with `shipping:write`/`fulfillment:write` scopes above.
          </div>
        : null}

        <div className="mt-8 space-y-3 text-[13px] text-charcoal/75">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-charcoal/45">Operational context</p>
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            {flags.canRecovery && order.customerId ?
              <Link
                href={`/super-admin/users/customers/${order.customerId}`}
                className="text-[12px] font-semibold text-teal-dark hover:underline"
              >
                Customer dossier · super-admin
              </Link>
            : audience === "super_admin" && order.customerId ?
              <Link
                href={`/super-admin/users/customers/${order.customerId}`}
                className="text-[12px] font-semibold text-teal-dark hover:underline"
              >
                Customer dossier
              </Link>
            : null}

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] uppercase text-charcoal/40">Communication</span>
              {order.emailThreads.length ?
                order.emailThreads.map((t) => (
                  <Link key={t.id} href={`/ops/communications/${t.id}`} className="font-mono text-[11px] text-teal-dark hover:underline">
                    {t.subjectSnapshot?.slice(0, 32) ?? t.id.slice(0, 8)}…
                  </Link>
                ))
              : (
                <span className="text-[12px] text-charcoal/50">None linked · open Ops communications to bind.</span>
              )}
            </div>
          </div>

          {!flags.canRecovery ?
            <div className="rounded-md border border-dashed border-charcoal/20 bg-charcoal/[0.02] p-3 text-[12px] text-charcoal/60 leading-relaxed">
              Incidents, catering dossiers, and customer governance links stay behind super-admin navigation — escalate if you need
              that cross-section.
            </div>
          : (
            <>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-charcoal/45 mb-2">Incidents · heuristic match</p>
                {snapshot.relatedIncidents.length === 0 ?
                  <p className="text-[12px] text-charcoal/55">No incidents surfaced.</p>
                : (
                  <ul className="space-y-2">
                    {snapshot.relatedIncidents.map((inc) => (
                      <li key={inc.id} className="text-[12px]">
                        <Link
                          href={`/super-admin/incidents?highlight=${encodeURIComponent(inc.id)}`}
                          className="font-semibold text-teal-dark hover:underline"
                        >
                          {inc.title}
                        </Link>
                        <span className="text-charcoal/45"> · {inc.severity}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-charcoal/45 mb-2">Catering</p>
                {snapshot.cateringInquiryId ?
                  <Link
                    href={`/super-admin/catering-inquiries/${snapshot.cateringInquiryId}`}
                    className="text-[12px] font-semibold text-teal-dark hover:underline"
                  >
                    Open catering inquiry ({snapshot.cateringInquiryId.slice(0, 8)}…)
                  </Link>
                : snapshot.isCateringPipeline ?
                  <p className="text-[12px] text-charcoal/55">Pipeline mentions catering but inquiry UUID absent.</p>
                : (
                  <p className="text-[12px] text-charcoal/55">No catering correlation.</p>
                )}
              </div>
            </>
          )}
        </div>
      </OperationalCard>

      {flags.canGovernanceDebug ?
        <OperationalCard title="Advanced identifiers" meta="super_admin · diagnostic">
          <details className="group rounded-xl border border-cream-dark/50 bg-charcoal/[0.02] p-3">
            <summary className="cursor-pointer text-[12px] font-semibold text-charcoal">
              Inspect ids & legacy mirrors
            </summary>
            <div className="mt-4 space-y-3 text-[12px] text-charcoal/75">
              <ul className="space-y-1 font-mono text-[11px]">
                <li>commerce_order_id · {order.id}</li>
                <li>Square order id metadata · {snapshot.orderSquareOrderId ?? "—"}</li>
                <li>
                  Checkout attempt metadata ·{" "}
                  {(snapshot.metaLabels.checkoutAttemptId ?? "—") as string}{" "}
                </li>
              </ul>
              <div>
                <p className="text-[11px] font-semibold text-charcoal/45 uppercase tracking-[0.1em] mb-1">
                  Webhook delivery receipts ({snapshot.webhookReceipts.length})
                </p>
                <ul className="font-mono text-[11px] space-y-1 break-all max-h-40 overflow-y-auto">
                  {snapshot.webhookReceipts.length ?
                    snapshot.webhookReceipts.map((r) => <li key={r.id}>{r.id}</li>)
                  : (
                    <li>—</li>
                  )}
                </ul>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.1em] mb-1">Legacy cafe orders ({snapshot.legacyCafeOrders.length})</p>
                {snapshot.legacyCafeOrders.length === 0 ?
                  <p className="text-[12px] text-charcoal/55">None matched by linked email/metadata id.</p>
                : (
                  <ul className="space-y-2 font-mono text-[11px]">
                    {snapshot.legacyCafeOrders.map((c) => (
                      <li key={c.id}>
                        <Link href={`/super-admin/order-operations/legacy/${c.id}`} className="text-teal-dark hover:underline">
                          {c.id.slice(0, 8)}…
                        </Link>{" "}
                        · {c.status}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <details className="rounded-lg bg-white border border-cream-dark/40 p-2">
                <summary className="cursor-pointer text-[11px] font-semibold">Raw metadata snapshot</summary>
                <pre className="mt-2 text-[11px] overflow-x-auto max-h-[220px]">
                  {JSON.stringify(order.metadata, null, 2)}
                </pre>
              </details>
            </div>
          </details>
        </OperationalCard>
      : null}

      <OperationalCard title="Raw telemetry note">
        <p className="text-[12px] text-charcoal/65 leading-relaxed">
          Telemetry rows remain append-only — if an emitter forgot <span className="font-mono">commerceOrderId</span>,
          escalate coverage by patching emitters (<span className="font-mono">order.created</span> emits both identifiers now).
          Use Live activity with your commerce UUID when you still need infra HTTP receipts.
        </p>
      </OperationalCard>
    </div>
  );
}

function formattedFull(dt: Date) {
  return dt.toLocaleString(undefined, { dateStyle: "full", timeStyle: "short" });
}

function customerLines(order: OperationalOrderConsoleSnapshot["order"]) {
  if (!order) return ["Commerce order unavailable"];
  const c = order.customer;
  if (!c) return ["No linked customer"];
  const lines: string[] = [];
  if (c.email?.trim()) lines.push(`Email · ${c.email}`);
  if (c.phone?.trim()) lines.push(`Phone · ${c.phone}`);
  if (c.authMetadata && typeof c.authMetadata === "object" && !Array.isArray(c.authMetadata)) {
    const am = c.authMetadata as Record<string, unknown>;
    for (const key of ["fullName", "name", "displayName"] as const) {
      const v = am[key];
      if (typeof v === "string" && v.trim()) {
        lines.push(`Auth name · ${v.trim()}`);
        break;
      }
    }
  }
  return lines.length ? lines : ["Customer row persisted without email/phone"];
}

function RecoverySection({
  snapshot,
  flags,
  hasRetailPipeline,
}: {
  snapshot: OperationalOrderConsoleSnapshot;
  flags: OperationalOrderConsoleFlags;
  hasRetailPipeline: boolean;
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {flags.canRecovery ?
          <>
            <Link
              href={`/super-admin/operations/failures?commerceOrderId=${encodeURIComponent(snapshot.order!.id)}`}
              className="rounded-lg border border-cream-dark/60 bg-white px-3 py-1.5 text-[12px] font-semibold text-charcoal/80 shadow-sm transition hover:bg-cream-mid/40"
            >
              Failures inbox
            </Link>
            <Link
              href={`/super-admin/live-activity?commerceOrderId=${encodeURIComponent(snapshot.order!.id)}&filter=PAYMENTS`}
              className="rounded-lg border border-cream-dark/60 bg-white px-3 py-1.5 text-[12px] font-semibold text-charcoal/80 shadow-sm transition hover:bg-cream-mid/40"
            >
              Live activity
            </Link>
          </>
        : (
          <div className="rounded-lg border border-dashed border-amber-400/55 bg-amber-50 px-4 py-3 text-[12px] text-amber-950/85">
            Failures inbox + scoped live activity feeds require navigating as a super-admin; ops admins should coordinate for
            those URLs (middleware blocks `/super-admin` without elevated groups).
          </div>
        )}
      </div>

      {flags.canGovernanceDebug ?
        <OrderConsoleSuperAdminRecoveryClient
          commerceOrderId={snapshot.order!.id}
          showCatalogSyncHint={
            hasRetailPipeline || snapshot.order!.retailSubtotalCents > 0 || snapshot.order!.items.some((it) =>
              it.fulfillmentPipeline.trim().toLowerCase().includes("retail")
            )
          }
        />
      : null}
    </div>
  );
}

function normalizePipeline(pipelineRaw: string): FulfillmentPipeline | null {
  const p = pipelineRaw.trim().toUpperCase();
  if (p === "KITCHEN" || p === "RETAIL") return p;
  return null;
}

function receiptMeta(receiptId: string | null) {
  if (!receiptId) return null;
  return (
    <p className="text-[11px] font-mono text-charcoal/48 mt-1">
      Webhook delivery receipt · {receiptId}
    </p>
  );
}

function UnifiedTimelineRow({ entry }: { entry: OperationalTimelineEntry }) {
  if (entry.kind === "activity") {
    const row = entry.row;
    const bucket = bucketForTimelineRow(entry);
    const rid = extractWebhookReceiptHint(row.metadata);
    return (
      <li className="py-4 flex flex-col gap-2 md:flex-row md:justify-between md:gap-4">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <time
              className="text-[11px] font-semibold uppercase tracking-[0.1em] text-charcoal/45"
              dateTime={row.createdAt.toISOString()}
            >
              {row.createdAt.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
            </time>
            <span
              className={`rounded-full border px-2 py-[1px] text-[10px] font-semibold uppercase tracking-[0.08em] ${bucketPillClass(bucket)}`}
            >
              {bucketLabel(bucket)}
            </span>
            <StatusPill variant={severityPillVariant(row.severity)}>{row.severity}</StatusPill>
            <span className="font-mono text-[11px] text-charcoal/55 break-all">{row.type}</span>
          </div>
          <p className="text-[13px] text-charcoal leading-snug">{row.message}</p>
          {receiptMeta(rid)}
          {(row.actorType || row.actorId || row.actorName || row.source) && (
            <p className="text-[12px] text-charcoal/55">
              {[row.actorType, row.actorId ? truncateId(row.actorId) : null, row.actorName, row.source]
                .filter(Boolean)
                .join(" · ")}
            </p>
          )}
        </div>
      </li>
    );
  }

  if (entry.kind === "webhook_receipt") {
    const r = entry.row;
    return (
      <li className="py-4 flex flex-col gap-2">
        <div className="flex flex-wrap gap-2 items-center">
          <time className="text-[11px] font-semibold uppercase tracking-[0.1em] text-charcoal/45">{formattedFull(r.receivedAt)}</time>
          <span className={`rounded-full border px-2 py-[1px] text-[10px] font-semibold uppercase tracking-[0.08em] ${bucketPillClass("webhook")}`}>
            {bucketLabel("webhook")}
          </span>
          <WebhookReceiptStatusPill receipt={r} />
        </div>
        <p className="text-[12px] text-charcoal/70">
          {r.provider}{r.eventType ? ` · ${r.eventType}` : ""}{" "}
          {r.commerceOrderId ? `· order ${truncateId(String(r.commerceOrderId))}` : ""}{" "}
          {r.paymentRecordId ? `· payment ${truncateId(String(r.paymentRecordId))}` : ""}{" "}
        </p>
        <code className="text-[11px] font-mono text-charcoal/55 break-all">receipt:{r.id}</code>
      </li>
    );
  }

  const n = entry.row;
  return (
    <li className="py-4 space-y-1">
      <div className="flex flex-wrap items-center gap-2">
        <time className="text-[11px] font-semibold uppercase tracking-[0.1em] text-charcoal/45">{formattedFull(n.createdAt)}</time>
        <span className={`rounded-full border px-2 py-[1px] text-[10px] font-semibold uppercase tracking-[0.08em] ${bucketPillClass("notification")}`}>
          Notification
        </span>
        <span className="font-mono text-[11px] text-charcoal/55">{n.type}</span>
        <StatusPill variant="neutral">{n.processedAt ? "processed" : "pending"}</StatusPill>
      </div>
      <pre className="text-[11px] whitespace-pre-wrap break-all bg-charcoal/[0.02] border border-charcoal/[0.04] rounded-md p-2 max-h-44 overflow-auto">
        {typeof n.payload === "object" ? JSON.stringify(n.payload, null, 2) : String(n.payload)}
      </pre>
    </li>
  );
}

function truncateId(raw: string) {
  if (raw.length <= 14) return raw;
  return `${raw.slice(0, 12)}…`;
}

function extractWebhookReceiptHint(meta: unknown): string | null {
  if (!meta || typeof meta !== "object" || Array.isArray(meta)) return null;
  const m = meta as Record<string, unknown>;
  const nested =
    m.detail && typeof m.detail === "object" && !Array.isArray(m.detail)
      ? (m.detail as Record<string, unknown>)
      : {};
  const ridRaw = nested.receiptId ?? m.receiptId;
  const rid = typeof ridRaw === "string" ? ridRaw.trim() : "";
  return rid.length ? rid : null;
}
