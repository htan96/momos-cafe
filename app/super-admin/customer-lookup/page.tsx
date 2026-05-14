import GovPageHeader from "@/components/governance/GovPageHeader";
import OperationalCard from "@/components/governance/OperationalCard";
import StartCustomerImpersonation from "@/components/governance/StartCustomerImpersonation";
import StatusPill from "@/components/governance/StatusPill";

export default function SuperAdminCustomerLookupPage() {
  return (
    <div className="space-y-8">
      <GovPageHeader
        eyebrow="Privileged search"
        title="Customer lookup"
        subtitle="Governance-first framing for cross-checking guests during escalations. Query remains local-only."
      />

      <OperationalCard title="Customer impersonation (MVP)" meta="Scoped session · audit logged">
        <p className="text-[13px] text-charcoal/65 leading-relaxed mb-1">
          Starts a signed, HttpOnly impersonation cookie (customer scope). You stay signed in as super-admin; the
          account surface loads the target diner&apos;s commerce context when linked in Prisma.
        </p>
        <StartCustomerImpersonation />
      </OperationalCard>

      <label className="block">
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-charcoal/45">Search diner</span>
        <input
          type="search"
          placeholder="Email, loyalty id, phone last-four…"
          className="mt-2 w-full rounded-xl border border-cream-dark bg-white px-4 py-3 text-[14px] text-charcoal placeholder:text-charcoal/40 shadow-sm focus:outline-none focus:ring-2 focus:ring-teal/25"
          aria-describedby="lookup-hint"
        />
        <p id="lookup-hint" className="mt-2 text-[12px] text-charcoal/50">
          Local-only field — submissions are not wired in this preview.
        </p>
      </label>

      <OperationalCard title="Result preview · skeleton" meta="No record selected">
        <div className="animate-pulse space-y-4" aria-hidden="true">
          <div className="h-4 bg-cream-dark/40 rounded-full w-1/3" />
          <div className="h-3 bg-cream-dark/30 rounded-full w-full" />
          <div className="h-3 bg-cream-dark/30 rounded-full w-5/6" />
        </div>

        <div className="mt-6 pt-6 border-t border-cream-dark/50">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-charcoal/45 mb-3">Governance flags</p>
          <div className="flex flex-wrap gap-2">
            <StatusPill variant="neutral">Catering escrow</StatusPill>
            <StatusPill variant="ok">Refund watch cleared</StatusPill>
            <StatusPill variant="warning">Support hold</StatusPill>
            <StatusPill variant="degraded">Loyalty sync lag</StatusPill>
          </div>
          <p className="mt-4 text-[13px] text-charcoal/60 leading-relaxed">
            Narrative placeholders appear here after search — escalation notes, MFA posture, prior chargebacks — all behind auditable confirmations.
          </p>
        </div>
      </OperationalCard>
    </div>
  );
}
