import Link from "next/link";
import OpsPageHeader from "@/components/operations/OpsPageHeader";
import OpsPanel from "@/components/operations/OpsPanel";

export default function AdminCustomerLookupPage() {
  return (
    <div className="space-y-8">
      <OpsPageHeader title="Customer lookup" subtitle="Directory-backed search fires from account management — composite guest dossiers remain opt-in tooling." />

      <OpsPanel title="Directory browse" eyebrow="Real lists">
        <p className="text-[13px] text-charcoal/70 mb-6">
          The staff accounts explorer already reads Cognito + Prisma hybrids; start there rather than cloning mock profiles below.
        </p>
        <Link
          href="/admin/accounts?customers_only=1"
          className="rounded-lg border border-teal-dark/35 bg-teal/[0.07] px-4 py-2.5 text-[12px] font-semibold uppercase tracking-[0.12em] text-teal-dark hover:bg-teal/15 transition-colors"
        >
          Account directory → customers
        </Link>
      </OpsPanel>

      <OpsPanel title="Profile preview" eyebrow="Intentionally empty">
        <p className="text-[13px] text-charcoal/62 leading-relaxed">
          Persisted enrichment (tags, recent anchors, diet flags) lacks a modeled admin-facing projection yet — when it exists we will
          render it verbatim from Postgres instead of static examples.
        </p>
      </OpsPanel>
    </div>
  );
}
