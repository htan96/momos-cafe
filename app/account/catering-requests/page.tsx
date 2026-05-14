import Link from "next/link";
import CustomerPageHeader from "@/components/customer/CustomerPageHeader";
import CustomerPanel from "@/components/customer/CustomerPanel";
import CustomerStatusChip from "@/components/customer/CustomerStatusChip";
import { mockCateringPipeline } from "@/lib/customer/mockAccount";

export default function AccountCateringRequestsPage() {
  return (
    <div className="space-y-10">
      <CustomerPageHeader
        eyebrow="Concierge"
        title="Catering requests, minded with care"
        subtitle="Every celebration starts as a whisper — here’s how our team shepherds yours from first note to the last tray."
        illustrationAccentClassName="bg-violet-200/50"
      />

      <div className="grid gap-5 lg:grid-cols-3">
        {mockCateringPipeline.map((col) => (
          <CustomerPanel
            key={col.stage}
            title={col.stage}
            eyebrow="Pipeline preview"
            paddingClassName="p-5 md:p-6"
            className="h-full"
          >
            <div className="-mt-2 mb-4">
              <CustomerStatusChip
                variant={col.tone === "done" ? "delivered" : col.tone === "current" ? "preparing" : "scheduled"}
                text={col.tone === "done" ? "Wrapped" : col.tone === "current" ? "In motion" : "Queued"}
              />
            </div>
            <div className="space-y-4">
              {col.cards.map((c) => (
                <article key={c.title} className="rounded-xl border border-cream-dark/80 bg-cream/35 p-4">
                  <p className="text-[13px] font-semibold text-charcoal">{c.title}</p>
                  <p className="mt-1 text-[11px] uppercase tracking-[0.14em] text-charcoal/45">{c.meta}</p>
                  <p className="mt-3 text-[13px] text-charcoal/70 leading-relaxed">{c.body}</p>
                </article>
              ))}
            </div>
          </CustomerPanel>
        ))}
      </div>

      <CustomerPanel title="Start something new" eyebrow="Fresh inquiry">
        <p className="text-[14px] text-charcoal/68 leading-relaxed">
          Tell us about the room, the headcount, and any quiet dietary wishes — we answer from the pass, not a script.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/catering"
            className="inline-flex rounded-xl bg-teal-dark px-5 py-2.5 text-sm font-semibold text-cream transition-opacity hover:opacity-95"
          >
            Begin a catering note →
          </Link>
          <Link
            href="/account"
            className="inline-flex rounded-xl border border-cream-dark px-5 py-2.5 text-sm font-semibold text-charcoal/80 transition-colors hover:border-teal/30"
          >
            Back to dashboard
          </Link>
        </div>
      </CustomerPanel>
    </div>
  );
}
