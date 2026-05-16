import Link from "next/link";
import GovPageHeader from "@/components/governance/GovPageHeader";
import OperationalCard from "@/components/governance/OperationalCard";
import StatusPill from "@/components/governance/StatusPill";
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

export default async function SuperAdminOrderOperationsPage() {
  const orders = await prisma.commerceOrder.findMany({
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
        subtitle="Recent `CommerceOrder` rows from Postgres — newest 75. Open a row for line items, payments, fulfillment, shipments, and operational timeline."
        actions={
          <Link
            href="/super-admin/live-operations"
            className="rounded-lg border border-cream-dark/60 bg-white px-3 py-1.5 text-[12px] font-semibold text-charcoal/80 shadow-sm transition hover:bg-cream-mid/40"
          >
            Live operations
          </Link>
        }
      />

      <OperationalCard title="Commerce orders" meta={`commerce_orders · ${orders.length} / 75`}>
        {orders.length === 0 ? (
          <p className="text-[13px] text-charcoal/60">No commerce orders in the database yet.</p>
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
                        <StatusPill variant="neutral">{o.status}</StatusPill>
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
