"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

type StatusOk = {
  active: true;
  actor: { sub: string; email: string };
  target: { email: string; sub: string | null };
  scope: "customer" | "admin";
  startedAt: string;
  ledgerId?: string;
};

function formatLedgerDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return "—";
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rs = s % 60;
  if (m < 60) return rs ? `${m}m ${rs}s` : `${m}m`;
  const h = Math.floor(m / 60);
  const rm = m % 60;
  return rm ? `${h}h ${rm}m` : `${h}h`;
}

export default function ImpersonationBanner() {
  const router = useRouter();
  const [data, setData] = useState<StatusOk | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/super-admin/impersonation/status", { credentials: "include" });
      if (!res.ok) {
        setData(null);
        return;
      }
      const j = (await res.json()) as {
        active?: boolean;
        actor?: StatusOk["actor"];
        target?: StatusOk["target"];
        scope?: string;
        startedAt?: string;
        ledgerId?: string;
      };
      if (
        j.active &&
        j.actor &&
        j.target &&
        (j.scope === "customer" || j.scope === "admin") &&
        j.startedAt
      ) {
        setData({
          active: true,
          actor: j.actor,
          target: j.target,
          scope: j.scope,
          startedAt: j.startedAt,
          ledgerId: j.ledgerId,
        });
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

  useEffect(() => {
    if (!data) return;
    const id = window.setInterval(() => setNow(Date.now()), 15_000);
    return () => window.clearInterval(id);
  }, [data]);

  const exit = useCallback(async () => {
    await fetch("/api/super-admin/impersonation/end", { method: "POST", credentials: "include" });
    setData(null);
    router.refresh();
  }, [router]);

  if (!data) return null;

  const startedMs = Date.parse(data.startedAt);
  const durationLabel = Number.isFinite(startedMs)
    ? formatLedgerDuration(now - startedMs)
    : "—";

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
        {" · "}
        <span className="text-cream/80">
          Ledger <span className="font-medium text-gold/90">{durationLabel}</span>
        </span>
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
