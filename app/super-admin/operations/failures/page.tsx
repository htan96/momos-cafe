import Link from "next/link";
import { Suspense } from "react";
import SuperAdminSectionIntro from "@/components/super-admin/SuperAdminSectionIntro";
import OperationalFailuresInbox from "@/components/super-admin/operations/failures/OperationalFailuresInbox";
import { prisma } from "@/lib/prisma";
import { OPERATIONAL_INCIDENT_ACTIVE_STATUSES } from "@/lib/operations/incidentTypes";
import { TriangleAlert } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function SuperAdminOperationalFailuresPage() {
  const activeIncidents = await prisma.operationalIncident.findMany({
    where: { status: { in: [...OPERATIONAL_INCIDENT_ACTIVE_STATUSES] } },
    orderBy: { lastDetectedAt: "desc" },
    select: { id: true, type: true, severity: true, status: true, title: true },
  });

  return (
    <div className="space-y-8">
      <SuperAdminSectionIntro
        icon={TriangleAlert}
        title="Failures"
        subtitle="Cross-system failure inbox backed by real OperationalActivityEvent rows (~90 day window). Triage overlays are stored separately — incidents stay on the Incidents route."
        actions={
          <Link
            href="/super-admin/incidents"
            className="rounded-lg border border-cream-dark/60 bg-white px-3 py-1.5 text-[12px] font-semibold text-charcoal/80 shadow-sm transition hover:bg-cream-mid/40"
          >
            Incidents
          </Link>
        }
      />
      <Suspense fallback={<p className="text-[13px] text-charcoal/60">Loading failure inbox…</p>}>
        <OperationalFailuresInbox activeIncidents={activeIncidents} />
      </Suspense>
    </div>
  );
}
