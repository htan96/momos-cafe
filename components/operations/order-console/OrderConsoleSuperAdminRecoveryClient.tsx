"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/** Super-admin JSON recovery routes (`getCognitoServerSession` gate). */
export default function OrderConsoleSuperAdminRecoveryClient({
  commerceOrderId,
  showCatalogSyncHint,
}: {
  commerceOrderId: string;
  /** Surface catalog sync when retail lines exist — heuristic for operators. */
  showCatalogSyncHint: boolean;
}) {
  const router = useRouter();
  const [payBusy, setPayBusy] = useState(false);
  const [catalogBusy, setCatalogBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function squareLookup(): Promise<void> {
    setPayBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/super-admin/operations/recovery/square-payment-lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commerceOrderId }),
      });
      const data = (await res.json().catch(() => ({}))) as { message?: string; error?: string; code?: string };
      if (!res.ok) {
        setMsg(data.message ?? data.error ?? data.code ?? `HTTP ${res.status}`);
        return;
      }
      router.refresh();
    } finally {
      setPayBusy(false);
    }
  }

  async function catalogSync(): Promise<void> {
    setCatalogBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/super-admin/operations/recovery/catalog-sync", { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as { message?: string; error?: string };
      if (!res.ok) {
        setMsg(data.message ?? data.error ?? `HTTP ${res.status}`);
        return;
      }
      router.refresh();
    } finally {
      setCatalogBusy(false);
    }
  }

  return (
    <div className="space-y-3 text-[13px] text-charcoal/80">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={payBusy}
          onClick={() => void squareLookup()}
          className="rounded-lg border border-cream-dark/60 bg-white px-3 py-1.5 text-[12px] font-semibold text-charcoal/80 shadow-sm transition hover:bg-cream-mid/40 disabled:opacity-50"
        >
          {payBusy ? "Reconciling…" : "Square payment reconcile"}
        </button>
        {showCatalogSyncHint ? (
          <button
            type="button"
            disabled={catalogBusy}
            onClick={() => void catalogSync()}
            className="rounded-lg border border-cream-dark/60 bg-white px-3 py-1.5 text-[12px] font-semibold text-charcoal/80 shadow-sm transition hover:bg-cream-mid/40 disabled:opacity-50"
          >
            {catalogBusy ? "Sync running…" : "Rerun catalog sync"}
          </button>
        ) : null}
      </div>
      <p className="text-[11px] text-charcoal/50 leading-relaxed">
        Both POST routes require the super-admin Cognito group and emit governance / platform audit artifacts.
      </p>
      {msg ? <p className="text-[12px] text-red-700/90">{msg}</p> : null}
    </div>
  );
}
