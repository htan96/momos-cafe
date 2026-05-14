import GovPageHeader from "@/components/governance/GovPageHeader";
import OperationalCard from "@/components/governance/OperationalCard";
import { maskedCognitoEnvHints } from "@/lib/governance/mockSuperAdmin";

export default function SuperAdminCognitoToolsPage() {
  return (
    <div className="space-y-8">
      <GovPageHeader
        eyebrow="Identity utilities"
        title="Cognito tools"
        subtitle="Operational shell for posture reviews. No outbound calls — search and actions stay disabled."
        actions={
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-charcoal/45 rounded-lg border border-cream-dark px-3 py-1.5 bg-cream-mid/30">
            Dry run
          </span>
        }
      />

      <OperationalCard title="Environment hints (masked)" meta="Never paste real secrets">
        <ul className="font-mono text-[12px] space-y-2 text-charcoal/70">
          {maskedCognitoEnvHints.map((line) => (
            <li key={line} className="truncate" title={line}>
              {line}
            </li>
          ))}
        </ul>
        <p className="mt-3 text-[11px] text-charcoal/45 leading-relaxed">
          Values resemble production shape only — rotate through your secret manager workflows, not the browser.
        </p>
      </OperationalCard>

      <div className="relative">
        <label className="text-[11px] font-semibold uppercase tracking-[0.14em] text-charcoal/45 mb-2 block" htmlFor="cognito-search-mock">
          User search
        </label>
        <input
          id="cognito-search-mock"
          type="search"
          disabled
          placeholder="Disabled until API wiring"
          className="w-full rounded-xl border border-cream-dark bg-cream-mid/25 px-4 py-3 text-[14px] text-charcoal/50 cursor-not-allowed"
          aria-disabled="true"
        />
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <OperationalCard title="MFA posture" footer={<span className="text-[11px] text-charcoal/45">TOTP preference · SMS fallback audit trail</span>}>
          <p className="text-[13px] text-charcoal/70 leading-relaxed">
            Inspect device registration drift, suppressed challenges, and admin-group enforcement deltas.
          </p>
        </OperationalCard>

        <OperationalCard title="Session envelope" footer={<span className="text-[11px] text-charcoal/45">Refresh token rotation posture</span>}>
          <p className="text-[13px] text-charcoal/70 leading-relaxed">
            Idle versus absolute timeouts, remember-device toggles, and risk-based step-up placeholders.
          </p>
        </OperationalCard>

        <OperationalCard title="Group lattice" footer={<span className="text-[11px] text-charcoal/45">Diff against expected IAM mirrors</span>}>
          <p className="text-[13px] text-charcoal/70 leading-relaxed">
            Cognito groups mapped to storefront, admin, super_admin scopes — compare with policy registry when connected.
          </p>
        </OperationalCard>
      </div>
    </div>
  );
}
