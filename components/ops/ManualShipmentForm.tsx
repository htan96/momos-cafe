"use client";

import { useState } from "react";

export default function ManualShipmentForm({
  groupOptions,
}: {
  groupOptions: { id: string; label: string }[];
}) {
  const [fulfillmentGroupId, setFulfillmentGroupId] = useState(groupOptions[0]?.id ?? "");
  const [carrier, setCarrier] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/ops/shipping/manual", {
        method: "POST",
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
    return (
      <p className="text-[12px] text-[#c9bba8]/75 border border-dashed border-[#3d3830] rounded-lg p-4">
        No shipping-class fulfillment groups — sync catalog orders first.
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="rounded-lg border border-[#3d3830] bg-[#252119] p-4 space-y-3">
      <h3 className="text-[13px] font-semibold text-[#f5e5c0]">Manual tracking</h3>
      <p className="text-[12px] text-[#c9bba8]/80">
        Persists to <code className="text-[#8FC4C4]/90">Shipment</code> (joined on fulfillment group).
      </p>
      <label className="block text-[12px]">
        <span className="text-[#c9bba8]/70 uppercase tracking-wide text-[11px]">Fulfillment group</span>
        <select
          required
          value={fulfillmentGroupId}
          onChange={(e) => setFulfillmentGroupId(e.target.value)}
          className="mt-1 w-full rounded-md border border-[#3d3830] bg-[#1c1916] px-3 py-2 text-[13px]"
        >
          {groupOptions.map((g) => (
            <option key={g.id} value={g.id}>
              {g.label}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-[12px]">
        <span className="text-[#c9bba8]/70 uppercase tracking-wide text-[11px]">Carrier</span>
        <input
          value={carrier}
          onChange={(e) => setCarrier(e.target.value)}
          className="mt-1 w-full rounded-md border border-[#3d3830] bg-[#1c1916] px-3 py-2 text-[13px]"
          placeholder="USPS, UPS, …"
        />
      </label>
      <label className="block text-[12px]">
        <span className="text-[#c9bba8]/70 uppercase tracking-wide text-[11px]">Tracking #</span>
        <input
          required
          value={trackingNumber}
          onChange={(e) => setTrackingNumber(e.target.value)}
          className="mt-1 w-full rounded-md border border-[#3d3830] bg-[#1c1916] px-3 py-2 text-[13px]"
        />
      </label>
      <label className="block text-[12px]">
        <span className="text-[#c9bba8]/70 uppercase tracking-wide text-[11px]">Notes</span>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="mt-1 w-full rounded-md border border-[#3d3830] bg-[#1c1916] px-3 py-2 text-[13px]"
        />
      </label>
      {msg ? <p className="text-[12px] text-[#8FC4C4]">{msg}</p> : null}
      <button
        type="submit"
        disabled={busy}
        className="rounded-md bg-[#2f6d66] px-4 py-2 text-[13px] font-semibold hover:bg-[#276058] disabled:opacity-60"
      >
        {busy ? "Saving…" : "Save shipment"}
      </button>
    </form>
  );
}
