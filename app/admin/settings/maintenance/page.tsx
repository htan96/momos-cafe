"use client";

import { useCallback, useEffect, useState } from "react";
import OpsPageHeader from "@/components/operations/OpsPageHeader";
import OpsPanel from "@/components/operations/OpsPanel";

type Flags = {
  shopEnabled: boolean;
  menuEnabled: boolean;
};

export default function AdminMaintenanceSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [flags, setFlags] = useState<Flags>({ shopEnabled: true, menuEnabled: true });
  const [optimistic, setOptimistic] = useState<Flags | null>(null);

  const display = optimistic ?? flags;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/app-settings", { cache: "no-store" });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? `Request failed (${res.status})`);
      }
      const data = (await res.json()) as Flags;
      setFlags({
        shopEnabled: data.shopEnabled,
        menuEnabled: data.menuEnabled,
      });
      setOptimistic(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load settings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const persist = useCallback(
    async (patch: Partial<Flags>) => {
      setSaving(true);
      setError(null);
      const previous = optimistic ?? flags;
      const next = { ...previous, ...patch };
      setOptimistic(next);
      try {
        const res = await fetch("/api/admin/app-settings", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        });
        if (!res.ok) {
          const j = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
          throw new Error(j.message ?? j.error ?? `Save failed (${res.status})`);
        }
        const data = (await res.json()) as Flags & { ok?: boolean };
        setFlags({
          shopEnabled: data.shopEnabled,
          menuEnabled: data.menuEnabled,
        });
        setOptimistic(null);
      } catch (e) {
        setOptimistic(null);
        setError(e instanceof Error ? e.message : "Save failed");
      } finally {
        setSaving(false);
      }
    },
    [flags, optimistic],
  );

  return (
    <div className="space-y-8">
      <OpsPageHeader
        title="Maintenance mode"
        subtitle="When a toggle is on, guests can reach that storefront surface. Turning it off shows the maintenance overlay and blocks matching checkout touches."
      />

      <OpsPanel title="Operational impact" eyebrow="Guidance · mock prose">
        <div className="text-[13px] text-charcoal/68 leading-relaxed space-y-2">
          <p>Retail shop spans /shop flows, quotes, and mixed shipments.</p>
          <p>Café menu spans /menu, /order lanes, and kitchen pickup carts.</p>
        </div>
      </OpsPanel>

      {error ? (
        <div
          role="alert"
          className="rounded-xl border border-red/22 bg-red/[0.08] px-4 py-3 text-sm text-charcoal shadow-sm"
        >
          {error}
        </div>
      ) : null}

      <OpsPanel title="Customer-facing switches" eyebrow={saving ? "Saving…" : "Live toggles"}>
        {loading ? (
          <p className="text-sm text-charcoal/60">Loading…</p>
        ) : (
          <>
            <label className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-cream-dark bg-cream/50 px-4 py-4 cursor-pointer hover:bg-cream/70 transition-colors">
              <div>
                <p className="font-semibold text-charcoal">Shop (retail)</p>
                <p className="text-[13px] text-charcoal/65 mt-1 max-w-xl">
                  Covers <code className="text-[12px]">/shop</code>, shop bag lines, shipping quotes, and mixed checkout
                  that includes retail items.
                </p>
              </div>
              <input
                type="checkbox"
                className="h-5 w-5 accent-teal-dark shrink-0"
                checked={display.shopEnabled}
                disabled={saving}
                onChange={(e) => void persist({ shopEnabled: e.target.checked })}
              />
            </label>

            <label className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-cream-dark bg-cream/50 px-4 py-4 mt-6 cursor-pointer hover:bg-cream/70 transition-colors">
              <div>
                <p className="font-semibold text-charcoal">Menu (café ordering)</p>
                <p className="text-[13px] text-charcoal/65 mt-1 max-w-xl">
                  Covers <code className="text-[12px]">/menu</code>, <code className="text-[12px]">/order</code>, and any
                  cart lines for kitchen pickup.
                </p>
              </div>
              <input
                type="checkbox"
                className="h-5 w-5 accent-teal-dark shrink-0"
                checked={display.menuEnabled}
                disabled={saving}
                onChange={(e) => void persist({ menuEnabled: e.target.checked })}
              />
            </label>

            <p className="text-[12px] text-charcoal/50 mt-6">
              {saving ? "Saving…" : "Changes apply within about a minute on cached reads, or immediately after navigation."}
            </p>
          </>
        )}
      </OpsPanel>
    </div>
  );
}
