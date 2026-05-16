"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * Calls existing `POST /api/ops/shipping/purchase-label` (ops session + `shipping:write`).
 * Super-admins authenticated via Cognito use the same ops session as the staff console.
 */
export default function OpsPurchaseShippoLabelButton({
  shipmentId,
  rateIdPresent,
}: {
  shipmentId: string;
  rateIdPresent: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  if (!rateIdPresent) return null;

  async function purchase(): Promise<void> {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/ops/shipping/purchase-label", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shipmentId }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
      if (!res.ok) {
        setMsg(data.message ?? data.error ?? `HTTP ${res.status}`);
        return;
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => void purchase()}
        disabled={busy}
        className="rounded-lg border border-teal-dark/40 bg-teal-dark/10 px-3 py-1.5 text-[12px] font-semibold text-teal-dark shadow-sm transition hover:bg-teal-dark/15 disabled:opacity-60"
      >
        {busy ? "Purchasing label…" : "Purchase Shippo label"}
      </button>
      {msg ? <p className="text-[12px] text-charcoal/70">{msg}</p> : null}
    </div>
  );
}
