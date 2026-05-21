"use client";

import { useState } from "react";
import type { CognitoGroup } from "@/lib/auth/cognito/types";
import type { PlatformFeatureKey } from "@/lib/platform/governanceFeatures";

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
};

function GovernanceSwitch({
  checked,
  labelledBy,
  busy,
  onToggle,
}: {
  checked: boolean;
  labelledBy: string;
  busy: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-busy={busy}
      disabled={busy}
      onClick={() => void onToggle()}
      className={`relative inline-flex h-7 w-[46px] shrink-0 cursor-pointer rounded-full border transition-colors disabled:opacity-65 disabled:cursor-wait ${checked ? "border-teal/35 bg-teal/[0.12]" : "border-cream-dark bg-cream-mid/50"}`}
      aria-labelledby={labelledBy}
    >
      <span
        className={`pointer-events-none inline-block h-[22px] w-[22px] translate-y-[2px] rounded-full shadow-sm bg-white transition ${checked ? "translate-x-[22px]" : "translate-x-[2px]"}`}
      />
    </button>
  );
}

export default function PlatformGovernanceToggles({ initial }: { initial: GovernanceFeatureBootstrap[] }) {
  const [features, setFeatures] = useState(initial);
  const [busyKey, setBusyKey] = useState<PlatformFeatureKey | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function applyToggle(featureKey: PlatformFeatureKey, enabled: boolean) {
    const prevSnapshot = [...features];
    setFeatures((list) =>
      list.map((f) =>
        f.key === featureKey
          ? { ...f, enabled, updatedAt: new Date().toISOString(), updatedBy: f.updatedBy }
          : f
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
        {features.map((f) => (
          <li
            key={f.key}
            className="flex flex-col gap-4 px-4 py-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6 sm:px-5"
          >
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <p id={`feature-${f.key}`} className="text-[15px] font-semibold text-charcoal">
                  {f.title}
                </p>
                <span className="rounded-full bg-cream-dark/45 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-teal-dark">
                  {f.key.replaceAll("_", " ")}
                </span>
              </div>
              <p className="mt-2 text-[13px] leading-relaxed text-charcoal/65">{f.description}</p>
              <p className="mt-2 text-[11px] uppercase tracking-[0.16em] text-charcoal/45">
                Default rollout ·{" "}
                <span className="font-semibold">{f.defaultEnabled ? "typically on" : "typically off"}</span>
              </p>
              {f.rolloutNotes ? (
                <p className="mt-2 text-[12px] italic leading-snug text-teal-dark/85">
                  Rollout notes — {f.rolloutNotes}
                </p>
              ) : null}
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-charcoal/40">
                  Governance overrides ·
                </span>
                {f.allowOverrideRoles.map((role) => (
                  <span
                    key={role}
                    className="rounded-md border border-cream-dark/70 bg-cream-mid/25 px-2 py-0.5 text-[11px] font-semibold text-charcoal"
                  >
                    {role}
                  </span>
                ))}
              </div>
              {(f.updatedBy || f.updatedAt) && (
                <p className="mt-4 text-[11px] font-medium text-charcoal/45">
                  {f.updatedBy ? (
                    <>
                      Last moved by <span className="text-charcoal/70">{f.updatedBy}</span>
                    </>
                  ) : (
                    <>Last refreshed</>
                  )}
                  {f.updatedAt ? (
                    <>
                      {" "}
                      ·{" "}
                      {new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(
                        new Date(f.updatedAt)
                      )}
                    </>
                  ) : null}
                </p>
              )}
            </div>
            <div className="flex shrink-0 flex-row items-center justify-between gap-3 sm:flex-col sm:items-end sm:justify-start">
              <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-charcoal/40 sm:hidden">
                Enabled
              </span>
              <GovernanceSwitch
                checked={f.enabled}
                labelledBy={`feature-${f.key}`}
                busy={busyKey === f.key}
                onToggle={() => void applyToggle(f.key, !f.enabled)}
              />
            </div>
          </li>
        ))}
      </ul>
      <p className="text-[11px] leading-relaxed text-charcoal/45">
        Storefront, cart, and checkout stay available for everyone; only the richer signed-in nook responds to{" "}
        <span className="font-semibold text-charcoal/60">customer platform</span> here.
      </p>
    </div>
  );
}
