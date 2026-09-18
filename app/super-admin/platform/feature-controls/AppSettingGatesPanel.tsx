"use client";

import { useCallback, useEffect, useState } from "react";
import GovernanceStatusCard from "@/components/governance/GovernanceStatusCard";

type GateKey = "ShopEnabled" | "MenuEnabled";

type GateRow = {
  key: GateKey;
  title: string;
  gateEnabled: boolean;
  activeDescription: string;
  blockedDescription: string;
  updatedAt: string | null;
  updatedBy: string | null;
};

const GATE_DEFS: Record<
  GateKey,
  { title: string; activeDescription: string; blockedDescription: string; patchField: "shopEnabled" | "menuEnabled" }
> = {
  ShopEnabled: {
    title: "Retail shop gate",
    activeDescription: "Retail shop surfaces are open to guests.",
    blockedDescription: "Retail shop is closed — maintenance overlay applies.",
    patchField: "shopEnabled",
  },
  MenuEnabled: {
    title: "Café menu gate",
    activeDescription: "Café menu and kitchen ordering surfaces are open.",
    blockedDescription: "Café menu is closed — maintenance overlay applies.",
    patchField: "menuEnabled",
  },
};

export default function AppSettingGatesPanel() {
  const [gates, setGates] = useState<GateRow[] | null>(null);
  const [busyKey, setBusyKey] = useState<GateKey | null>(null);
  const [error, setError] = useState<string | null>(null);

  const hydrate = useCallback(async () => {
    setError(null);
    const res = await fetch("/api/admin/app-settings", { cache: "no-store", credentials: "include" });
    if (!res.ok) {
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(j.error ?? `Request failed (${res.status})`);
    }
    const data = (await res.json()) as {
      shopEnabled: boolean;
      menuEnabled: boolean;
      lastUpdated?: { shop: string | null; menu: string | null };
      updatedBy?: { shop: string | null; menu: string | null };
    };
    setGates([
      {
        key: "ShopEnabled",
        title: GATE_DEFS.ShopEnabled.title,
        gateEnabled: data.shopEnabled,
        activeDescription: GATE_DEFS.ShopEnabled.activeDescription,
        blockedDescription: GATE_DEFS.ShopEnabled.blockedDescription,
        updatedAt: data.lastUpdated?.shop ?? null,
        updatedBy: data.updatedBy?.shop ?? null,
      },
      {
        key: "MenuEnabled",
        title: GATE_DEFS.MenuEnabled.title,
        gateEnabled: data.menuEnabled,
        activeDescription: GATE_DEFS.MenuEnabled.activeDescription,
        blockedDescription: GATE_DEFS.MenuEnabled.blockedDescription,
        updatedAt: data.lastUpdated?.menu ?? null,
        updatedBy: data.updatedBy?.menu ?? null,
      },
    ]);
  }, []);

  useEffect(() => {
    void hydrate().catch((e) => setError(e instanceof Error ? e.message : "Could not load gates"));
  }, [hydrate]);

  async function applyGate(key: GateKey, gateEnabled: boolean) {
    if (!gates) return;
    const def = GATE_DEFS[key];
    const prev = [...gates];
    setGates((list) =>
      list?.map((g) => (g.key === key ? { ...g, gateEnabled, updatedAt: new Date().toISOString() } : g)) ?? null
    );
    setError(null);
    try {
      setBusyKey(key);
      const res = await fetch("/api/admin/app-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ [def.patchField]: gateEnabled }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
        throw new Error(j.message ?? j.error ?? `Save failed (${res.status})`);
      }
      await hydrate();
    } catch (e) {
      setGates(prev);
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusyKey(null);
    }
  }

  if (!gates) {
    return <p className="text-sm text-charcoal/60">{error ? error : "Loading maintenance gates…"}</p>;
  }

  return (
    <div className="space-y-3">
      {error ? (
        <p className="rounded-xl border border-red/30 bg-red/[0.05] px-4 py-3 text-[13px] font-medium text-red-dark" role="alert">
          {error}
        </p>
      ) : null}
      <ul className="divide-y divide-cream-dark/50 overflow-hidden rounded-2xl border border-cream-dark/60 bg-white/70">
        {gates.map((g) => (
          <GovernanceStatusCard
            key={g.key}
            title={g.title}
            status={g.gateEnabled ? "ACTIVE" : "BLOCKED"}
            statusDescription={g.gateEnabled ? g.activeDescription : g.blockedDescription}
            metaKey={g.key}
            riskLevel="high"
            enforcementLayers={["maintenance_system"]}
            blockingLayerLabels={g.gateEnabled ? [] : ["Maintenance system"]}
            lastModifiedAt={g.updatedAt}
            lastModifiedBy={g.updatedBy}
            actionLabel={g.gateEnabled ? "Close gate" : "Open gate"}
            actionVariant={g.gateEnabled ? "danger" : "primary"}
            actionBusy={busyKey === g.key}
            onAction={() => void applyGate(g.key, !g.gateEnabled)}
          />
        ))}
      </ul>
    </div>
  );
}
