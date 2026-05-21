import Link from "next/link";
import GovPageHeader from "@/components/governance/GovPageHeader";
import OperationalCard from "@/components/governance/OperationalCard";
import StartCustomerImpersonation from "@/components/governance/StartCustomerImpersonation";
import SuperAdminEmptyPanel from "@/components/super-admin/SuperAdminEmptyPanel";
import { Search } from "lucide-react";

export default function SuperAdminUsersCustomersPage() {
  return (
    <div className="space-y-8">
      <GovPageHeader
        eyebrow="Users · Customers"
        title="Customers"
        subtitle="Support workflows should stay deliberate — escalation search and impersonation are guarded, audited primitives only."
        actions={
          <Link
            href="/super-admin/customer-operations"
            className="rounded-lg border border-cream-dark/60 bg-white px-3 py-1.5 text-[12px] font-semibold text-charcoal/80 shadow-sm transition hover:bg-cream-mid/40"
          >
            Customer dossiers
          </Link>
        }
      />

      <OperationalCard title="Customer impersonation" meta="Scoped session · governance audit append">
        <p className="text-[13px] text-charcoal/65 leading-relaxed mb-1">
          Starts a signed HttpOnly impersonation cookie (customer scope). You remain signed in as super-admin — the diner account
          experience loads once Prisma links resolve.
        </p>
        <StartCustomerImpersonation />
      </OperationalCard>

      <OperationalCard title="Directory search" meta="Not wired to APIs yet">
        <label className="block text-left">
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-charcoal/45">
            Locate a diner profile
          </span>
          <input
            type="search"
            disabled
            readOnly
            placeholder="Searching will enable after directory APIs land"
            className="mt-2 w-full cursor-not-allowed rounded-xl border border-cream-dark/80 bg-cream-mid/20 px-4 py-3 text-[14px] text-charcoal/45 shadow-inner"
          />
        </label>
        <SuperAdminEmptyPanel
          icon={Search}
          eyebrow="Soon"
          title="No searchable customer roster here yet"
          description="Once server-backed lookup ships, typed queries hydrate from commerce identity tables only — fabricated loyalty flags never render in this pane."
        />
      </OperationalCard>
    </div>
  );
}
