"use client";

import { useState } from "react";

export default function ManualShipmentForm({
  groupOptions,
  theme = "admin",
}: {
  groupOptions: { id: string; label: string }[];
  theme?: "admin" | "dark";
}) {
  const [fulfillmentGroupId, setFulfillmentGroupId] = useState(groupOptions[0]?.id ?? "");
  const [carrier, setCarrier] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const panel =
    theme === "dark" ?
      "rounded-lg border border-[#3d3830] bg-[#252119] p-4 space-y-3"
    : "rounded-xl border border-cream-dark/70 bg-white/90 p-4 space-y-3 shadow-[0_1px_2px_rgb(41_53_61/0.04)]";
  const labelCn =
    theme === "dark" ?
      "text-[#c9bba8]/70 uppercase tracking-wide text-[11px]"
    : "text-[11px] text-charcoal/45 font-semibold uppercase tracking-[0.12em]";
  const inputCn =
    theme === "dark" ?
      "mt-1 w-full rounded-md border border-[#3d3830] bg-[#1c1916] px-3 py-2 text-[13px]"
    : "mt-1 w-full rounded-lg border border-cream-dark/80 bg-white px-3 py-2 text-[13px]";
  const heading = theme === "dark" ? "text-[13px] font-semibold text-[#f5e5c0]" : "font-semibold text-charcoal";
  const helper = theme === "dark" ? "text-[12px] text-[#c9bba8]/80" : "text-[12px] text-charcoal/70";
  const emptyNotice =
    theme === "dark"
      ? "text-[12px] text-[#c9bba8]/75 border border-dashed border-[#3d3830] rounded-lg p-4"
      : "text-[12px] text-charcoal/60 border border-dashed border-charcoal/[0.12] rounded-xl p-4 bg-cream/40";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/ops/shipping/manual", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fulfillmentGroupId,
          carrier: carrier || undefined,
          trackingNumber,
          notes: notes || undefined,
          status: "pending",
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setMsg(data.error ?? "Save failed");
        return;
      }
      setMsg("Saved shipment row.");
      setTrackingNumber("");
      setNotes("");
    } finally {
      setBusy(false);
    }
  }

  if (groupOptions.length === 0) {
    return <p className={emptyNotice}>No shipping-class fulfillment groups.</p>;
  }

  const outerLabelCn =
    theme === "dark" ? "block text-[12px] text-[#d8cbc0]/92" : "block text-[12px] text-charcoal/82";

  return (
    <form onSubmit={submit} className={panel}>
      <h3 className={heading}>Manual tracking</h3>
      <p className={helper}>Persists a new <span className="font-mono">Shipment</span> row on the group.</p>
      <label className={outerLabelCn}>
        <span className={labelCn}>Fulfillment group</span>
        <select
          required
          value={fulfillmentGroupId}
          onChange={(e) => setFulfillmentGroupId(e.target.value)}
          className={inputCn}
        >
          {groupOptions.map((g) => (
            <option key={g.id} value={g.id}>
              {g.label}
            </option>
          ))}
        </select>
      </label>
      <label className={outerLabelCn}>
        <span className={labelCn}>Carrier</span>
        <input value={carrier} onChange={(e) => setCarrier(e.target.value)} className={inputCn} placeholder="UPS" />
      </label>
      <label className={outerLabelCn}>
        <span className={labelCn}>Tracking number</span>
        <input required value={trackingNumber} onChange={(e) => setTrackingNumber(e.target.value)} className={inputCn} />
      </label>
      <label className={outerLabelCn}>
        <span className={labelCn}>Notes</span>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className={`${inputCn} min-h-[72px]`} />
      </label>
      <button
        type="submit"
        disabled={busy}
        className={
          theme === "dark" ?
            "w-full rounded-md border border-[#2f6d66]/48 bg-[#1c2826]/90 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#f5e5c0]/95 hover:border-[#2f6d66]/72 disabled:opacity-50"
          : "w-full rounded-lg border border-teal-dark/35 bg-teal/[0.08] px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-teal-dark hover:bg-teal/15 disabled:opacity-60"
        }
      >
        {busy ? "Saving…" : "Save shipment row"}
      </button>
      {msg ? <p className={theme === "dark" ? "text-[11px] text-[#c9bba8]" : "text-[11px] text-charcoal/70"}>{msg}</p> : null}
    </form>
  );
}
