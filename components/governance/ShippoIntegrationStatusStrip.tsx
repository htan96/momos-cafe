import Link from "next/link";
import StatusPill, { type StatusPillVariant } from "@/components/governance/StatusPill";

export type ShippoIntegrationStatusStripProps = {
  snapshot: {
    currentStatus: string;
    category: string;
    latencyMs: number | null;
    lastSuccessfulCheckAt: Date | null;
    lastFailedCheckAt: Date | null;
    lastErrorMessage: string | null;
    updatedAt: Date;
  } | null;
};

function statusVariant(status: string): StatusPillVariant {
  switch (status) {
    case "healthy":
      return "ok";
    case "degraded":
      return "warning";
    case "offline":
      return "degraded";
    default:
      return "neutral";
  }
}

/** Single-line readout of persisted `IntegrationHealthSnapshot` for Shippo (no probe run). */
export default function ShippoIntegrationStatusStrip({ snapshot }: ShippoIntegrationStatusStripProps) {
  if (!snapshot) {
    return (
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-dashed border-cream-dark/50 bg-cream-mid/15 px-3 py-2 text-[12px] text-charcoal/65">
        <span className="font-semibold text-charcoal/80">Shippo</span>
        <span>—</span>
        <span>No health snapshot row yet (run checks from Live Operations).</span>
        <Link
          href="/super-admin/live-operations"
          className="font-semibold text-teal-dark hover:underline"
        >
          Live Operations
        </Link>
      </div>
    );
  }

  const last =
    snapshot.lastSuccessfulCheckAt && snapshot.lastFailedCheckAt
      ? snapshot.lastSuccessfulCheckAt > snapshot.lastFailedCheckAt
        ? snapshot.lastSuccessfulCheckAt
        : snapshot.lastFailedCheckAt
      : snapshot.lastSuccessfulCheckAt ?? snapshot.lastFailedCheckAt;

  const bits = [
    snapshot.latencyMs != null ? `${snapshot.latencyMs}ms` : null,
    last
      ? `checked ${last.toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" })}`
      : null,
  ].filter(Boolean);

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-cream-dark/50 bg-white/80 px-3 py-2 text-[12px] text-charcoal/80 shadow-sm">
      <span className="font-semibold text-charcoal">Shippo</span>
      <StatusPill variant={statusVariant(snapshot.currentStatus)}>{snapshot.currentStatus}</StatusPill>
      <span className="text-charcoal/55">{snapshot.category}</span>
      {bits.length ? <span className="text-charcoal/50">·</span> : null}
      <span className="text-charcoal/60">{bits.join(" · ")}</span>
      {snapshot.lastErrorMessage ? (
        <span className="max-w-[28rem] truncate text-charcoal/55" title={snapshot.lastErrorMessage}>
          · {snapshot.lastErrorMessage}
        </span>
      ) : null}
      <span className="text-charcoal/40">·</span>
      <span className="text-[11px] text-charcoal/45">
        snapshot {snapshot.updatedAt.toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" })}
      </span>
      <Link href="/super-admin/live-operations" className="ml-auto font-semibold text-teal-dark hover:underline">
        Live Operations
      </Link>
    </div>
  );
}
