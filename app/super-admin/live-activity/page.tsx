import Link from "next/link";
import GovPageHeader from "@/components/governance/GovPageHeader";
import LiveActivityWorkspace from "@/components/super-admin/live/LiveActivityWorkspace";
import { queryLiveActivityFeed } from "@/lib/liveActivity/queryLiveActivityFeed";
import { queryLiveActivitySnapshots } from "@/lib/liveActivity/queryLiveActivitySnapshots";

export const dynamic = "force-dynamic";

export default async function SuperAdminLiveActivityPage() {
  const [initialFeed, initialSnapshots] = await Promise.all([
    queryLiveActivityFeed({ limit: 50 }),
    queryLiveActivitySnapshots(),
  ]);

  return (
    <div className="space-y-8">
      <GovPageHeader
        eyebrow="Command center · Live"
        title="Live activity"
        subtitle="Operational timeline with client polling over Postgres-backed events — no synthetic metrics."
        actions={
          <>
            <Link
              href="/super-admin/incidents"
              className="rounded-lg border border-cream-dark/60 bg-white px-3 py-1.5 text-[12px] font-semibold text-charcoal/80 shadow-sm transition hover:bg-cream-mid/40"
            >
              Incidents
            </Link>
            <Link
              href="/super-admin/operations/failures"
              className="rounded-lg border border-cream-dark/60 bg-white px-3 py-1.5 text-[12px] font-semibold text-charcoal/80 shadow-sm transition hover:bg-cream-mid/40"
            >
              Failures inbox
            </Link>
          </>
        }
      />

      <LiveActivityWorkspace initialFeed={initialFeed} initialSnapshots={initialSnapshots} />
    </div>
  );
}
