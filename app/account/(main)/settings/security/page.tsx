import Link from "next/link";
import CustomerPageHeader from "@/components/customer/CustomerPageHeader";
import CustomerPanel from "@/components/customer/CustomerPanel";

export default function AccountSettingsSecurityPage() {
  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center gap-3 text-[12px] font-semibold uppercase tracking-[0.18em] text-teal-dark">
        <Link href="/account/settings" className="hover:underline underline-offset-4">
          ← Settings
        </Link>
      </div>
      <CustomerPageHeader
        eyebrow="Security"
        title="Locks on the guesthouse door"
        subtitle="Passwords, MFA, and active browsers — presented plainly, without alarm."
        illustrationAccentClassName="bg-red/10"
      />

      <CustomerPanel title="Sign-in" eyebrow="Password · MFA">
        <div className="space-y-3">
          <button
            type="button"
            disabled
            className="w-full rounded-xl border border-cream-dark bg-white px-4 py-3 text-left text-[13px] font-semibold text-charcoal/45 sm:w-auto"
          >
            Change password (soon)
          </button>
          <button
            type="button"
            disabled
            className="w-full rounded-xl border border-cream-dark bg-white px-4 py-3 text-left text-[13px] font-semibold text-charcoal/45 sm:w-auto"
          >
            Add MFA device (soon)
          </button>
        </div>
      </CustomerPanel>

      <CustomerPanel title="Sessions" eyebrow="Where you’re signed in">
        <ul className="divide-y divide-cream-dark/80 rounded-xl border border-cream-dark/70 bg-cream/30">
          {[
            { label: "Chrome on Windows · Bellevue", when: "Active now" },
            { label: "Safari on iPhone", when: "Last week" },
          ].map((s) => (
            <li key={s.label} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-[13px]">
              <span className="text-charcoal/75">{s.label}</span>
              <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-charcoal/45">{s.when}</span>
            </li>
          ))}
        </ul>
        <button
          type="button"
          disabled
          className="mt-4 rounded-xl border border-cream-dark px-4 py-3 text-[12px] font-semibold uppercase tracking-[0.1em] text-charcoal/45"
        >
          Sign out other sessions (soon)
        </button>
      </CustomerPanel>
    </div>
  );
}
