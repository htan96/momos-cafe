import Link from "next/link";
import type { CafeOrderStatus } from "@/types/order";
import { notFound } from "next/navigation";
import GovPageHeader from "@/components/governance/GovPageHeader";
import OperationalCard from "@/components/governance/OperationalCard";
import StatusPill from "@/components/governance/StatusPill";
import { OPS_ENTITY_UUID_RE } from "@/lib/operations/operationalContextLinks";
import { readCafeOrderCustomerEmail } from "@/lib/orders/cafeOrderCustomerJson";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function SuperAdminLegacyCafeOrderDetailPage(props: {
  params: Promise<{ cafeOrderId: string }>;
}) {
  const { cafeOrderId } = await props.params;
  const id = cafeOrderId.trim();
  if (!OPS_ENTITY_UUID_RE.test(id)) notFound();

  const row = await prisma.cafeOrder.findUnique({ where: { id } });
  if (!row) notFound();

  const email = readCafeOrderCustomerEmail(row.customer);

  let customerId: string | null = null;
  if (email) {
    const hit = await prisma.customer.findUnique({ where: { email }, select: { id: true } });
    customerId = hit?.id ?? null;
  }

  return (
    <div className="space-y-8">
      <GovPageHeader
        eyebrow="Legacy · Detail"
        title="CafeOrder read"
        subtitle="Single `cafe_orders` row snapshot — linkage to unified `customers` occurs only via email heuristic below."
        actions={
          <>
            <Link
              href="/super-admin/order-operations/legacy"
              className="rounded-lg border border-cream-dark/60 bg-white px-3 py-1.5 text-[12px] font-semibold text-charcoal/80 shadow-sm hover:bg-cream-mid/40"
            >
              Legacy list
            </Link>
            <Link
              href="/super-admin/order-operations"
              className="rounded-lg border border-cream-dark/60 bg-white px-3 py-1.5 text-[12px] font-semibold text-charcoal/80 shadow-sm hover:bg-cream-mid/40"
            >
              Unified order operations
            </Link>
          </>
        }
      />

      <OperationalCard title="Core fields">
        <dl className="grid gap-y-3 text-[13px] sm:grid-cols-[minmax(0,220px)_1fr] gap-x-8">
          <dt className="text-charcoal/50 font-semibold">Status</dt>
          <dd>
            <StatusPill variant="neutral">{row.status as CafeOrderStatus}</StatusPill>
          </dd>
          <dt className="text-charcoal/50 font-semibold">Paid</dt>
          <dd>{row.isPaid ? `Yes · Square payment ${row.squarePaymentId ?? "?"}` : "No"}</dd>
          <dt className="text-charcoal/50 font-semibold">Totals</dt>
          <dd>${(row.totalCents / 100).toFixed(2)}</dd>
          <dt className="text-charcoal/50 font-semibold">Fulfillment</dt>
          <dd>{row.fulfillmentType}</dd>
          <dt className="text-charcoal/50 font-semibold">Square order id</dt>
          <dd className="font-mono break-all">{row.squareOrderId ?? "—"}</dd>
          <dt className="text-charcoal/50 font-semibold">Created</dt>
          <dd className="text-charcoal/80">{row.createdAt.toISOString()}</dd>
          <dt className="text-charcoal/50 font-semibold">Scheduled for</dt>
          <dd>{row.scheduledFor ? row.scheduledFor.toISOString() : "—"}</dd>
        </dl>
      </OperationalCard>

      <OperationalCard title="Customer linkage (guest JSON → optional unified row)">
        {email ?
          <>
            <p className="text-[13px] text-charcoal/75">{email}</p>
            {customerId ?
              <Link
                href={`/super-admin/users/customers/${customerId}`}
                className="mt-2 inline-flex text-[13px] font-semibold text-teal-dark underline-offset-2 hover:underline break-all"
              >
                Customer dossier · {customerId.slice(0, 8)}…
              </Link>
            :
              <p className="mt-2 text-[12px] text-charcoal/60">
                No `customers.email` collision — dossier linkage requires the diner to reuse the identical email locally.
              </p>
            }
          </>
        : <p className="text-[13px] text-charcoal/60">Stored guest JSON lacked a plausible email hint.</p>}
      </OperationalCard>

      <OperationalCard title="Raw JSON payloads">
        <div className="grid gap-4 md:grid-cols-2">
          <section>
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-charcoal/45 mb-2">cart</h3>
            <pre className="rounded-lg bg-charcoal/[0.04] px-3 py-2 overflow-x-auto text-[11px] font-mono text-charcoal/80 max-h-[24rem]">
              {JSON.stringify(row.cart ?? {}, null, 2)}
            </pre>
          </section>
          <section>
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-charcoal/45 mb-2">customer</h3>
            <pre className="rounded-lg bg-charcoal/[0.04] px-3 py-2 overflow-x-auto text-[11px] font-mono text-charcoal/80 max-h-[24rem]">
              {JSON.stringify(row.customer ?? {}, null, 2)}
            </pre>
          </section>
        </div>
        {row.notes?.trim().length ?
          <p className="mt-4 text-[12px]">
            Guest notes · <span className="font-mono text-charcoal/80">{row.notes.trim()}</span>
          </p>
        : null}
      </OperationalCard>
    </div>
  );
}
