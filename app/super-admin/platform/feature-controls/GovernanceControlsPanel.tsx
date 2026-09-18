"use client";

import { useState } from "react";
import GovernanceHighRiskDialog from "@/components/governance/GovernanceHighRiskDialog";
import GovernanceStatusCard from "@/components/governance/GovernanceStatusCard";
import {
  GOVERNANCE_CONTROL_DEFINITIONS,
  isHighRiskGovernanceControlKey,
  type GovernanceControlCategory,
  type GovernanceControlKey,
} from "@/lib/governance/controlKeys";
import { ENFORCEMENT_LAYER_LABELS } from "@/lib/governance/governanceStatus";

export type GovernanceControlBootstrap = {
  key: GovernanceControlKey;
  category: GovernanceControlCategory;
  title: string;
  description: string | null;
  enabled: boolean;
  updatedAt: string;
  lastModifiedBy: string | null;
  lastAuditReason?: string | null;
};

const CATEGORY_ORDER: GovernanceControlCategory[] = ["emergency", "commerce", "access", "content"];

const CATEGORY_LABEL: Record<GovernanceControlCategory, string> = {
  emergency: "Emergency",
  commerce: "Commerce",
  access: "Access",
  content: "Content",
};

export default function GovernanceControlsPanel({ initial }: { initial: GovernanceControlBootstrap[] }) {
  const [controls, setControls] = useState(initial);
  const [busyKey, setBusyKey] = useState<GovernanceControlKey | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingHighRisk, setPendingHighRisk] = useState<{
    key: GovernanceControlKey;
    nextEnabled: boolean;
  } | null>(null);

  async function patchControl(controlKey: GovernanceControlKey, enabled: boolean, reason?: string) {
    const prevSnapshot = [...controls];
    setControls((list) =>
      list.map((c) =>
        c.key === controlKey
          ? { ...c, enabled, updatedAt: new Date().toISOString() }
          : c
      )
    );
    setError(null);

    try {
      setBusyKey(controlKey);
      const res = await fetch("/api/super-admin/governance-controls", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ updates: { [controlKey]: enabled }, reason }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const msg =
          typeof body.message === "string"
            ? body.message
            : typeof body.error === "string"
              ? body.error
              : `${res.status} ${res.statusText}`;
        throw new Error(msg);
      }
      const parsed = (await res.json()) as {
        ok?: unknown;
        controls?: GovernanceControlBootstrap[];
      };
      if (Array.isArray(parsed.controls)) {
        setControls(parsed.controls);
      }
    } catch (e) {
      setControls(prevSnapshot);
      setError(e instanceof Error ? e.message : "Update failed.");
    } finally {
      setBusyKey(null);
      setPendingHighRisk(null);
    }
  }

  function requestToggle(controlKey: GovernanceControlKey) {
    const current = controls.find((c) => c.key === controlKey);
    if (!current) return;
    const nextEnabled = !current.enabled;
    if (isHighRiskGovernanceControlKey(controlKey)) {
      setPendingHighRisk({ key: controlKey, nextEnabled });
      return;
    }
    void patchControl(controlKey, nextEnabled);
  }

  const byCategory = CATEGORY_ORDER.map((cat) => ({
    cat,
    items: controls.filter((c) => c.category === cat),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="space-y-4">
      {error ? (
        <p
          className="rounded-xl border border-red/35 bg-red/[0.06] px-4 py-3 text-[13px] font-medium text-red-dark"
          role="alert"
        >
          {error}
        </p>
      ) : null}
      <p className="text-[12px] leading-relaxed text-charcoal/60 border-l-2 border-amber-800/40 pl-3">
        Status reflects live enforcement at the API boundary. Action buttons apply kill-switch changes — no ambiguous
        on/off toggles. Maintenance and menu flags write through to AppSetting.
      </p>
      <div className="space-y-8">
        {byCategory.map(({ cat, items }) => (
          <section key={cat} className="space-y-3">
            <div className="flex items-baseline gap-2">
              <h3 className="text-[11px] font-bold uppercase tracking-[0.22em] text-charcoal/45">
                {CATEGORY_LABEL[cat]}
              </h3>
              <span className="text-[10px] font-mono text-charcoal/35">{cat}</span>
            </div>
            <ul className="divide-y divide-cream-dark/50 overflow-hidden rounded-2xl border border-charcoal/15 bg-gradient-to-b from-charcoal/[0.03] to-white/80 shadow-sm">
              {items.map((c) => {
                const def = GOVERNANCE_CONTROL_DEFINITIONS[c.key];
                const status = c.enabled ? "BLOCKED" : "ACTIVE";
                const statusDescription = c.enabled ? def.blockedDescription : def.activeDescription;
                const actionLabel = c.enabled ? "Restore capability" : "Apply restriction";
                const actionVariant = c.enabled ? "primary" : "danger";
                return (
                  <GovernanceStatusCard
                    key={c.key}
                    title={def.title}
                    status={status}
                    statusDescription={statusDescription}
                    metaKey={c.key}
                    riskLevel={def.riskLevel}
                    enforcementLayers={[...def.enforcementLayers]}
                    blockingLayerLabels={
                      c.enabled ? [ENFORCEMENT_LAYER_LABELS.governance_kill_switch] : []
                    }
                    lastModifiedAt={c.updatedAt}
                    lastModifiedBy={c.lastModifiedBy}
                    lastAuditReason={c.lastAuditReason}
                    actionLabel={actionLabel}
                    actionVariant={actionVariant}
                    actionBusy={busyKey === c.key}
                    onAction={() => requestToggle(c.key)}
                    footnote={c.description ?? def.description}
                  />
                );
              })}
            </ul>
          </section>
        ))}
      </div>

      {pendingHighRisk ? (
        <GovernanceHighRiskDialog
          open
          controlKey={pendingHighRisk.key}
          activatingRestriction={pendingHighRisk.nextEnabled}
          busy={busyKey === pendingHighRisk.key}
          onCancel={() => setPendingHighRisk(null)}
          onConfirm={(reason) =>
            void patchControl(pendingHighRisk.key, pendingHighRisk.nextEnabled, reason)
          }
        />
      ) : null}
    </div>
  );
}
