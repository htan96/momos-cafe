"use client";

import { useCallback, useEffect, useState } from "react";

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
    [flags, optimistic]
  );

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="text-[11px] uppercase tracking-[0.26em] text-teal-dark font-semibold">Site controls</p>
        <h1 className="font-display text-3xl text-charcoal tracking-tight">Maintenance mode</h1>
        <p className="text-[15px] text-charcoal/72 max-w-2xl leading-relaxed">
          When a toggle is on, customers can use that part of the site. Turning it off shows a maintenance
          overlay on the matching pages and blocks checkout APIs that would touch that side of the house.
        </p>
      </header>

      {error ? (
        <div
          role="alert"
          className="rounded-xl border-2 border-red/35 bg-red/8 px-4 py-3 text-sm text-charcoal"
        >
          {error}
        </div>
      ) : null}

      <div className="rounded-2xl border-2 border-cream-dark bg-white/95 p-6 shadow-sm space-y-6">
        {loading ? (
          <p className="text-sm text-charcoal/60">Loading…</p>
        ) : (
          <>
            <label className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-cream-dark bg-cream/50 px-4 py-4 cursor-pointer">
              <div>
                <p className="font-semibold text-charcoal">Shop (retail)</p>
                <p className="text-[13px] text-charcoal/65 mt-1 max-w-xl">
                  Covers <code className="text-[12px]">/shop</code>, shop bag lines, shipping quotes, and
                  mixed checkout that includes retail items.
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

            <label className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-cream-dark bg-cream/50 px-4 py-4 cursor-pointer">
              <div>
                <p className="font-semibold text-charcoal">Menu (café ordering)</p>
                <p className="text-[13px] text-charcoal/65 mt-1 max-w-xl">
                  Covers <code className="text-[12px]">/menu</code>, <code className="text-[12px]">/order</code>,
                  and any cart lines for kitchen pickup.
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

            <p className="text-[12px] text-charcoal/50">
              {saving ? "Saving…" : "Changes apply within about a minute on cached reads, or immediately after navigation."}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
