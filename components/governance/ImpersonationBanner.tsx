"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

type StatusOk = {
  active: true;
  actor: { sub: string; email: string };
  target: { email: string; sub: string | null };
  scope: "customer" | "admin";
};

export default function ImpersonationBanner() {
  const router = useRouter();
  const [data, setData] = useState<StatusOk | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/super-admin/impersonation/status", { credentials: "include" });
      if (!res.ok) {
        setData(null);
        return;
      }
      const j = (await res.json()) as { active?: boolean; actor?: StatusOk["actor"]; target?: StatusOk["target"]; scope?: string };
      if (j.active && j.actor && j.target && (j.scope === "customer" || j.scope === "admin")) {
        setData({ active: true, actor: j.actor, target: j.target, scope: j.scope });
      } else {
        setData(null);
      }
    } catch {
      setData(null);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const exit = useCallback(async () => {
    await fetch("/api/super-admin/impersonation/end", { method: "POST", credentials: "include" });
    setData(null);
    router.refresh();
  }, [router]);

  if (!data) return null;

  return (
    <div
      role="status"
      className="w-full rounded-lg border border-gold/55 bg-charcoal/[0.92] text-cream px-3 py-2.5 mb-3 flex flex-wrap items-center justify-between gap-3 shadow-sm"
    >
      <p className="text-[12px] leading-snug">
        <span className="font-semibold text-gold/95">Impersonation</span>
        {" · "}
        <span className="text-cream/88">{data.actor.email}</span>
        {" → "}
        <span className="text-cream">{data.target.email}</span>
        {" · "}
        <span className="uppercase tracking-wide text-cream/65 text-[11px]">{data.scope}</span>
      </p>
      <button
        type="button"
        className="shrink-0 rounded-md bg-gold/90 px-3 py-1.5 text-[12px] font-semibold text-teal-dark hover:bg-gold"
        onClick={() => void exit()}
      >
        Exit
      </button>
    </div>
  );
}
