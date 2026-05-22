"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const KIND_OPTIONS = [
  "GENERAL",
  "SUPPORT_HANDOFF",
  "REFUND_ESCALATION",
  "SHIPMENT_NOTE",
] as const;

export default function OrderConsoleCommunicationsNoteForm({
  commerceOrderId,
  canWrite,
}: {
  commerceOrderId: string;
  canWrite: boolean;
}) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [kind, setKind] = useState<(typeof KIND_OPTIONS)[number]>("GENERAL");
  const [supportIssueId, setSupportIssueId] = useState("");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  if (!canWrite) {
    return (
      <p className="text-[12px] text-charcoal/55 rounded-lg border border-dashed border-cream-dark/50 bg-charcoal/[0.02] p-3">
        Internal notes require <span className="font-mono">communications:write</span> or{" "}
        <span className="font-mono">support:write</span> on your ops posture.
      </p>
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFeedback(null);
    setBusy(true);
    try {
      const res = await fetch("/api/ops/communications/notes", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          commerceOrderId,
          kind,
          body,
          ...(supportIssueId.trim() ? { supportIssueId: supportIssueId.trim() } : {}),
        }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setFeedback(json.error ?? `save_failed_${res.status}`);
        return;
      }
      setBody("");
      setSupportIssueId("");
      router.refresh();
    } catch {
      setFeedback("network_error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3 rounded-lg border border-cream-dark/45 bg-cream-mid/10 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="text-[11px] font-semibold uppercase tracking-[0.1em] text-charcoal/45">Kind</label>
        <select
          value={kind}
          onChange={(ev) => setKind(ev.target.value as (typeof KIND_OPTIONS)[number])}
          className="rounded-md border border-cream-dark/50 bg-white px-2 py-1 text-[12px] text-charcoal"
        >
          {KIND_OPTIONS.map((k) => (
            <option key={k} value={k}>
              {k.replaceAll("_", " ")}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="text-[11px] font-semibold uppercase tracking-[0.1em] text-charcoal/45 block mb-1">
          Optional support issue id
        </label>
        <input
          value={supportIssueId}
          onChange={(ev) => setSupportIssueId(ev.target.value)}
          placeholder="c… (OperationalSupportIssue)"
          className="w-full rounded-md border border-cream-dark/50 bg-white px-2 py-1.5 text-[12px] font-mono text-charcoal"
        />
      </div>
      <div>
        <label className="text-[11px] font-semibold uppercase tracking-[0.1em] text-charcoal/45 block mb-1">Body</label>
        <textarea
          value={body}
          onChange={(ev) => setBody(ev.target.value)}
          rows={4}
          className="w-full rounded-md border border-cream-dark/50 bg-white px-2 py-2 text-[13px] text-charcoal"
          placeholder="Markdown or plain text — internal by default."
          required
        />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={busy || !body.trim()}
          className="rounded-lg border border-teal-dark/60 bg-teal-dark px-3 py-1.5 text-[12px] font-semibold text-white shadow-sm transition hover:bg-teal-dark/90 disabled:opacity-50"
        >
          {busy ? "Saving…" : "Save internal note"}
        </button>
        {feedback ? <span className="text-[12px] text-amber-800">{feedback}</span> : null}
      </div>
    </form>
  );
}
