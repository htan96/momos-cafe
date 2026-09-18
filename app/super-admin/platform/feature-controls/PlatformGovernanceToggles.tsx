"use client";

import { useState } from "react";
import GovernanceStatusCard from "@/components/governance/GovernanceStatusCard";
import type { CognitoGroup } from "@/lib/auth/cognito/types";
import {
  PLATFORM_FEATURE_DEFINITIONS,
  type PlatformFeatureKey,
} from "@/lib/platform/governanceFeatures";

export type GovernanceFeatureBootstrap = {
  key: PlatformFeatureKey;
  title: string;
  description: string;
  rolloutNotes?: string;
  defaultEnabled: boolean;
  allowOverrideRoles: readonly CognitoGroup[];
  enabled: boolean;
  updatedAt: string;
  updatedBy: string | null;
  lastAuditReason?: string | null;
};

export default function PlatformGovernanceToggles({ initial }: { initial: GovernanceFeatureBootstrap[] }) {
  const [features, setFeatures] = useState(initial);
  const [busyKey, setBusyKey] = useState<PlatformFeatureKey | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function applyAction(featureKey: PlatformFeatureKey, enabled: boolean) {
    const prevSnapshot = [...features];
    setFeatures((list) =>
      list.map((f) =>
        f.key === featureKey ? { ...f, enabled, updatedAt: new Date().toISOString() } : f
      )
    );
    setError(null);

    try {
      setBusyKey(featureKey);
      const res = await fetch("/api/super-admin/platform-features", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ features: { [featureKey]: enabled } }),
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
        features?: { key: string; enabled: boolean; updatedAt: string; updatedBy: string | null }[];
      };
      const next = parsed.features;
      if (Array.isArray(next)) {
        setFeatures((curr) =>
          curr.map((f) => {
            const row = next.find((x) => x.key === f.key);
            return row ? { ...f, enabled: row.enabled, updatedAt: row.updatedAt, updatedBy: row.updatedBy } : f;
          })
        );
      }
    } catch (e) {
      setFeatures(prevSnapshot);
      setError(e instanceof Error ? e.message : "Something went sideways.");
    } finally {
      setBusyKey(null);
    }
  }

  return (
    <div className="space-y-3">
      {error ? (
        <p
          className="rounded-xl border border-red/30 bg-red/[0.05] px-4 py-3 text-[13px] font-medium text-red-dark"
          role="alert"
        >
          {error}
        </p>
      ) : null}
      <ul className="divide-y divide-cream-dark/50 overflow-hidden rounded-2xl border border-cream-dark/60 bg-white/70">
        {features.map((f) => {
          const def = PLATFORM_FEATURE_DEFINITIONS[f.key];
          const status = f.enabled ? "ACTIVE" : "DISABLED";
          const statusDescription = f.enabled ? def.activeDescription : def.disabledDescription;
          return (
            <GovernanceStatusCard
              key={f.key}
              title={f.title}
              status={status}
              statusDescription={statusDescription}
              metaKey={f.key}
              riskLevel={def.riskLevel}
              enforcementLayers={[...def.enforcementLayers]}
              lastModifiedAt={f.updatedAt}
              lastModifiedBy={f.updatedBy}
              lastAuditReason={f.lastAuditReason}
              actionLabel={f.enabled ? "Disable feature" : "Enable feature"}
              actionVariant={f.enabled ? "neutral" : "primary"}
              actionBusy={busyKey === f.key}
              onAction={() => void applyAction(f.key, !f.enabled)}
              footnote={
                f.rolloutNotes
                  ? `Rollout · ${f.rolloutNotes} · Overrides · ${f.allowOverrideRoles.join(", ")}`
                  : `Overrides · ${f.allowOverrideRoles.join(", ")}`
              }
            />
          );
        })}
      </ul>
      <p className="text-[11px] leading-relaxed text-charcoal/45">
        Storefront, cart, and checkout stay available for everyone; only the richer signed-in nook responds to{" "}
        <span className="font-semibold text-charcoal/60">customer platform</span> here.
      </p>
    </div>
  );
}
