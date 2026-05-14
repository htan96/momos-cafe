import Link from "next/link";
import { redirect } from "next/navigation";
import AccountOrderCard from "@/components/account/AccountOrderCard";
import CommerceOrderCustomerCard from "@/components/customer/CommerceOrderCustomerCard";
import CommunicationRow from "@/components/customer/CommunicationRow";
import CustomerOrderCard from "@/components/customer/CustomerOrderCard";
import CustomerPageHeader from "@/components/customer/CustomerPageHeader";
import CustomerPanel from "@/components/customer/CustomerPanel";
import CustomerShipmentCard from "@/components/customer/CustomerShipmentCard";
import RewardsSummaryCard from "@/components/customer/RewardsSummaryCard";
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
import { mockCommunications, mockShipments } from "@/lib/customer/mockAccount";
import type { CustomerTimelineStep } from "@/components/customer/CustomerTimeline";

function teaserTimeline(
  steps: { label: string; time: string }[],
  opts?: { delayed?: boolean }
): CustomerTimelineStep[] {
  const delayed = opts?.delayed ?? false;
  return steps.map((s, i) => {
    const last = i === steps.length - 1;
    return {
      id: `teaser-${i}`,
      title: s.label,
      meta: s.time,
      tone: last ? (delayed ? "current" : "current") : "done",
    };
  });
}

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

  const peek = ordersRaw.slice(0, 3);
  const show = mockShipments[0];

  return (
    <>
      <nav className="mb-8 flex flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-[0.2em]">
        <a href="#glance" className="text-teal-dark underline-offset-4 hover:underline">
          Overview
        </a>
        <span className="text-charcoal/25" aria-hidden>
          /
        </span>
        <a href="#active" className="text-teal-dark underline-offset-4 hover:underline">
          Active
        </a>
        <span className="text-charcoal/25" aria-hidden>
          /
        </span>
        <a href="#past" className="text-teal-dark underline-offset-4 hover:underline">
          Past
        </a>
        <span className="text-charcoal/25" aria-hidden>
          /
        </span>
        <a href="#catering" className="text-teal-dark underline-offset-4 hover:underline">
          Catering
        </a>
      </nav>

      <CustomerPageHeader
        eyebrow="Your table with us"
        title={`Welcome back, ${session.email.split("@")[0]}`}
        subtitle={
          <>
            Pickup, shop picks, and mailed gifts — gathered here so you never have to hunt for a receipt.{" "}
            <span className="hidden sm:inline">We surface the warm details first; paperwork stays one tap away.</span>
          </>
        }
        illustrationAccentClassName="bg-gold/35"
      />

      <section id="glance" className="scroll-mt-28 mb-16 space-y-5">
        <div>
          <h2 className="font-display text-2xl text-charcoal tracking-tight">Recent visits, at a glance</h2>
          <p className="mt-2 max-w-2xl text-[14px] text-charcoal/68 leading-relaxed">
            A gentle grid of what&apos;s moving — open anything for the full story.
          </p>
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          {peek.map((row) => (
            <CommerceOrderCustomerCard key={row.id} row={row} />
          ))}
          <CustomerOrderCard
            href="/shop"
            orderNumber="soon"
            placedAt="When you’re ready"
            summary="Reserve something wonderful — your cart remembers while you browse signed in."
            status="scheduled"
            etaReassurance="No rush. We’ll tuck new visits here the moment you check out."
          />
        </div>
      </section>

      <CustomerPanel id="shortcuts" title="Your shortcuts" eyebrow="Little paths" className="mb-16 scroll-mt-28">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-cream-dark/80 bg-cream/35 p-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-teal-dark">Recently ordered</p>
            <p className="mt-2 text-[14px] text-charcoal/75 leading-relaxed">
              {past.length > 0
                ? `You have ${past.length} past visit${past.length === 1 ? "" : "s"} — jump down whenever you need a reminder.`
                : "Coming soon — we’ll tuck quick links to your usual orders right here."}
            </p>
            {past.length > 0 ? (
              <a
                href="#past"
                className="mt-4 inline-flex text-[13px] font-semibold text-red transition-colors hover:text-red-dark"
              >
                View past orders
              </a>
            ) : (
              <Link
                href="/order"
                className="mt-4 inline-flex text-[13px] font-semibold text-red transition-colors hover:text-red-dark"
              >
                Browse the menu →
              </Link>
            )}
          </div>
          <div className="rounded-xl border border-cream-dark/80 bg-cream/35 p-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-teal-dark">Saved for later</p>
            <p className="mt-2 text-[14px] text-charcoal/75 leading-relaxed">
              Dishes you set aside in your bag while ordering stay there until you’re ready. We’ll mirror them here when
              we can.
            </p>
            <Link
              href="/order"
              className="mt-4 inline-flex text-[13px] font-semibold text-teal-dark underline-offset-2 hover:underline"
            >
              Open order pickup →
            </Link>
          </div>
          <div className="rounded-xl border border-dashed border-gold/45 bg-white/60 p-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-teal-dark">Favorites</p>
            <p className="mt-2 text-[14px] text-charcoal/65 leading-relaxed">
              A little velvet-rope list for the dishes you love — quietly in the works.
            </p>
            <p className="mt-4 text-[12px] font-semibold uppercase tracking-[0.14em] text-charcoal/45">Coming soon</p>
          </div>
        </div>
      </CustomerPanel>

      <section id="active" className="scroll-mt-28 mb-16">
        <div className="mb-5 flex items-end justify-between gap-4">
          <h2 className="font-display text-2xl text-charcoal tracking-tight">Active orders</h2>
          <Link
            href="/order"
            className="hidden text-[13px] font-semibold text-red transition-colors hover:text-red-dark sm:inline"
          >
            Order café pickup
          </Link>
        </div>
        {active.length === 0 ? (
          <div className="rounded-2xl border border-cream-dark bg-cream/35 px-6 py-12 text-center">
            <p className="mx-auto max-w-md text-[15px] text-charcoal/70 leading-relaxed">
              Nothing in the works right now. Order while signed in — each visit shows up here automatically.
            </p>
            <Link
              href="/shop"
              className="mt-6 inline-flex rounded-xl bg-teal-dark px-5 py-2.5 text-sm font-semibold text-cream hover:opacity-95"
            >
              Browse the shop
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
        <section className="mb-16 rounded-2xl border border-teal/20 bg-teal/5 px-6 py-7">
          <h3 className="text-[13px] font-semibold uppercase tracking-[0.2em] text-teal-dark">Right now</h3>
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

      <div className="mb-16 grid gap-8 lg:grid-cols-[1fr,340px]">
        <CustomerShipmentCard
          orderRef={show.orderRef}
          carrier={show.carrier}
          destination={show.destination}
          trackingMasked={show.trackingMasked}
          status={show.status}
          delayed={show.delayed}
          timeline={teaserTimeline(show.timeline.slice(0, 3), { delayed: show.delayed })}
        />
        <RewardsSummaryCard
          tierLabel="Host circle"
          tagline="Small celebrations add up — we remember how you like the tray lined."
          progressLabel="Path to signature perks"
          progressPercent={62}
          actionHref="/account/rewards"
          actionLabel="Peek at rewards →"
        />
      </div>

      <CustomerPanel
        title="Notes from the house"
        eyebrow="Quiet updates"
        className="mb-16"
        paddingClassName="p-6 md:p-7"
      >
        <p className="-mt-2 max-w-2xl text-[14px] text-charcoal/65 leading-relaxed">
          Helpful nudges we’d slip beside your plate — nothing noisy, just clarity.
        </p>
        <div className="mt-6 space-y-4">
          {mockCommunications.map((c) => (
            <CommunicationRow key={c.id} subject={c.subject} preview={c.preview} when={c.when} channel={c.channel} />
          ))}
        </div>
      </CustomerPanel>

      <section
        className="mb-16 rounded-2xl border border-charcoal/[0.06] bg-white/85 px-6 py-6 md:px-8"
        aria-label="Trust and security"
      >
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-teal-dark">Your peace of mind</p>
        <p className="mt-2 font-display text-lg text-charcoal tracking-tight">Signed-in sessions · careful defaults</p>
        <ul className="mt-4 flex flex-col gap-3 text-[13px] text-charcoal/68 sm:flex-row sm:flex-wrap sm:gap-x-8">
          <li className="flex gap-2">
            <span aria-hidden>◇</span>
            <span>Payments tokenized at checkout — card data never rests on our stoves.</span>
          </li>
          <li className="flex gap-2">
            <span aria-hidden>◇</span>
            <span>Sign out anytime from the top right; we’ll honor it immediately.</span>
          </li>
          <li className="flex gap-2">
            <span aria-hidden>◇</span>
            <span>Orders and catering threads stay tied to this email for easy rediscovery.</span>
          </li>
        </ul>
      </section>

      <section id="past" className="scroll-mt-28 mb-16">
        <h2 className="mb-5 font-display text-2xl text-charcoal tracking-tight">Past orders</h2>
        {past.length === 0 ? (
          <p className="max-w-md text-sm italic leading-relaxed text-charcoal/55">
            Once you&apos;ve enjoyed a few runs with us, they&apos;ll rest here for reference.
          </p>
        ) : (
          <div className="flex flex-col gap-5 opacity-92 md:gap-6">
            {past.map((row) => (
              <AccountOrderCard key={row.id} row={row} />
            ))}
          </div>
        )}
      </section>

      <section id="catering" className="scroll-mt-28 mb-16">
        <h2 className="font-display text-2xl text-charcoal tracking-tight mb-2">Catering inquiries</h2>
        <p className="mb-5 max-w-lg text-[13px] text-charcoal/60 leading-relaxed">
          Events you&apos;ve started with Momo&apos;s — our team replies straight from the kitchen.
        </p>
        {inquiries.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-cream-dark bg-white px-6 py-10">
            <p className="mb-5 text-sm text-charcoal/55">No notes on file for {session.email} yet.</p>
            <Link href="/catering" className="text-sm font-semibold text-teal-dark underline-offset-2 hover:underline">
              Explore catering →
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-cream-dark overflow-hidden rounded-2xl border border-gold/30 bg-white shadow-sm">
            {inquiries.map((q) => (
              <li key={q.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                <div>
                  <p className="font-medium text-charcoal">{q.eventType ?? "Celebration inquiry"}</p>
                  <p className="mt-0.5 text-[12px] text-charcoal/55">
                    {formatOrderInstant(q.createdAt)}
                    {q.guestCount ? ` · ${q.guestCount} guests` : ""}
                  </p>
                </div>
                <span className="rounded-full bg-cream-dark/40 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-teal-dark">
                  {q.eventDate}
                </span>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-6 text-[13px] text-charcoal/55">
          Prefer the concierge board?{" "}
          <Link href="/account/catering-requests" className="font-semibold text-teal-dark underline-offset-2 hover:underline">
            Open catering requests
          </Link>
          .
        </p>
      </section>

      <CustomerPanel title="Account details" eyebrow="The essentials" id="details">
        <dl className="grid gap-5 text-[14px] sm:grid-cols-2">
          <div>
            <dt className="text-[10px] font-semibold uppercase tracking-wider text-teal-dark">Email</dt>
            <dd className="mt-1 text-charcoal">{session.email}</dd>
          </div>
          <div>
            <dt className="text-[10px] font-semibold uppercase tracking-wider text-teal-dark">
              Stored payment methods
            </dt>
            <dd className="mt-1 text-charcoal/60">
              Cards stay with our secure checkout partner — saved cards are on the wishlist.
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-[10px] font-semibold uppercase tracking-wider text-teal-dark">
              Loyalty &amp; preferences
            </dt>
            <dd className="mt-1 text-charcoal/60">
              Little perks you pick up over time — we&apos;ll add them gently.
            </dd>
          </div>
        </dl>
      </CustomerPanel>
    </>
  );
}
