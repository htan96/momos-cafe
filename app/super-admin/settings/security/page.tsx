import GovPageHeader from "@/components/governance/GovPageHeader";
import OperationalCard from "@/components/governance/OperationalCard";
import MetricQuiet from "@/components/governance/MetricQuiet";

export default function SuperAdminSettingsSecurityPage() {
  return (
    <div className="space-y-8">
      <GovPageHeader
        eyebrow="Settings · Security"
        title="Session & MFA fabric"
        subtitle="Companion policy summaries for Cognito — numbers are illustrative placeholders."
      />

      <div className="grid gap-6 md:grid-cols-2">
        <OperationalCard title="MFA stance" footer={<span className="text-[11px] text-charcoal/45">WebAuthn rollout staged per franchise pack.</span>}>
          <MetricQuiet label="Admin TOTP coverage" value="98.4%" />
          <MetricQuiet label="Step-up cooldown" value="8 min" hint="Privileged surfaces" />
          <p className="text-[13px] text-charcoal/65 mt-3 leading-relaxed">
            Highlights risk-based prompts, device trust decay, and break-glass override queue (audited separately).
          </p>
        </OperationalCard>

        <OperationalCard title="Session envelopes" footer={<span className="text-[11px] text-charcoal/45">Customer vs staff planes differ subtly.</span>}>
          <MetricQuiet label="Idle timeout" value="45 min" hint="Privileged default" />
          <MetricQuiet label="Absolute ceiling" value="12 h" hint="With rotation" />
          <p className="text-[13px] text-charcoal/65 mt-3 leading-relaxed">
            Refresh choreography, SSR cookie posture, and device binding hints appear here once observability merges.
          </p>
        </OperationalCard>

        <OperationalCard title="Password posture" footer={<span className="text-[11px] text-charcoal/45">Aligns with NIST SPA guidance.</span>}>
          <MetricQuiet label="Min length" value="14 chars" />
          <MetricQuiet label="Reuse window" value="24 gen" hint="Historical hash window" />
          <p className="text-[13px] text-charcoal/65 mt-3 leading-relaxed">
            Breached-password dictionary sync cadence · placeholder until threat intel feed connects.
          </p>
        </OperationalCard>

        <OperationalCard title="Network veil" footer={<span className="text-[11px] text-charcoal/45">Edge & WAF live outside app runtime.</span>}>
          <p className="text-[13px] text-charcoal/65 leading-relaxed">
            Administrative allowlists and VPN-only breakpoints surface as read-only summaries — edits flow through infra pipelines.
          </p>
          <MetricQuiet label="Console IP pinning" value="Off" hint="Regional offices" />
        </OperationalCard>
      </div>
    </div>
  );
}
