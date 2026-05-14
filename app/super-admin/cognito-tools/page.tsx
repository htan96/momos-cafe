import GovPageHeader from "@/components/governance/GovPageHeader";
import OperationalCard from "@/components/governance/OperationalCard";
import { getCognitoEnvHintLines } from "@/lib/governance/cognitoEnvHints";

export default function SuperAdminCognitoToolsPage() {
  const hints = getCognitoEnvHintLines();

  return (
    <div className="space-y-8">
      <GovPageHeader
        eyebrow="Identity utilities"
        title="Cognito tools"
        subtitle="Server-only configuration hints from `process.env`. No AWS console chrome — this route never calls Cognito from the browser."
        actions={
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-charcoal/45 rounded-lg border border-cream-dark px-3 py-1.5 bg-cream-mid/30">
            Read-only
          </span>
        }
      />

      <OperationalCard title="Environment shape (masked)" meta="No secrets printed">
        <ul className="font-mono text-[12px] space-y-2 text-charcoal/70 break-all">
          {hints.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
        <p className="mt-3 text-[11px] text-charcoal/45 leading-relaxed">
          Pool, client id, and region come from the same variables as{" "}
          <code className="text-[11px]">lib/auth/cognito/config</code>. Rotate credentials out of band — nothing here is writable.
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
          placeholder="Requires Cognito admin API wiring from server actions"
          className="w-full rounded-xl border border-cream-dark bg-cream-mid/25 px-4 py-3 text-[14px] text-charcoal/50 cursor-not-allowed"
          aria-disabled="true"
        />
      </div>

      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-3">
        <OperationalCard title="Group names to expect in tokens">
          <p className="text-[13px] text-charcoal/70 leading-relaxed">
            JWT claim <code className="text-[12px]">cognito:groups</code> includes literal strings{" "}
            <code className="text-[12px]">customer</code>, <code className="text-[12px]">admin</code>, and{" "}
            <code className="text-[12px]">super_admin</code>. Middleware and layouts branch on those values — keep pool assignments
            aligned when onboarding operators.
          </p>
        </OperationalCard>

        <OperationalCard title="Protected path prefixes">
          <p className="text-[13px] text-charcoal/70 leading-relaxed">
            <code className="text-[12px]">COGNITO_PROTECTED_PREFIXES</code> overrides the default comma list (
            <code className="text-[12px]">/account</code>, <code className="text-[12px]">/admin</code>,{" "}
            <code className="text-[12px]">/super-admin</code>). Extra matchers (for example <code className="text-[12px]">/portal</code>)
            must stay synchronized with <code className="text-[12px]">middleware.ts</code> so the gate runs before internal API secrets.
          </p>
        </OperationalCard>

        <OperationalCard title="Super-admin break glass">
          <p className="text-[13px] text-charcoal/70 leading-relaxed">
            Impersonation requires <code className="text-[12px]">IMPERSONATION_SECRET</code> (or the unsafe dev flag) and writes to{" "}
            <code className="text-[12px]">GovernanceAuditEvent</code>. It is API-driven — there is no button on this placeholder surface yet.
          </p>
        </OperationalCard>
      </div>
    </div>
  );
}
