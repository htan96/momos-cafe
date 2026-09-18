import Link from "next/link";
import GovPageHeader from "@/components/governance/GovPageHeader";
import MaintenanceConflictBanner from "@/components/governance/MaintenanceConflictBanner";
import OperationalCard from "@/components/governance/OperationalCard";
import StatusPill from "@/components/governance/StatusPill";
import { statusPillVariantForOperationalStatus } from "@/lib/governance/governanceStatus";
import { ENFORCEMENT_LAYER_LABELS } from "@/lib/governance/governanceStatus";
import { loadGovernanceSnapshot } from "@/lib/governance/governanceSnapshot";

export const dynamic = "force-dynamic";

function fmtWhen(iso: string | null): string | null {
  if (!iso) return null;
  try {
    return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export default async function SuperAdminOperationalStatusPage() {
  const snapshot = await loadGovernanceSnapshot();

  return (
    <div className="space-y-10">
      <GovPageHeader
        eyebrow="Governance"
        title="Operational status"
        subtitle="Capability-first view of what customers and staff can do right now — derived from kill switches, maintenance gates, and platform features."
        actions={
          <Link
            href="/super-admin/platform/feature-controls"
            className="rounded-lg border border-cream-dark/60 bg-white px-3 py-1.5 text-[12px] font-semibold text-charcoal/80 shadow-sm transition hover:bg-cream-mid/40"
          >
            Feature controls
          </Link>
        }
      />

      <MaintenanceConflictBanner conflicts={snapshot.maintenanceConflicts} />

      <p className="text-[12px] text-charcoal/50">
        Snapshot {fmtWhen(snapshot.generatedAt)} ·{" "}
        <Link href="/api/super-admin/governance-snapshot" className="font-semibold text-teal-dark hover:underline">
          JSON snapshot API
        </Link>
      </p>

      <OperationalCard title="Customer & platform capabilities" meta="Derived status · not toggles">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {snapshot.capabilities.map((cap) => (
            <article
              key={cap.id}
              className="rounded-xl border border-cream-dark/70 bg-cream/30 px-4 py-4 shadow-sm"
            >
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-[15px] font-semibold text-teal-dark">{cap.title}</h3>
                <StatusPill variant={statusPillVariantForOperationalStatus(cap.status)}>{cap.status}</StatusPill>
              </div>
              <p className="mt-2 text-[13px] leading-relaxed text-charcoal/65">{cap.behavior}</p>
              {cap.blockingLayers.length > 0 ? (
                <ul className="mt-3 space-y-1 text-[12px] text-charcoal/55">
                  {cap.blockingLayers.map((b) => (
                    <li key={`${cap.id}-${b.sourceKey}`}>
                      <span className="font-semibold text-charcoal/70">{b.label}</span> · {b.sourceTitle}
                    </li>
                  ))}
                </ul>
              ) : null}
              <p className="mt-2 text-[11px] text-charcoal/45">
                Enforcement · {cap.enforcementLayers.map((l) => ENFORCEMENT_LAYER_LABELS[l]).join(" · ")}
              </p>
              {(cap.lastModifiedBy || cap.lastModifiedAt) && (
                <p className="mt-2 text-[11px] text-charcoal/40">
                  Last change
                  {cap.lastModifiedBy ? ` · ${cap.lastModifiedBy}` : ""}
                  {cap.lastModifiedAt ? ` · ${fmtWhen(cap.lastModifiedAt)}` : ""}
                </p>
              )}
            </article>
          ))}
        </div>
      </OperationalCard>

      <OperationalCard
        title="Quick posture"
        meta={`${snapshot.controls.filter((c) => c.status === "BLOCKED").length} restrictions · ${snapshot.platformFeatures.filter((f) => f.status === "DISABLED").length} features off`}
      >
        <dl className="grid gap-3 sm:grid-cols-2 text-[13px]">
          <div>
            <dt className="text-charcoal/50">Kill switches active</dt>
            <dd className="font-semibold text-charcoal tabular-nums">
              {snapshot.controls.filter((c) => c.restrictionEnabled).length} / {snapshot.controls.length}
            </dd>
          </div>
          <div>
            <dt className="text-charcoal/50">Maintenance conflicts</dt>
            <dd className="font-semibold text-charcoal tabular-nums">{snapshot.maintenanceConflicts.length}</dd>
          </div>
          <div>
            <dt className="text-charcoal/50">Shop gate</dt>
            <dd className="font-semibold text-charcoal">
              {snapshot.appSettings.find((a) => a.key === "ShopEnabled")?.status ?? "—"}
            </dd>
          </div>
          <div>
            <dt className="text-charcoal/50">Menu gate</dt>
            <dd className="font-semibold text-charcoal">
              {snapshot.appSettings.find((a) => a.key === "MenuEnabled")?.status ?? "—"}
            </dd>
          </div>
        </dl>
      </OperationalCard>
    </div>
  );
}
