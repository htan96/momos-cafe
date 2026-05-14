import Link from "next/link";
import CustomerPageHeader from "@/components/customer/CustomerPageHeader";
import CustomerPanel from "@/components/customer/CustomerPanel";

function ToggleRow({ label, description }: { label: string; description: string }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4 rounded-xl border border-cream-dark/80 bg-white/80 px-4 py-4">
      <div className="min-w-0">
        <p className="text-[13px] font-semibold text-charcoal">{label}</p>
        <p className="mt-1 text-[13px] text-charcoal/65 leading-relaxed">{description}</p>
      </div>
      <button
        type="button"
        disabled
        aria-disabled="true"
        className="relative h-8 w-14 shrink-0 rounded-full bg-cream-dark/60 p-1"
      >
        <span className="block h-6 w-6 translate-x-1 rounded-full bg-white shadow-sm" />
      </button>
    </div>
  );
}

export default function AccountSettingsNotificationsPage() {
  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center gap-3 text-[12px] font-semibold uppercase tracking-[0.18em] text-teal-dark">
        <Link href="/account/settings" className="hover:underline underline-offset-4">
          ← Settings
        </Link>
      </div>
      <CustomerPageHeader
        eyebrow="Notifications"
        title="Only the knocks you want to hear"
        subtitle="Transactional essentials stay on — the rest is yours to shape as we connect email and SMS rails."
        illustrationAccentClassName="bg-amber-100/50"
      />

      <CustomerPanel title="Channels" eyebrow="Email · SMS">
        <div className="space-y-4">
          <ToggleRow
            label="Order & pickup updates"
            description="The important stuff — confirmations, delays, and ready-for-pickup bells."
          />
          <ToggleRow
            label="Catering concierge"
            description="Thoughtful threads while we plan trays and timelines together."
          />
          <ToggleRow
            label="Rewards & invites (quiet)"
            description="Occasional notes when something lovely is worth your attention."
          />
        </div>
        <p className="mt-4 text-[12px] text-charcoal/50">Toggles are read-only in this preview.</p>
      </CustomerPanel>
    </div>
  );
}
