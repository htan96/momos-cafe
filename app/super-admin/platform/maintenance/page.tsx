import Link from "next/link";
import MaintenanceConflictBanner from "@/components/governance/MaintenanceConflictBanner";
import OperationalCard from "@/components/governance/OperationalCard";
import SuperAdminSectionIntro from "@/components/super-admin/SuperAdminSectionIntro";
import { loadGovernanceSnapshot } from "@/lib/governance/governanceSnapshot";
import { Wrench } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function SuperAdminPlatformMaintenancePage() {
  const snapshot = await loadGovernanceSnapshot();

  return (
    <div className="space-y-8">
      <SuperAdminSectionIntro
        icon={Wrench}
        title="Maintenance"
        subtitle="Storefront gates use ACTIVE/BLOCKED status in admin maintenance — governance kill switches sync via Feature controls when drift banners appear."
      />

      <MaintenanceConflictBanner conflicts={snapshot.maintenanceConflicts} />

      <OperationalCard title="Storefront gates" meta="Production controls">
        <p className="text-[13px] text-charcoal/65 leading-relaxed">
          Café menu visibility and retail shop availability are authoritative in admin maintenance surfaces. Governance kill switches complement those gates inside Feature controls — no illustrative downtime clocks are shown here.
        </p>
        <Link
          href="/admin/settings/maintenance"
          className="mt-5 inline-flex items-center rounded-xl border border-teal-dark/35 bg-teal/[0.08] px-4 py-2 text-[13px] font-semibold text-teal-dark hover:bg-teal/[0.12]"
        >
          Open maintenance controls
        </Link>
      </OperationalCard>

      <OperationalCard title="Operational snapshot" meta="Cross-reference">
        <ul className="text-[13px] text-teal-dark font-semibold space-y-2">
          <li>
            <Link className="underline-offset-2 hover:underline" href="/super-admin/platform/operational-status">
              Operational status · capability dashboard
            </Link>
          </li>
          <li>
            <Link className="underline-offset-2 hover:underline" href="/super-admin/platform/feature-controls">
              Feature controls · kill switches
            </Link>
          </li>
          <li>
            <Link className="underline-offset-2 hover:underline" href="/super-admin/live-activity#related-controls">
              Live activity · governance state
            </Link>
          </li>
        </ul>
      </OperationalCard>
    </div>
  );
}
