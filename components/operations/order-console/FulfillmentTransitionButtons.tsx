"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { FulfillmentPipeline } from "@/types/commerce";
import { validateFulfillmentTransition } from "@/lib/commerce/orderLifecycle";

const KITCHEN_TARGETS = ["ready_for_pickup", "completed"] as const;
const RETAIL_TARGETS = ["merch_processing", "shipped"] as const;

export default function FulfillmentTransitionButtons({
  orderId,
  groupId,
  pipeline,
  status,
  canFulfillmentWrite,
  variant = "default",
}: {
  orderId: string;
  groupId: string;
  pipeline: FulfillmentPipeline;
  status: string;
  canFulfillmentWrite: boolean;
  /** `ops` — dark console styling for `/ops/*` surfaces. */
  variant?: "default" | "ops";
}) {
  const router = useRouter();
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const disabledCopy =
    variant === "ops"
      ? "text-[12px] text-[#c9bba8]/55"
      : "text-[12px] text-charcoal/50";
  const emptyCopy = variant === "ops" ? disabledCopy : "text-[12px] text-charcoal/50";

  if (!canFulfillmentWrite) {
    return <p className={disabledCopy}>Fulfillment transitions are read-only for this session.</p>;
  }

  const targets =
    pipeline === "KITCHEN"
      ? KITCHEN_TARGETS
      : RETAIL_TARGETS;

  const allowed = [...targets].filter(
    (t) => validateFulfillmentTransition(pipeline, status, t).ok
  );

  if (!allowed.length) {
    return <p className={emptyCopy}>No scripted transitions apply from `{status}` for {pipeline}.</p>;
  }

  async function transition(nextStatus: string) {
    setBusyKey(nextStatus);
    setMsg(null);
    try {
      const res = await fetch(`/api/ops/fulfillment/${encodeURIComponent(groupId)}/transition`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, status: nextStatus }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; reason?: string; message?: string };
      if (!res.ok) {
        setMsg(data.reason ?? data.message ?? data.error ?? `HTTP ${res.status}`);
        return;
      }
      router.refresh();
    } finally {
      setBusyKey(null);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {allowed.map((target) => (
          <button
            key={target}
            type="button"
            disabled={busyKey !== null}
            onClick={() => void transition(target)}
            className={
              variant === "ops"
                ? "rounded-md border border-[#2f6d66]/45 bg-[#1c2826]/90 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#f5e5c0]/95 transition hover:border-[#2f6d66]/70 hover:bg-[#234240]/60 disabled:opacity-50"
                : "rounded-lg border border-cream-dark/60 bg-white px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-charcoal/80 shadow-sm transition hover:bg-cream-mid/35 disabled:opacity-50"
            }
          >
            {busyKey === target ? "Working…" : target.replace(/_/g, " ")}
          </button>
        ))}
      </div>
      {msg ? (
        <p className={variant === "ops" ? "text-[12px] text-[#e8a0a0]/95" : "text-[12px] text-red-700/90"}>{msg}</p>
      ) : null}
    </div>
  );
}
