"use client";

import StatusPill from "@/components/governance/StatusPill";
import { ENFORCEMENT_LAYER_LABELS } from "@/lib/governance/governanceStatus";
import type { GovernanceEnforcementLayer, GovernanceOperationalStatus } from "@/lib/governance/governanceStatus";
import { statusPillVariantForOperationalStatus } from "@/lib/governance/governanceStatus";
import type { GovernanceRiskLevel } from "@/lib/governance/governanceStatus";

export type GovernanceStatusCardProps = {
  title: string;
  status: GovernanceOperationalStatus | "ACTIVE" | "BLOCKED" | "DISABLED";
  statusDescription: string;
  metaKey?: string;
  riskLevel?: GovernanceRiskLevel;
  enforcementLayers?: GovernanceEnforcementLayer[];
  blockingLayerLabels?: string[];
  lastModifiedAt?: string | null;
  lastModifiedBy?: string | null;
  lastAuditReason?: string | null;
  actionLabel: string;
  actionVariant?: "primary" | "danger" | "neutral";
  actionBusy?: boolean;
  actionDisabled?: boolean;
  onAction: () => void;
  footnote?: string;
};

function fmtWhen(iso: string | null | undefined): string | null {
  if (!iso) return null;
  try {
    return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function riskLabel(level: GovernanceRiskLevel): string {
  return level === "high" ? "High risk" : level === "medium" ? "Medium risk" : "Low risk";
}

export default function GovernanceStatusCard({
  title,
  status,
  statusDescription,
  metaKey,
  riskLevel = "low",
  enforcementLayers = [],
  blockingLayerLabels = [],
  lastModifiedAt,
  lastModifiedBy,
  lastAuditReason,
  actionLabel,
  actionVariant = "primary",
  actionBusy = false,
  actionDisabled = false,
  onAction,
  footnote,
}: GovernanceStatusCardProps) {
  const pillVariant = statusPillVariantForOperationalStatus(
    status as GovernanceOperationalStatus
  );
  const when = fmtWhen(lastModifiedAt);

  const actionClass =
    actionVariant === "danger"
      ? "border-red/35 bg-red/[0.08] text-red-dark hover:bg-red/[0.12]"
      : actionVariant === "neutral"
        ? "border-cream-dark/80 bg-cream-mid/40 text-charcoal/80 hover:bg-cream-mid/60"
        : "border-teal-dark/35 bg-teal/[0.08] text-teal-dark hover:bg-teal/[0.12]";

  return (
    <li className="flex flex-col gap-4 px-4 py-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6 sm:px-5">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-[15px] font-semibold text-teal-dark">{title}</p>
          <StatusPill variant={pillVariant}>{status}</StatusPill>
          {metaKey ? (
            <code className="rounded bg-cream-dark/45 px-1.5 py-0.5 text-[10px] font-mono text-charcoal/70">
              {metaKey}
            </code>
          ) : null}
          <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-charcoal/40">
            {riskLabel(riskLevel)}
          </span>
        </div>
        <p className="mt-2 text-[13px] leading-relaxed text-charcoal/65">{statusDescription}</p>
        {blockingLayerLabels.length > 0 ? (
          <p className="mt-2 text-[12px] text-charcoal/55">
            <span className="font-semibold text-charcoal/65">Blocking layers · </span>
            {blockingLayerLabels.join(" · ")}
          </p>
        ) : null}
        {enforcementLayers.length > 0 ? (
          <p className="mt-2 text-[12px] text-charcoal/50">
            <span className="font-semibold text-charcoal/60">Enforcement · </span>
            {enforcementLayers.map((l) => ENFORCEMENT_LAYER_LABELS[l]).join(" · ")}
          </p>
        ) : null}
        {(lastModifiedBy || when || lastAuditReason) && (
          <div className="mt-3 space-y-1 text-[11px] font-medium text-charcoal/45">
            {lastModifiedBy || when ? (
              <p>
                Last change
                {lastModifiedBy ? (
                  <>
                    {" "}
                    · <span className="text-charcoal/65">{lastModifiedBy}</span>
                  </>
                ) : null}
                {when ? <> · {when}</> : null}
              </p>
            ) : null}
            {lastAuditReason ? (
              <p>
                Audit reason · <span className="text-charcoal/65">{lastAuditReason}</span>
              </p>
            ) : null}
          </div>
        )}
        {footnote ? <p className="mt-2 text-[11px] leading-relaxed text-charcoal/45">{footnote}</p> : null}
      </div>
      <div className="flex shrink-0 flex-col items-stretch gap-2 sm:items-end">
        <button
          type="button"
          disabled={actionDisabled || actionBusy}
          aria-busy={actionBusy}
          onClick={() => void onAction()}
          className={`rounded-xl border px-4 py-2 text-[13px] font-semibold transition disabled:opacity-60 disabled:cursor-wait ${actionClass}`}
        >
          {actionBusy ? "Applying…" : actionLabel}
        </button>
      </div>
    </li>
  );
}
