"use client";

import { useState } from "react";
import type { GovernanceControlCategory, GovernanceControlKey } from "@/lib/governance/controlKeys";
import { GOVERNANCE_CONTROL_DEFINITIONS } from "@/lib/governance/controlKeys";

export type GovernanceControlBootstrap = {
  key: GovernanceControlKey;
  category: GovernanceControlCategory;
  title: string;
  description: string | null;
  enabled: boolean;
  updatedAt: string;
  lastModifiedBy: string | null;
};

const CATEGORY_ORDER: GovernanceControlCategory[] = ["emergency", "commerce", "access", "content"];

const CATEGORY_LABEL: Record<GovernanceControlCategory, string> = {
  emergency: "Emergency",
  commerce: "Commerce",
  access: "Access",
  content: "Content",
};

function ControlSwitch({
  checked,
  labelledBy,
  busy,
  onToggle,
  danger,
}: {
  checked: boolean;
  labelledBy: string;
  busy: boolean;
  onToggle: () => void;
  danger: boolean;
}) {
  const onStyle = danger
    ? "border-red/40 bg-red/[0.08]"
    : "border-amber-800/35 bg-amber-900/[0.08]";
  const offStyle = "border-cream-dark bg-cream-mid/50";
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-busy={busy}
      disabled={busy}
      onClick={() => void onToggle()}
      className={`relative inline-flex h-8 w-[52px] shrink-0 cursor-pointer rounded-full border transition-colors disabled:opacity-65 disabled:cursor-wait ${
        checked ? onStyle : offStyle
      }`}
      aria-labelledby={labelledBy}
    >
      <span
        className={`pointer-events-none inline-block h-[26px] w-[26px] translate-y-[2px] rounded-full shadow-sm bg-white transition ${
          checked ? "translate-x-[24px]" : "translate-x-[2px]"
        }`}
      />
    </button>
  );
}

export default function GovernanceControlsPanel({ initial }: { initial: GovernanceControlBootstrap[] }) {
  const [controls, setControls] = useState(initial);
  const [busyKey, setBusyKey] = useState<GovernanceControlKey | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function applyToggle(controlKey: GovernanceControlKey, enabled: boolean) {
    const prevSnapshot = [...controls];
    setControls((list) =>
      list.map((c) =>
        c.key === controlKey
          ? { ...c, enabled, updatedAt: new Date().toISOString(), lastModifiedBy: c.lastModifiedBy }
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
        body: JSON.stringify({ updates: { [controlKey]: enabled } }),
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
    }
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
        Restrictions are enforced server-side immediately (403 responses on commerce/auth routes). Maintenance and menu
        flags write through to `AppSetting` so existing storefront overlays keep working.
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
                const danger = c.key === "maintenance_mode" || c.key === "checkout_disabled";
                return (
                  <li
                    key={c.key}
                    className="flex flex-col gap-4 px-4 py-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6 sm:px-5"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p id={`gov-${c.key}`} className="text-[15px] font-semibold text-teal-dark">
                          {c.title}
                        </p>
                        <code className="rounded bg-cream-dark/45 px-1.5 py-0.5 text-[10px] font-mono text-charcoal/70">
                          {c.key}
                        </code>
                      </div>
                      <p className="mt-2 text-[13px] leading-relaxed text-charcoal/65">
                        {c.description ?? def.description}
                      </p>
                      {(c.lastModifiedBy || c.updatedAt) && (
                        <p className="mt-3 text-[11px] font-medium text-charcoal/45">
                          {c.lastModifiedBy ? (
                            <>
                              Last change · <span className="text-charcoal/65">{c.lastModifiedBy}</span>
                            </>
                          ) : (
                            <>Last change</>
                          )}
                          {c.updatedAt ? (
                            <>
                              {" "}
                              ·{" "}
                              {new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(
                                new Date(c.updatedAt)
                              )}
                            </>
                          ) : null}
                        </p>
                      )}
                    </div>
                    <div className="flex shrink-0 flex-row items-center justify-between gap-3 sm:flex-col sm:items-end">
                      <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-charcoal/40 sm:hidden">
                        {c.enabled ? "Active" : "Off"}
                      </span>
                      <ControlSwitch
                        checked={c.enabled}
                        labelledBy={`gov-${c.key}`}
                        busy={busyKey === c.key}
                        danger={danger}
                        onToggle={() => void applyToggle(c.key, !c.enabled)}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
