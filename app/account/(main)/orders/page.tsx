"use client";

import Link from "next/link";
import { useState } from "react";
import CustomerOrderCard from "@/components/customer/CustomerOrderCard";
import CustomerPageHeader from "@/components/customer/CustomerPageHeader";
import { mockCustomerOrders } from "@/lib/customer/mockAccount";

const FILTERS = ["All", "Pickup", "Shipped", "Catering", "History"] as const;

export default function AccountOrdersListPage() {
  const [activeFilter, setActiveFilter] = useState<(typeof FILTERS)[number]>("All");

  return (
    <div className="space-y-10">
      <CustomerPageHeader
        eyebrow="Orders"
        title="Everything you’ve shared with our kitchen"
        subtitle="Filters are a gentle preview — live narrowing lands when this list mirrors your account history."
        illustrationAccentClassName="bg-teal/25"
      />

      <div className="flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            aria-pressed={activeFilter === f}
            onClick={() => setActiveFilter(f)}
            className={`rounded-full border px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] transition-colors ${
              activeFilter === f
                ? "border-teal-dark/40 bg-teal/12 text-teal-dark"
                : "border-cream-dark/80 bg-white/70 text-charcoal/55 hover:border-charcoal/15 hover:bg-cream/40"
            }`}
          >
            {f}
          </button>
        ))}
        <span className="text-[11px] text-charcoal/45">Preview · does not filter rows yet</span>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {mockCustomerOrders.map((o) => (
          <CustomerOrderCard
            key={o.id}
            orderNumber={o.orderNumber}
            placedAt={o.placedAt}
            summary={o.summary}
            totalLabel={o.totalLabel}
            status={o.status}
            etaReassurance={o.etaReassurance}
            pipelineBadges={o.pipelineBadges}
          />
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-4 border-t border-cream-dark/80 pt-8 text-[14px]">
        <Link href="/account" className="font-semibold text-teal-dark underline-offset-4 hover:underline">
          ← Back to dashboard
        </Link>
        <span className="text-charcoal/30" aria-hidden>
          |
        </span>
        <span className="text-charcoal/65">
          When you&apos;re signed in, open any live order from the dashboard — each card links to timing, tracking, and
          the timeline.
        </span>
      </div>
    </div>
  );
}
