import Link from "next/link";
import GovPageHeader from "@/components/governance/GovPageHeader";
import OperationalCard from "@/components/governance/OperationalCard";

export default function SuperAdminAdminsPage() {
  return (
    <div className="space-y-8">
      <GovPageHeader
        eyebrow="Directory"
        title="Privileged operators"
        subtitle="Admin and super-admin memberships live in the Cognito user pool — this app does not mirror a full roster in Postgres."
      />

      <OperationalCard title="Where the roster actually lives" meta="Cognito · AWS console or API">
        <p className="text-[13px] text-charcoal/70 leading-relaxed">
          Assign users to the <code className="rounded border border-cream-dark/60 bg-cream-mid/25 px-1">admin</code> or{" "}
          <code className="rounded border border-cream-dark/60 bg-cream-mid/25 px-1">super_admin</code> group in Cognito. Session
          claims drive access to `/admin` and `/super-admin`; there is no replicated operator table here to sort or filter.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            href="/super-admin/customer-lookup"
            className="rounded-xl border border-teal-dark/35 bg-teal/[0.08] px-4 py-2 text-[13px] font-semibold text-teal-dark hover:bg-teal/[0.12]"
          >
            Customer lookup
          </Link>
          <Link
            href="/super-admin/cognito-tools"
            className="rounded-xl border border-cream-dark/70 px-4 py-2 text-[13px] font-semibold text-charcoal/80 hover:bg-cream-mid/35"
          >
            Cognito environment hints
          </Link>
        </div>
      </OperationalCard>

      <OperationalCard title="Audit visibility" meta="GovernanceAuditEvent">
        <p className="text-[13px] text-charcoal/70 leading-relaxed">
          Impersonation starts/ends, perspective switches, and platform feature patches emit append-only audit rows with actor email
          — useful for proving who exercised super-admin tools even without a directory grid.
        </p>
        <Link href="/super-admin/audit" className="mt-3 inline-block text-[13px] font-semibold text-teal-dark underline-offset-2 hover:underline">
          Open audit stream
        </Link>
      </OperationalCard>
    </div>
  );
}
