import CustomerPageHeader from "@/components/customer/CustomerPageHeader";
import CustomerPanel from "@/components/customer/CustomerPanel";
import RewardsSummaryCard from "@/components/customer/RewardsSummaryCard";
import { mockRewardsActivity } from "@/lib/customer/mockAccount";

export default function AccountRewardsPage() {
  return (
    <div className="space-y-10">
      <CustomerPageHeader
        eyebrow="Hospitality"
        title="Rewards that feel like a thank-you note"
        subtitle="No ticker-tape — just thoughtful touches that remember how you like to dine with us."
        illustrationAccentClassName="bg-amber-200/45"
      />

      <div className="rounded-2xl border border-gold/30 bg-gradient-to-r from-teal-dark/90 via-teal-dark to-teal-dark/85 px-6 py-8 text-cream shadow-[0_18px_45px_rgba(8,50,48,0.35)]">
        <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-cream/75">Current circle</p>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-display text-3xl tracking-tight">Host tier</p>
            <p className="mt-2 max-w-xl text-[14px] text-cream/85 leading-relaxed">
              Priority wording at pickup, birthday flourishes, and first access to limited drops — all understated, never
              loud.
            </p>
          </div>
          <div className="rounded-xl bg-white/10 px-4 py-3 text-[12px] font-semibold uppercase tracking-[0.14em] text-cream/90 backdrop-blur-sm">
            Next unlock · Guest of honor desserts
          </div>
        </div>
      </div>

      <RewardsSummaryCard
        tierLabel="Two more visits to glow tier"
        tagline="We’re counting shared tables, not transactions — quality beats velocity."
        progressLabel="Warmth meter"
        progressPercent={72}
      />

      <CustomerPanel title="Recent kindnesses" eyebrow="Your activity (sample)">
        <ul className="divide-y divide-cream-dark/80">
          {mockRewardsActivity.map((a) => (
            <li key={a.id} className="py-4 first:pt-0 last:pb-0">
              <p className="text-[13px] font-semibold text-charcoal">{a.title}</p>
              <p className="mt-1 text-[13px] text-charcoal/68 leading-relaxed">{a.detail}</p>
              <p className="mt-2 text-[11px] uppercase tracking-[0.12em] text-charcoal/45">{a.when}</p>
            </li>
          ))}
        </ul>
      </CustomerPanel>
    </div>
  );
}
