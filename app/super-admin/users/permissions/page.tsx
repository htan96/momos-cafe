import Link from "next/link";
import GovPageHeader from "@/components/governance/GovPageHeader";
import OperationalCard from "@/components/governance/OperationalCard";
import { COGNITO_ROLE_CATALOG } from "@/lib/governance/cognitoRoleCatalog";

export default function SuperAdminUsersPermissionsPage() {
  return (
    <div className="space-y-8">
      <GovPageHeader
        eyebrow="Users · Permissions"
        title="Operational access charter"
        subtitle="Elevated tooling is mediated through Amazon Cognito staff groups—not a Postgres permission matrix copied here. This page exists so incident commanders orient quickly around who holds each tier, why impersonation is scoped, and where to escalate when evidence is contested."
      />

      <OperationalCard title="Two-tier staffing model" meta="Customers · operators · governors">
        <p className="text-[13px] text-charcoal/70 leading-relaxed">
          Operators authenticate through Cognito-hosted flows; once inside the storefront they receive group claims wired into the
          session. Day-to-day admins keep operations moving in the merchant shell while a smaller super-admin roster handles the
          break-glass surface that audits care about — platform switches, impersonation envelopes, and recovery choreography.
          Nothing on this charter bypasses infra policy: we describe practice, not a substitute SSO console.
        </p>
      </OperationalCard>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {COGNITO_ROLE_CATALOG.map((role) => (
          <OperationalCard key={role.id} title={role.title} meta={`Pool group · ${role.cognitoGroup}`}>
            <p className="text-[13px] text-charcoal/68 leading-relaxed mb-4">{role.description}</p>
            <div className="space-y-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-charcoal/45 mb-2">What crews use it</p>
                <ul className="space-y-1.5">
                  {role.capabilities.map((c) => (
                    <li key={c} className="text-[13px] text-charcoal/78 pl-3 border-l-[2px] border-gold/40 leading-snug">
                      {c}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-charcoal/45 mb-2">Primary surfaces</p>
                <ul className="flex flex-wrap gap-1.5">
                  {role.routePrefixes.map((p) => (
                    <li
                      key={p}
                      className="text-[11px] font-medium rounded-md border border-teal/20 bg-teal/[0.06] px-2 py-1 text-teal-dark/90"
                    >
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-xl border border-cream-dark/60 bg-white/90 px-3 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-charcoal/50 mb-2">
                  Accountability notes
                </p>
                {role.elevated.length > 0 ?
                  <ul className="space-y-1.5">
                    {role.elevated.map((e) => (
                      <li key={e} className="text-[12px] text-charcoal/76 leading-snug">
                        {e}
                      </li>
                    ))}
                  </ul>
                : (
                  <p className="text-[12px] text-charcoal/58 leading-snug">
                    Default diner posture preserves least-privilege storefront access unless another control explicitly expands it.
                  </p>
                )}
              </div>
            </div>
          </OperationalCard>
        ))}
      </div>

      <OperationalCard title="Customer impersonation & audits" meta="Super-admin gated">
        <ul className="list-disc ml-5 space-y-2 text-[13px] text-charcoal/72 leading-relaxed">
          <li>
            Begin customer impersonation only from super-admin tooling with a substantive justification—it is written to immutable
            governance evidence.
          </li>
          <li>
            Ledger rows remain after sessions end so operations leadership can corroborate who touched the diner experience and why.
          </li>
          <li>
            Admin-scope impersonation is intentionally deferred—the charter stands on customer envelopes until infra signs off on
            safe projection.
          </li>
          <li>
            When narrative conflicts arise, escalate with the chronological stream in audit logs—not ad-hoc spreadsheets.
          </li>
        </ul>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/super-admin/security/audit-logs"
            className="rounded-xl border border-teal-dark/35 bg-teal/[0.08] px-4 py-2 text-[13px] font-semibold text-teal-dark hover:bg-teal/[0.12]"
          >
            Open governance timeline
          </Link>
          <Link
            href="/super-admin/users/admins"
            className="rounded-xl border border-cream-dark/70 px-4 py-2 text-[13px] font-semibold text-charcoal/78 hover:bg-cream-mid/35"
          >
            Elevated roster + ledger rail
          </Link>
          <Link
            href="/super-admin/users/customers"
            className="rounded-xl border border-cream-dark/70 px-4 py-2 text-[13px] font-semibold text-charcoal/78 hover:bg-cream-mid/35"
          >
            Customer support roster
          </Link>
        </div>
      </OperationalCard>

      <OperationalCard title="Escalation & vendor boundary" meta="When page copy diverges">
        <ul className="list-disc ml-5 space-y-2 text-[13px] text-charcoal/72 leading-relaxed mb-5">
          <li>
            Source-of-truth for pool membership edits remains Amazon Cognito and your identity runbooks—coordinate with infra when
            this UI cannot reflect last-minute federation changes.
          </li>
          <li>If policy guidance here disagrees with an approved SSO/SOC playbook, escalate to security leadership before widening access.</li>
          <li>
            Need granular evidence bundles? Export governance timeline rows via the approved analytics path once intent is filed with
            security.
          </li>
        </ul>
        <div className="rounded-xl border border-dashed border-cream-dark px-4 py-3 text-[11px] text-charcoal/50 leading-relaxed">
          Tip: auditors expect human-readable charters plus machine receipts. Combine this page with CSV/SQL excerpts only through
          the governed export process your org already approved.
        </div>
      </OperationalCard>
    </div>
  );
}
