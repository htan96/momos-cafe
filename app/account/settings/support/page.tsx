import Link from "next/link";
import CustomerPageHeader from "@/components/customer/CustomerPageHeader";
import CustomerPanel from "@/components/customer/CustomerPanel";

export default function AccountSettingsSupportPage() {
  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center gap-3 text-[12px] font-semibold uppercase tracking-[0.18em] text-teal-dark">
        <Link href="/account/settings" className="hover:underline underline-offset-4">
          ← Settings
        </Link>
      </div>
      <CustomerPageHeader
        eyebrow="Support"
        title="We answer from the pass"
        subtitle="Future tickets and escalations will rest here beside context from your visits — nothing disappears into a void."
        illustrationAccentClassName="bg-teal/18"
      />

      <CustomerPanel title="Open a conversation" eyebrow="Tell us what felt off">
        <label className="block space-y-2">
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-charcoal/55">Topic</span>
          <select
            disabled
            className="w-full rounded-xl border border-cream-dark bg-cream/40 px-4 py-3 text-[14px] text-charcoal/45 outline-none"
            defaultValue=""
          >
            <option value="">Choose a gentle category…</option>
            <option>Order timing</option>
            <option>Catering coordination</option>
            <option>Billing question</option>
          </select>
        </label>
        <label className="mt-4 block space-y-2">
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-charcoal/55">Details</span>
          <textarea
            readOnly
            rows={5}
            placeholder="We’ll mirror the textarea you already know from email — for now, it rests."
            className="w-full rounded-xl border border-cream-dark bg-cream/40 px-4 py-3 text-[14px] text-charcoal/45 outline-none placeholder:text-charcoal/35"
          />
        </label>
        <button
          type="button"
          disabled
          className="mt-5 rounded-xl bg-teal-dark px-5 py-2.5 text-sm font-semibold text-cream opacity-60"
        >
          Send message (soon)
        </button>
      </CustomerPanel>

      <CustomerPanel title="Past care moments" eyebrow="Sample history">
        <ul className="space-y-4">
          {[
            {
              title: "Adjusted catering headcount",
              body: "We reprinted name cards overnight so place settings felt calm.",
              when: "Mar 2026",
            },
            {
              title: "Shipment rescue",
              body: "Carrier reroute — package arrived a day early with a handwritten sorry biscuit.",
              when: "Jan 2026",
            },
          ].map((t) => (
            <li key={t.title} className="rounded-xl border border-cream-dark/80 bg-white/85 px-4 py-4">
              <p className="text-[13px] font-semibold text-charcoal">{t.title}</p>
              <p className="mt-2 text-[13px] text-charcoal/68 leading-relaxed">{t.body}</p>
              <p className="mt-3 text-[11px] uppercase tracking-[0.12em] text-charcoal/45">{t.when}</p>
            </li>
          ))}
        </ul>
      </CustomerPanel>
    </div>
  );
}
