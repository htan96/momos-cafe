"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * Calls `POST /api/ops/shipping/purchase-label` (staff Cognito cookie session + `shipping:write`).
 * When **`fulfillmentApprovalRequired`** is enabled server-side (`SHIPPO_REQUIRE_FULFILLMENT_APPROVAL=true`),
 * purchase stays disabled until the RETAIL fulfillment group carries `fulfillmentApprovedAt`.
 */
export default function OpsPurchaseShippoLabelButton({
  shipmentId,
  rateIdPresent,
  fulfillmentApprovalRequired,
  fulfillmentApprovedAt,
}: {
  shipmentId: string;
  rateIdPresent: boolean;
  fulfillmentApprovalRequired: boolean;
  fulfillmentApprovedAt: Date | string | null | undefined;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  if (!rateIdPresent) return null;

  const approved = Boolean(fulfillmentApprovedAt);
  const gatedBlocked = fulfillmentApprovalRequired && !approved;

  async function purchase(): Promise<void> {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/ops/shipping/purchase-label", {
        method: "POST",
        credentials: "include",
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
      {fulfillmentApprovalRequired ?
        approved ?
          <p className="text-[11px] text-teal-dark/90">
            Fulfillment confirmation recorded — carrier purchase allowed.
          </p>
        : <p className="text-[11px] text-charcoal/60">
            <span className="font-semibold text-charcoal/75">Carrier purchase blocked:</span> confirm fulfillment on this
            retail group before buying the label.
          </p>
      : (
        <p className="text-[11px] text-charcoal/45">
          Two-step fulfillment confirmation is optional — toggle{" "}
          <span className="font-mono">SHIPPO_REQUIRE_FULFILLMENT_APPROVAL</span> when you want a staff gate.
        </p>
      )}
      <button
        type="button"
        onClick={() => void purchase()}
        disabled={busy || gatedBlocked}
        className="rounded-lg border border-teal-dark/40 bg-teal-dark/10 px-3 py-1.5 text-[12px] font-semibold text-teal-dark shadow-sm transition hover:bg-teal-dark/15 disabled:opacity-40"
      >
        {busy ? "Purchasing label…" : "Purchase Shippo label"}
      </button>
      {msg ? <p className="text-[12px] text-charcoal/70">{msg}</p> : null}
    </div>
  );
}
