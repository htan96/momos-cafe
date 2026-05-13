import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import CustomerOrderTimeline from "@/components/account/CustomerOrderTimeline";
import OrderFulfillmentTree from "@/components/account/OrderFulfillmentTree";
import { formatMoney } from "@/lib/commerce/fulfillmentPreview";
import { getCustomerSession } from "@/lib/auth/getCustomerSession";
import { loadCustomerCommerceOrder, mapToDashboardBrief } from "@/lib/account/dashboardData";
import {
  buildCustomerOrderTimeline,
  orderDisplayNumber,
  pipelineLabel,
} from "@/lib/account/orderPresentation";

type PageProps = { params: Promise<{ orderId: string }> };

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

  return (
    <>
      <Link
        href="/account"
        className="text-[12px] font-semibold uppercase tracking-[0.2em] text-teal-dark hover:underline underline-offset-[6px]"
      >
        ← Back to account
      </Link>

      <header className="mt-6 mb-10">
        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-teal-dark">
          Order #{num}
        </p>
        <h1 className="mt-2 font-display text-3xl md:text-[clamp(34px,4vw,44px)] text-charcoal tracking-tight">
          Here&apos;s where things stand
        </h1>
        <p className="mt-3 text-[15px] text-charcoal/70 max-w-2xl leading-relaxed">
          Café pickup, shop treats, and anything headed out by mail — one simple page with timing and tracking when
          it&apos;s available.
        </p>
        <p className="mt-6 font-display text-3xl text-charcoal">{formatMoney(row.totalCents / 100)}</p>
        <p className="text-[12px] uppercase tracking-[0.2em] text-charcoal/45 mt-2">
          Updated {brief.updatedAt.toLocaleString()}
        </p>
      </header>

      <div className={`grid gap-10 ${row.items.length > 0 ? "lg:grid-cols-[1fr,minmax(0,280px)]" : ""}`}>
        <div className="flex flex-col gap-10">
          <OrderFulfillmentTree fulfillmentGroups={row.fulfillmentGroups} />

          <section className="rounded-2xl border border-cream-dark bg-white p-6 md:p-7 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-teal-dark mb-6">Timeline</p>
            <CustomerOrderTimeline events={timeline} />
          </section>
        </div>

        {row.items.length > 0 ? (
          <aside className="rounded-2xl border border-charcoal/10 bg-cream/40 p-5 h-fit lg:sticky lg:top-24">
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-teal-dark">Items</p>
            <ul className="mt-4 space-y-3 text-[13px] text-charcoal/85">
              {row.items.map((it) => (
                <li key={it.id} className="flex justify-between gap-3">
                  <span className="min-w-0">
                    <span className="font-semibold">{it.quantity}×</span> {it.title}
                  </span>
                  <span className="text-charcoal/50 shrink-0 text-[11px] uppercase tracking-wide">
                    {pipelineLabel(it.fulfillmentPipeline)}
                  </span>
                </li>
              ))}
            </ul>
          </aside>
        ) : null}
      </div>
    </>
  );
}
