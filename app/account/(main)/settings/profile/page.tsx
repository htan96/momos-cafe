import Link from "next/link";
import CustomerPageHeader from "@/components/customer/CustomerPageHeader";
import CustomerPanel from "@/components/customer/CustomerPanel";

export default function AccountSettingsProfilePage() {
  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center gap-3 text-[12px] font-semibold uppercase tracking-[0.18em] text-teal-dark">
        <Link href="/account/settings" className="hover:underline underline-offset-4">
          ← Settings
        </Link>
      </div>
      <CustomerPageHeader
        eyebrow="Profile"
        title="How we greet you"
        subtitle="These fields will mirror your signed-in identity — today they’re here so you can feel the layout."
        illustrationAccentClassName="bg-teal/15"
      />

      <CustomerPanel title="Basics" eyebrow="Display">
        <div className="grid gap-5 md:grid-cols-2">
          <label className="block space-y-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-charcoal/55">Preferred name</span>
            <input
              readOnly
              defaultValue="Alex"
              className="w-full rounded-xl border border-cream-dark bg-cream/40 px-4 py-3 text-[14px] text-charcoal/55 outline-none"
            />
          </label>
          <label className="block space-y-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-charcoal/55">Phone (optional)</span>
            <input
              readOnly
              placeholder="(555) 000-0000"
              className="w-full rounded-xl border border-cream-dark bg-cream/40 px-4 py-3 text-[14px] text-charcoal/45 outline-none placeholder:text-charcoal/35"
            />
          </label>
        </div>
        <p className="mt-4 text-[12px] text-charcoal/50">Read-only preview · wiring lands with Cognito profile sync.</p>
      </CustomerPanel>

      <CustomerPanel title="Kitchen notes" eyebrow="Gentle flags">
        <label className="block space-y-2">
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-charcoal/55">
            Anything we should double-check?
          </span>
          <textarea
            readOnly
            rows={4}
            defaultValue="Vegetarian dumplings only; sesame okay."
            className="w-full rounded-xl border border-cream-dark bg-cream/40 px-4 py-3 text-[14px] text-charcoal/55 outline-none"
          />
        </label>
      </CustomerPanel>
    </div>
  );
}
