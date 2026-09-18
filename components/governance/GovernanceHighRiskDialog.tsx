"use client";

import { useEffect, useId, useState } from "react";
import type { GovernanceControlKey } from "@/lib/governance/controlKeys";
import { GOVERNANCE_CONTROL_DEFINITIONS } from "@/lib/governance/controlKeys";

export type GovernanceHighRiskDialogProps = {
  open: boolean;
  controlKey: GovernanceControlKey;
  activatingRestriction: boolean;
  busy?: boolean;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
};

export default function GovernanceHighRiskDialog({
  open,
  controlKey,
  activatingRestriction,
  busy = false,
  onConfirm,
  onCancel,
}: GovernanceHighRiskDialogProps) {
  const reasonId = useId();
  const [reason, setReason] = useState("");
  const def = GOVERNANCE_CONTROL_DEFINITIONS[controlKey];

  useEffect(() => {
    if (!open) setReason("");
  }, [open]);

  if (!open) return null;

  const impact = activatingRestriction ? def.blockedDescription : def.activeDescription;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-charcoal/40 px-4"
      role="presentation"
      onClick={() => !busy && onCancel()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${reasonId}-title`}
        className="w-full max-w-lg rounded-2xl border border-charcoal/15 bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <p id={`${reasonId}-title`} className="font-display text-lg text-teal-dark tracking-tight">
          Confirm {activatingRestriction ? "block" : "restore"} · {def.title}
        </p>
        <p className="mt-3 text-[13px] leading-relaxed text-charcoal/70">
          <span className="font-semibold text-charcoal">Impact · </span>
          {impact}
        </p>
        <p className="mt-2 text-[12px] text-charcoal/55">
          Enforcement layers · {def.enforcementLayers.join(", ").replaceAll("_", " ")}
        </p>
        <label className="mt-5 block text-[12px] font-semibold uppercase tracking-[0.14em] text-charcoal/50">
          Audit reason (required)
          <textarea
            id={reasonId}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            className="mt-2 w-full rounded-xl border border-cream-dark bg-cream/40 px-3 py-2 text-[13px] font-normal normal-case tracking-normal text-charcoal placeholder:text-charcoal/40"
            placeholder="Why is this change needed right now?"
            disabled={busy}
          />
        </label>
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={onCancel}
            className="rounded-xl border border-cream-dark px-4 py-2 text-[13px] font-semibold text-charcoal/70 hover:bg-cream-mid/50 disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={busy || reason.trim().length < 8}
            onClick={() => onConfirm(reason.trim())}
            className="rounded-xl border border-red/35 bg-red/[0.08] px-4 py-2 text-[13px] font-semibold text-red-dark hover:bg-red/[0.12] disabled:opacity-60"
          >
            {busy ? "Saving…" : "Confirm change"}
          </button>
        </div>
      </div>
    </div>
  );
}
