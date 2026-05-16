import Link from "next/link";
import GovPageHeader from "@/components/governance/GovPageHeader";
import OperationalCard from "@/components/governance/OperationalCard";
import ShippoIntegrationStatusStrip from "@/components/governance/ShippoIntegrationStatusStrip";
import StatusPill from "@/components/governance/StatusPill";
import { INTEGRATION_SYSTEM_KEYS } from "@/lib/operations/integrationHealth/types";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function shortId(id: string): string {
  return `${id.slice(0, 8)}…`;
}

function maskTracking(raw: string | null | undefined): { display: string; full: string | null } {
  const t = raw?.trim() ?? "";
  if (!t) return { display: "—", full: null };
  if (t.length <= 4) return { display: "••••", full: t };
  return { display: `••••${t.slice(-4)}`, full: t };
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

export default async function SuperAdminShippingOperationsPage() {
  const [shipments, shippoHealth] = await Promise.all([
    prisma.shipment.findMany({
      take: 75,
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
      include: {
        fulfillmentGroup: {
          include: {
            order: {
              include: {
                customer: { select: { email: true, phone: true, authMetadata: true } },
              },
            },
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

  return (
    <div className="space-y-8">
      <GovPageHeader
        eyebrow="Platform · Fulfillment"
        title="Shipping operations"
        subtitle="Recent `Shipment` rows from Postgres — newest 75 by `updatedAt`. Carrier storefront quotes and label purchase metadata live on each row; drill in for fulfillment group, order, and operational timeline."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link
              href="/super-admin/order-operations"
              className="rounded-lg border border-cream-dark/60 bg-white px-3 py-1.5 text-[12px] font-semibold text-charcoal/80 shadow-sm transition hover:bg-cream-mid/40"
            >
              Order operations
            </Link>
            <Link
              href="/super-admin/live-operations"
              className="rounded-lg border border-cream-dark/60 bg-white px-3 py-1.5 text-[12px] font-semibold text-charcoal/80 shadow-sm transition hover:bg-cream-mid/40"
            >
              Live operations
            </Link>
          </div>
        }
      />

      <ShippoIntegrationStatusStrip snapshot={shippoHealth} />

      <OperationalCard title="Shipments" meta={`shipments · ${shipments.length} / 75`}>
        {shipments.length === 0 ? (
          <p className="text-[13px] text-charcoal/60">No shipment rows in the database yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-cream-dark/50">
            <table className="w-full min-w-[62rem] text-left text-[13px]">
              <thead className="border-b border-cream-dark/50 bg-cream-mid/20 text-[11px] uppercase tracking-[0.08em] text-charcoal/50">
                <tr>
                  <th className="px-3 py-2 font-semibold">Shipment</th>
                  <th className="px-3 py-2 font-semibold">Status</th>
                  <th className="px-3 py-2 font-semibold">Carrier / service</th>
                  <th className="px-3 py-2 font-semibold">Order</th>
                  <th className="px-3 py-2 font-semibold">Customer</th>
                  <th className="px-3 py-2 font-semibold">Tracking</th>
                  <th className="px-3 py-2 font-semibold">Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cream-dark/40">
                {shipments.map((s) => {
                  const order = s.fulfillmentGroup.order;
                  const mask = maskTracking(s.trackingNumber);
                  const svc = [s.carrier, s.shippingService].filter((x): x is string => Boolean(x && x.trim()));
                  return (
                    <tr key={s.id} className="bg-white/80">
                      <td className="px-3 py-2">
                        <Link
                          href={`/super-admin/shipping-operations/${s.id}`}
                          className="font-mono text-[12px] text-teal-dark hover:underline"
                          title={s.id}
                        >
                          {shortId(s.id)}
                        </Link>
                      </td>
                      <td className="px-3 py-2">
                        <StatusPill variant="neutral">{s.status}</StatusPill>
                      </td>
                      <td className="px-3 py-2 text-charcoal/80">{svc.length ? svc.join(" · ") : "—"}</td>
                      <td className="px-3 py-2">
                        <Link
                          href={`/super-admin/order-operations/${order.id}`}
                          className="font-mono text-[12px] text-teal-dark hover:underline"
                          title={order.id}
                        >
                          {shortId(order.id)}
                        </Link>
                      </td>
                      <td className="px-3 py-2 text-[12px] text-charcoal/75">{customerSummary({ customer: order.customer })}</td>
                      <td className="px-3 py-2 font-mono text-[12px] text-charcoal/70" title={mask.full ?? undefined}>
                        {mask.display}
                      </td>
                      <td className="px-3 py-2 text-[12px] text-charcoal/60">
                        {s.updatedAt.toLocaleString(undefined, {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </OperationalCard>

      <p className="text-[12px] text-charcoal/55 leading-relaxed">
        Label purchase and manual tracking are implemented in the staff Ops console and `POST /api/ops/shipping/*` routes — open{" "}
        <Link href="/ops/shipping" className="font-semibold text-teal-dark hover:underline">
          /ops/shipping
        </Link>{" "}
        when you need the full queue and forms. This page is a read-mostly governance view with a purchase shortcut on the shipment
        detail screen when a saved Shippo rate is on file.
      </p>
    </div>
  );
}
