import Link from "next/link";
import { redirect } from "next/navigation";
import AccountOrderCard from "@/components/account/AccountOrderCard";
import SignOutButton from "@/app/account/SignOutButton";
import { getCustomerSession } from "@/lib/auth/getCustomerSession";
import {
  loadCateringByEmail,
  loadCustomerCommerceOrders,
  mapToDashboardBrief,
} from "@/lib/account/dashboardData";
import {
  formatOrderInstant,
  groupStatusHeadline,
  isDashboardActiveOrder,
  orderDisplayNumber,
  pipelineLabel,
} from "@/lib/account/orderPresentation";

export default async function AccountDashboardPage() {
  const session = await getCustomerSession();
  if (!session) redirect("/login?next=/account");

  const [ordersRaw, inquiries] = await Promise.all([
    loadCustomerCommerceOrders(session.sub),
    loadCateringByEmail(session.email),
  ]);

  const active = ordersRaw.filter((row) =>
    isDashboardActiveOrder(mapToDashboardBrief(row))
  );
  const past = ordersRaw.filter(
    (row) => !isDashboardActiveOrder(mapToDashboardBrief(row))
  );

  return (
    <div className="max-w-[880px] mx-auto px-5 md:px-8 lg:px-10 py-12 md:py-16 lg:pb-24">
      <nav className="flex flex-wrap gap-2 mb-10 text-[11px] font-semibold uppercase tracking-[0.2em]">
        <a href="#active" className="text-teal-dark hover:underline underline-offset-4">
          Active orders
        </a>
        <span className="text-charcoal/25" aria-hidden>
          /
        </span>
        <a href="#past" className="text-teal-dark hover:underline underline-offset-4">
          Past orders
        </a>
        <span className="text-charcoal/25" aria-hidden>
          /
        </span>
        <a href="#catering" className="text-teal-dark hover:underline underline-offset-4">
          Catering inquiries
        </a>
        <span className="text-charcoal/25" aria-hidden>
          /
        </span>
        <a href="#details" className="text-teal-dark hover:underline underline-offset-4">
          Details
        </a>
      </nav>

      <header className="mb-14">
        <p className="text-[11px] uppercase tracking-[0.28em] text-teal-dark font-semibold">Your table with us</p>
        <h1 className="mt-2 font-display text-4xl md:text-[2.85rem] text-charcoal tracking-tight leading-[1.05]">
          Welcome home, {session.email.split("@")[0]}
        </h1>
        <p className="mt-3 text-[15px] text-charcoal/75 max-w-xl leading-relaxed">
          Café pickup, mercantile, and parcels — surfaced as one warm experience. Peek in anytime for timelines and
          tracking.
        </p>
      </header>

      <section id="active" className="scroll-mt-28 mb-16">
        <div className="flex items-end justify-between gap-4 mb-5">
          <h2 className="font-display text-2xl text-charcoal tracking-tight">Active orders</h2>
          <Link
            href="/order"
            className="hidden sm:inline text-[13px] font-semibold text-red hover:text-red-dark transition-colors"
          >
            Order café pickup
          </Link>
        </div>
        {active.length === 0 ? (
          <div className="rounded-2xl border border-cream-dark bg-cream/35 px-6 py-12 text-center">
            <p className="text-[15px] text-charcoal/70 leading-relaxed max-w-md mx-auto">
              No open orders tied to your account yet. Checkout while signed in — we&apos;ll attach each visit here
              automatically.
            </p>
            <Link
              href="/shop"
              className="inline-flex mt-6 rounded-xl bg-teal-dark text-cream px-5 py-2.5 text-sm font-semibold hover:opacity-95"
            >
              Browse mercantile
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-5 md:gap-6">
            {active.map((row) => (
              <AccountOrderCard key={row.id} row={row} />
            ))}
          </div>
        )}
      </section>

      {(active.some((row) =>
        row.fulfillmentGroups.some(
          (g) => "KITCHEN" === g.pipeline.toUpperCase() && g.status !== "completed"
        )
      ) ||
        active.some((row) => row.fulfillmentGroups.some((g) => g.shipments.length > 0))) && (
        <section className="rounded-2xl border border-teal/20 bg-teal/5 px-6 py-7 mb-16">
          <h3 className="text-[13px] font-semibold uppercase tracking-[0.2em] text-teal-dark">At-a-glance</h3>
          <ul className="mt-4 space-y-3 text-[14px] text-charcoal/80 leading-relaxed">
            {active.flatMap((row) =>
              row.fulfillmentGroups.map((g) => (
                <li key={`${row.id}-${g.id}`}>
                  <span className="font-semibold text-charcoal">#{orderDisplayNumber(row.id)} · </span>
                  {pipelineLabel(g.pipeline)} · {groupStatusHeadline(g.pipeline, g.status)}
                  {g.estimatedReadyAt && g.pipeline.toUpperCase() === "KITCHEN"
                    ? ` · ~${formatOrderInstant(g.estimatedReadyAt)}`
                    : ""}
                </li>
              ))
            )}
          </ul>
        </section>
      )}

      <section id="past" className="scroll-mt-28 mb-16">
        <h2 className="font-display text-2xl text-charcoal tracking-tight mb-5">Past orders</h2>
        {past.length === 0 ? (
          <p className="text-sm text-charcoal/55 italic">Past visits will linger here.</p>
        ) : (
          <div className="flex flex-col gap-5 md:gap-6 opacity-92">
            {past.map((row) => (
              <AccountOrderCard key={row.id} row={row} />
            ))}
          </div>
        )}
      </section>

      <section id="catering" className="scroll-mt-28 mb-16">
        <h2 className="font-display text-2xl text-charcoal tracking-tight mb-2">Catering inquiries</h2>
        <p className="text-[13px] text-charcoal/60 mb-5 max-w-lg leading-relaxed">
          Events you&apos;ve started with Momo&apos;s — our team replies directly from Vallejo warmth.
        </p>
        {inquiries.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-cream-dark bg-white px-6 py-10">
            <p className="text-sm text-charcoal/55 mb-5">Nothing yet matching {session.email}.</p>
            <Link href="/catering" className="font-semibold text-teal-dark text-sm hover:underline underline-offset-2">
              Explore catering →
            </Link>
          </div>
        ) : (
          <ul className="rounded-2xl border border-gold/30 bg-white divide-y divide-cream-dark overflow-hidden shadow-sm">
            {inquiries.map((q) => (
              <li key={q.id} className="px-5 py-4 flex flex-wrap justify-between gap-3 items-center">
                <div>
                  <p className="font-medium text-charcoal">{q.eventType ?? "Celebration inquiry"}</p>
                  <p className="text-[12px] text-charcoal/55 mt-0.5">
                    {formatOrderInstant(q.createdAt)}
                    {q.guestCount ? ` · ${q.guestCount} guests` : ""}
                  </p>
                </div>
                <span className="text-[11px] font-semibold uppercase tracking-wide px-3 py-1 rounded-full bg-cream-dark/40 text-teal-dark">
                  {q.eventDate}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section id="details" className="scroll-mt-28 rounded-2xl border border-charcoal/10 bg-white shadow-sm px-6 py-8">
        <h2 className="font-display text-xl text-charcoal mb-6">Account details</h2>
        <dl className="grid gap-5 sm:grid-cols-2 text-[14px]">
          <div>
            <dt className="text-[10px] font-semibold uppercase tracking-wider text-teal-dark">Email</dt>
            <dd className="mt-1 text-charcoal">{session.email}</dd>
          </div>
          <div>
            <dt className="text-[10px] font-semibold uppercase tracking-wider text-teal-dark">
              Stored payment methods
            </dt>
            <dd className="mt-1 text-charcoal/60">Hosted securely via Square checkout — saved cards arriving soon.</dd>
          </div>
          <div>
            <dt className="text-[10px] font-semibold uppercase tracking-wider text-teal-dark">
              Loyalty &amp; preferences
            </dt>
            <dd className="mt-1 text-charcoal/60">We&apos;ll weave these in thoughtfully — hospitality first.</dd>
          </div>
        </dl>
        <div className="mt-10 pt-6 border-t border-cream-dark">
          <SignOutButton />
        </div>
      </section>
    </div>
  );
}
