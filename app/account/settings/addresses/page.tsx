import Link from "next/link";
import CustomerPageHeader from "@/components/customer/CustomerPageHeader";
import CustomerPanel from "@/components/customer/CustomerPanel";

export default function AccountSettingsAddressesPage() {
  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center gap-3 text-[12px] font-semibold uppercase tracking-[0.18em] text-teal-dark">
        <Link href="/account/settings" className="hover:underline underline-offset-4">
          ← Settings
        </Link>
      </div>
      <CustomerPageHeader
        eyebrow="Addresses"
        title="Places we’re welcome to meet you"
        subtitle="Saved shipping lanes and event drop-offs — validated once, reused with confidence."
        illustrationAccentClassName="bg-gold/25"
      />

      <CustomerPanel title="Home & gifts" eyebrow="Retail shipments">
        <div className="space-y-4 rounded-xl border border-dashed border-gold/35 bg-white/70 p-5">
          <p className="text-[13px] font-semibold text-charcoal">123 Laurel Lane · Seattle, WA</p>
          <p className="text-[13px] text-charcoal/60">Default · leave at side door</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled className="rounded-lg border border-cream-dark px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-charcoal/45">
              Edit (soon)
            </button>
            <button type="button" disabled className="rounded-lg border border-cream-dark px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-charcoal/45">
              Remove (soon)
            </button>
          </div>
        </div>
        <button
          type="button"
          disabled
          className="mt-4 w-full rounded-xl border border-cream-dark py-3 text-[12px] font-semibold uppercase tracking-[0.1em] text-charcoal/45 sm:w-auto sm:px-6"
        >
          Add address (soon)
        </button>
      </CustomerPanel>

      <CustomerPanel title="Catering & events" eyebrow="Concierge destinations">
        <p className="text-[14px] text-charcoal/65 leading-relaxed">
          Loft studios, backyard tents, offices with loading docks — we’ll store the nuance alongside your guest counts.
        </p>
        <textarea
          readOnly
          rows={3}
          defaultValue="Pioneer Square studio — freight elevator, call box 14."
          className="mt-4 w-full rounded-xl border border-cream-dark bg-cream/40 px-4 py-3 text-[14px] text-charcoal/55 outline-none"
        />
      </CustomerPanel>
    </div>
  );
}
