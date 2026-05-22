"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * Applies `PATCH /api/ops/fulfillment/[groupId]/transition` with `action: "confirm_fulfillment"`.
 */
export default function ConfirmFulfillmentButton({
  orderId,
  groupId,
  pipeline,
  canFulfillmentWrite,
  fulfillmentApprovedAt,
  variant = "default",
}: {
  orderId: string;
  groupId: string;
  pipeline: string;
  canFulfillmentWrite: boolean;
  fulfillmentApprovedAt: Date | string | null | undefined;
  variant?: "default" | "ops";
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const muted =
    variant === "ops" ?
      "text-[12px] text-[#c9bba8]/55"
    : "text-[12px] text-charcoal/50";

  if (!canFulfillmentWrite) {
    return null;
  }

  if (pipeline.trim().toUpperCase() !== "RETAIL") {
    return null;
  }

  if (fulfillmentApprovedAt) {
    return (
      <p className={variant === "ops" ? "text-[11px] text-[#8FC4C4]/90" : "text-[11px] text-teal-dark/95"}>
        Fulfillment confirmed{" "}
        <time dateTime={new Date(fulfillmentApprovedAt).toISOString()}>
          {new Date(fulfillmentApprovedAt).toLocaleString()}
        </time>
      </p>
    );
  }

  async function confirm(): Promise<void> {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/ops/fulfillment/${encodeURIComponent(groupId)}/transition`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, action: "confirm_fulfillment" }),
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
    <div className="space-y-1.5">
      <button
        type="button"
        disabled={busy}
        onClick={() => void confirm()}
        className={
          variant === "ops" ?
            "rounded-md border border-[#92733a]/55 bg-[#2b241d]/95 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#f5cfa3]/95 hover:border-[#92733a]/80 disabled:opacity-50"
          : "rounded-lg border border-amber-900/38 bg-amber-50 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-amber-950 hover:bg-amber-100 disabled:opacity-50"
        }
      >
        {busy ? "Confirming…" : "Confirm fulfillment"}
      </button>
      {msg ?
        <p className={variant === "ops" ? "text-[12px] text-[#e8a0a0]/95" : "text-[12px] text-red-700"}>{msg}</p>
      : null}
      <p className={muted}>
        Required gate when{" "}
        <span className="font-mono">SHIPPO_REQUIRE_FULFILLMENT_APPROVAL=true</span> — unlocks carrier label purchase.
      </p>
    </div>
  );
}
