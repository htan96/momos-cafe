import Link from "next/link";
import GovPageHeader from "@/components/governance/GovPageHeader";
import OperationalCard from "@/components/governance/OperationalCard";

export default function SuperAdminUsersAdminsPage() {
  return (
    <div className="space-y-8">
      <GovPageHeader
        eyebrow="Users · Admins"
        title="Admins"
        subtitle="Operator memberships live exclusively in Cognito groups — Postgres does not replicate a staffing grid for this tenant."
      />

      <OperationalCard title="Roster posture" meta="Cognito sourced">
        <p className="text-[13px] text-charcoal/70 leading-relaxed">
          Assign colleagues to{" "}
          <code className="rounded border border-cream-dark/60 bg-cream-mid/25 px-1">admin</code> or{" "}
          <code className="rounded border border-cream-dark/60 bg-cream-mid/25 px-1">super_admin</code> within the Cognito user
          pool. Session claims authorize `/admin` and `/super-admin`; there&apos;s nothing to sort here until IAM sync feeds land.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            href="/admin/accounts"
            className="rounded-xl border border-teal-dark/35 bg-teal/[0.08] px-4 py-2 text-[13px] font-semibold text-teal-dark hover:bg-teal/[0.12]"
          >
            Account directory · admin shell
          </Link>
          <Link
            href="/super-admin/users/customers"
            className="rounded-xl border border-cream-dark/70 px-4 py-2 text-[13px] font-semibold text-charcoal/80 hover:bg-cream-mid/35"
          >
            Customer tools
          </Link>
          <Link
            href="/super-admin/system/integrations"
            className="rounded-xl border border-cream-dark/70 px-4 py-2 text-[13px] font-semibold text-charcoal/80 hover:bg-cream-mid/35"
          >
            Integration env readiness
          </Link>
          <Link
            href="/super-admin/cognito-tools"
            className="rounded-xl border border-dashed border-cream-dark px-4 py-2 text-[13px] font-semibold text-charcoal/70 hover:bg-cream-mid/35"
          >
            Environment hints (Cognito masks)
          </Link>
        </div>
      </OperationalCard>

      <OperationalCard title="Roadmap honesty" meta="IAM deferred">
        <p className="text-[13px] text-charcoal/70 leading-relaxed">
          Pool admin APIs (bulk search, <span className="font-mono">AdminUserGlobalSignOut</span>, fine-grained device
          trust) intentionally stay outside this tenant UI until infra signs off — the Cognito tooling page only mirrors{" "}
          <span className="font-mono">process.env</span> shape instead of dangling an orphan mega-console.
        </p>
      </OperationalCard>

      <OperationalCard title="Audit visibility" meta="GovernanceAuditEvent append-only">
        <p className="text-[13px] text-charcoal/70 leading-relaxed">
          Impersonation starts, perspective pivots, and platform controls emit audited rows keyed by actor email — useful whenever
          you need attestations without exporting Cognito consoles.
        </p>
        <Link
          href="/super-admin/security/audit-logs"
          className="mt-3 inline-block text-[13px] font-semibold text-teal-dark underline-offset-2 hover:underline"
        >
          Open audit stream
        </Link>
      </OperationalCard>
    </div>
  );
}
