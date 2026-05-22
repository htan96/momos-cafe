import Link from "next/link";
import type { Prisma } from "@prisma/client";
import GovPageHeader from "@/components/governance/GovPageHeader";
import OperationalCard from "@/components/governance/OperationalCard";
import StatusPill from "@/components/governance/StatusPill";
import { COMMERCE_ORDER_STATUSES, type CommerceOrderStatus } from "@/lib/commerce/orderLifecycle";
import { OPS_ENTITY_UUID_RE } from "@/lib/operations/operationalContextLinks";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function formatUsd(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

function shortId(id: string): string {
  return `${id.slice(0, 8)}…`;
}

function metadataSlug(meta: unknown): string | null {
  if (!meta || typeof meta !== "object" || Array.isArray(meta)) return null;
  const m = meta as Record<string, unknown>;
  const s = m.slug ?? m.orderSlug;
  return typeof s === "string" && s.trim() ? s.trim() : null;
}

function customerSummary(row: {
  customer: {
    email: string | null;
    phone: string | null;
    authMetadata: unknown;
  } | null;
}): string {
  const c = row.customer;
  if (!c) return "—";
  let name: string | null = null;
  if (c.authMetadata && typeof c.authMetadata === "object" && !Array.isArray(c.authMetadata)) {
    const am = c.authMetadata as Record<string, unknown>;
    const raw = am.fullName ?? am.name ?? am.displayName;
    name = typeof raw === "string" && raw.trim() ? raw.trim() : null;
  }
  const email = c.email?.trim() || null;
  if (name && email) return `${name} · ${email}`;
  if (email) return email;
  if (name) return name;
  if (c.phone?.trim()) return c.phone.trim();
  return "—";
}

function channelLabel(pipelines: string[]): string {
  const u = [...new Set(pipelines)].filter(Boolean);
  return u.length ? u.join(" · ") : "—";
}

function paymentState(
  payments: { status: string; squarePaymentStatus: string | null }[]
): string {
  if (payments.length === 0) return "—";
  const p = payments[0];
  const bits = [p.status, p.squarePaymentStatus].filter((x): x is string => Boolean(x && x.trim()));
  return bits.length ? bits.join(" · ") : p.status;
}

export default async function SuperAdminOrderOperationsPage({
  searchParams,
}: {
  searchParams?: Promise<{ status?: string; q?: string }>;
}) {
  const sp = searchParams ? await searchParams : {};
  const statusRaw = typeof sp.status === "string" ? sp.status.trim() : "";
  const qRaw = typeof sp.q === "string" ? sp.q.trim() : "";

  const statusFilter: CommerceOrderStatus | null =
    statusRaw && (COMMERCE_ORDER_STATUSES as readonly string[]).includes(statusRaw)
      ? (statusRaw as CommerceOrderStatus)
      : null;

  const where: Prisma.CommerceOrderWhereInput = {};
  if (statusFilter) where.status = statusFilter;
  if (qRaw) {
    if (OPS_ENTITY_UUID_RE.test(qRaw)) {
      where.id = qRaw;
    } else {
      where.customer = { is: { email: { contains: qRaw, mode: "insensitive" } } };
    }
  }

  const orders = await prisma.commerceOrder.findMany({
    where: Object.keys(where).length ? where : undefined,
    take: 75,
    orderBy: { createdAt: "desc" },
    include: {
      customer: { select: { email: true, phone: true, authMetadata: true } },
      payments: {
        select: { status: true, squarePaymentStatus: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
      fulfillmentGroups: { select: { pipeline: true } },
    },
  });

  return (
    <div className="space-y-8">
      <GovPageHeader
        eyebrow="Platform · Commerce"
        title="Order operations"
        subtitle="Filtered `commerce_orders` list (still capped at 75 newest matches). Scoped links respect status + quick search inputs."
        actions={
          <Link
            href="/super-admin/live-activity"
            className="rounded-lg border border-cream-dark/60 bg-white px-3 py-1.5 text-[12px] font-semibold text-charcoal/80 shadow-sm transition hover:bg-cream-mid/40"
          >
            Live activity
          </Link>
        }
      />

      <div className="rounded-xl border border-amber-500/35 bg-amber-50/70 px-4 py-3 text-[13px] text-charcoal/80 shadow-sm">
        <p className="font-semibold text-charcoal mb-2">Operational split</p>
        <ul className="list-disc ml-6 space-y-1 text-[12px] leading-relaxed">
          <li>
            <strong>Unified commerce orders below</strong> — Postgres <code className="font-mono text-[11px]">commerce_orders</code>.
          </li>
          <li>
            <strong>Legacy cafe / Square guest kitchen flow</strong> —{" "}
            <code className="font-mono text-[11px]">cafe_orders</code> tooling lives on{" "}
            <Link className="text-teal-dark font-semibold underline-offset-2 hover:underline" href="/super-admin/order-operations/legacy">
              Legacy orders
            </Link>{" "}
            until migrations collapse both paths.
          </li>
        </ul>
      </div>

      <OperationalCard title="Commerce orders — unified lifecycle" meta={`commerce_orders · ${orders.length}/75 matched`}>
        <form method="get" className="mb-5 flex flex-wrap items-end gap-3 text-[13px]">
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-charcoal/45">Status</span>
            <select
              name="status"
              defaultValue={statusFilter ?? ""}
              className="rounded-lg border border-cream-dark/70 bg-white px-3 py-2 min-w-[10rem]"
            >
              <option value="">Any</option>
              {COMMERCE_ORDER_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 min-w-[14rem] flex-1">
            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-charcoal/45">
              Quick search · order UUID or customer email substring
            </span>
            <input
              name="q"
              defaultValue={qRaw}
              placeholder="e.g. f2c3… or diner@momos..."
              className="rounded-lg border border-cream-dark/70 px-3 py-2 w-full font-mono text-[12px]"
            />
          </label>
          <button
            type="submit"
            className="rounded-lg border border-teal/35 bg-teal/[0.1] px-4 py-2 text-[12px] font-semibold text-teal-dark hover:bg-teal/[0.16]"
          >
            Apply filters
          </button>
        </form>
        {orders.length === 0 ? (
          <p className="text-[13px] text-charcoal/60">
            {Object.keys(where).length ? "No orders matched these filters yet." : "No commerce orders in the database yet."}
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-cream-dark/50">
            <table className="w-full min-w-[56rem] text-left text-[13px]">
              <thead className="border-b border-cream-dark/50 bg-cream-mid/20 text-[11px] uppercase tracking-[0.08em] text-charcoal/50">
                <tr>
                  <th className="px-3 py-2 font-semibold">Order</th>
                  <th className="px-3 py-2 font-semibold">Status</th>
                  <th className="px-3 py-2 font-semibold">Channel / pipeline</th>
                  <th className="px-3 py-2 font-semibold">Customer</th>
                  <th className="px-3 py-2 font-semibold">Total</th>
                  <th className="px-3 py-2 font-semibold">Created</th>
                  <th className="px-3 py-2 font-semibold">Payment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cream-dark/40">
                {orders.map((o) => {
                  const slug = metadataSlug(o.metadata);
                  const pipes = o.fulfillmentGroups.map((g) => g.pipeline);
                  return (
                    <tr key={o.id} className="bg-white/80">
                      <td className="px-3 py-2">
                        <Link
                          href={`/super-admin/order-operations/${o.id}`}
                          className="font-mono text-[12px] text-teal-dark hover:underline"
                          title={o.id}
                        >
                          {shortId(o.id)}
                        </Link>
                        {slug ? (
                          <span className="ml-2 text-[12px] text-charcoal/60" title="Slug from order metadata">
                            · {slug}
                          </span>
                        ) : null}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <StatusPill variant="neutral">{o.status}</StatusPill>
                          {o.status === "pending_payment" ? (
                            <StatusPill variant="warning">Pending pay</StatusPill>
                          ) : null}
                          {o.status === "paid" ? <StatusPill variant="neutral">Paid lifecycle</StatusPill> : null}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-charcoal/80">{channelLabel(pipes)}</td>
                      <td className="px-3 py-2 text-[12px] text-charcoal/75">{customerSummary(o)}</td>
                      <td className="px-3 py-2 font-medium text-charcoal">{formatUsd(o.totalCents)}</td>
                      <td className="px-3 py-2 text-[12px] text-charcoal/60">
                        {o.createdAt.toLocaleString(undefined, {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </td>
                      <td className="px-3 py-2 text-[12px] text-charcoal/70">{paymentState(o.payments)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </OperationalCard>
    </div>
  );
}
