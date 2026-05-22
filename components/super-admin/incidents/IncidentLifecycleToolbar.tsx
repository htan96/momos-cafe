"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { readIncidentOperatorAssignee } from "@/lib/incidents/readIncidentOperatorAssignee";

export type IncidentToolbarProps = {
  incidentId: string;
  status: string;
  metadata: unknown;
};

export default function IncidentLifecycleToolbar({ incidentId, status, metadata }: IncidentToolbarProps) {
  const [assigneeDraft, setAssigneeDraft] = useState(readIncidentOperatorAssignee(metadata));
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [resolveModal, setResolveModal] = useState(false);
  const [resolveNote, setResolveNote] = useState("");
  const [timelineNoteDraft, setTimelineNoteDraft] = useState("");

  const canAcknowledge = status === "active";

  const scopedFailures = useMemo(
    () =>
      `/super-admin/operations/failures?${new URLSearchParams({ incidentId }).toString()}`,
    [incidentId]
  );

  const scopedLive = useMemo(
    () =>
      `/super-admin/live-activity?${new URLSearchParams({ incidentId }).toString()}`,
    [incidentId]
  );

  const applyPatch = useCallback(
    async (payload: Record<string, unknown>, label: string) => {
      setBusy(label);
      setMessage(null);
      try {
        const res = await fetch(`/api/super-admin/incidents/${encodeURIComponent(incidentId)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(payload),
        });
        const j = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
        if (!res.ok) throw new Error(j.message ?? j.error ?? `${res.status}`);
        setResolveModal(false);
        setResolveNote("");
        window.location.reload();
      } catch (e) {
        setMessage(e instanceof Error ? e.message : String(e));
      } finally {
        setBusy(null);
      }
    },
    [incidentId]
  );

  async function acknowledge() {
    await applyPatch({ status: "investigating" }, "acknowledge");
  }

  async function saveAssigneeOnly() {
    await applyPatch({ assignee: assigneeDraft.trim() || null }, "assignee");
  }

  async function submitResolve() {
    if (resolveNote.trim().length < 4) {
      setMessage("Resolution note requires at least four characters.");
      return;
    }
    await applyPatch({ status: "resolved", note: resolveNote.trim() }, "resolve");
  }

  async function appendResolvedNote() {
    if (timelineNoteDraft.trim().length < 4) {
      setMessage("Timeline notes need at least four characters.");
      return;
    }
    await applyPatch({ note: timelineNoteDraft.trim() }, "timeline-note");
    setTimelineNoteDraft("");
  }

  return (
    <>
      <div className="mt-4 flex flex-col gap-2 border-t border-cream-dark/30 pt-3">
        <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-charcoal/40">
          <span>Correlation</span>
          <Link
            href={scopedFailures}
            className="rounded-md border border-cream-dark bg-white px-2 py-1 font-mono lowercase text-teal-dark normal-case hover:underline tracking-normal font-semibold"
          >
            Failures · incidentId
          </Link>
          <Link
            href={scopedLive}
            className="rounded-md border border-cream-dark bg-white px-2 py-1 font-mono lowercase text-teal-dark normal-case hover:underline tracking-normal font-semibold"
          >
            Live activity · incidentId
          </Link>
        </div>
        <label className="block text-[12px] font-medium text-charcoal/70 mt-2">
          <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-charcoal/45 block mb-1">
            Assignee (free text · not IAM)
          </span>
          <span className="flex flex-wrap items-center gap-2">
            <input
              value={assigneeDraft}
              disabled={busy !== null}
              onChange={(ev) => setAssigneeDraft(ev.target.value)}
              className="flex-1 min-w-[180px] rounded-lg border border-cream-dark px-3 py-1.5 text-[13px] font-mono"
              placeholder="@you / vendor / shift code"
              maxLength={320}
            />
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => void saveAssigneeOnly()}
              className="rounded-lg border border-teal-dark/40 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-teal-dark hover:bg-teal/[0.08]"
            >
              Save assignee
            </button>
          </span>
        </label>

        {status !== "resolved" ?
          <div className="flex flex-wrap gap-2 mt-3">
            {canAcknowledge ?
              <button
                type="button"
                disabled={busy !== null}
                className="rounded-lg bg-teal/[0.12] border border-teal-dark/35 px-3 py-1.5 text-[12px] font-semibold text-teal-dark"
                onClick={() => void acknowledge()}
              >
                {busy === "acknowledge" ? "Acknowledging…" : "Acknowledge → investigating"}
              </button>
            : null}
            {(status === "investigating" || status === "monitoring") ?
              <button
                type="button"
                disabled={busy !== null}
                className="rounded-lg border border-charcoal/25 bg-charcoal px-3 py-1.5 text-[12px] font-semibold text-cream hover:opacity-95"
                onClick={() => {
                  setMessage(null);
                  setResolveModal(true);
                }}
              >
                Resolve…
              </button>
            : null}
          </div>
        : <div className="mt-3 space-y-2 rounded-xl border border-cream-dark/50 bg-white/70 px-3 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-charcoal/45">
              Resolved · metadata timeline note
            </p>
            <textarea
              className="w-full rounded-lg border border-cream-dark/70 px-3 py-2 text-[13px]"
              placeholder="Adds to incident metadata timeline — four characters minimum."
              disabled={busy !== null}
              value={timelineNoteDraft}
              onChange={(ev) => setTimelineNoteDraft(ev.target.value)}
              rows={3}
            />
            <button
              type="button"
              disabled={busy !== null}
              className="rounded-lg border border-teal-dark/35 bg-teal/[0.1] px-3 py-1.5 text-[12px] font-semibold text-teal-dark"
              onClick={() => void appendResolvedNote()}
            >
              {busy === "timeline-note" ? "Posting…" : "Append ledger note"}
            </button>
          </div>}

        {message ?
          <p className="text-[12px] text-red-dark font-semibold whitespace-pre-wrap">{message}</p>
        : null}
      </div>

      {resolveModal ?
        (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/50 p-4">
            <div className="w-full max-w-md rounded-2xl border border-cream-dark bg-white p-5 shadow-2xl space-y-3">
              <p className="font-display text-lg text-teal-dark">Resolve incident</p>
              <p className="text-[12px] text-charcoal/60">
                This moves the ledger to{" "}
                <code className="font-mono">resolved</code> and persists your note on the row (
                <span className="font-mono">resolution_notes</span>).
              </p>
              <textarea
                className="w-full rounded-lg border border-cream-dark bg-cream-mid/18 px-3 py-2 text-[13px] min-h-[120px]"
                value={resolveNote}
                placeholder="Operational summary for the ledger (min 4 characters)"
                autoFocus
                onChange={(e) => setResolveNote(e.target.value)}
              />
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  className="rounded-lg border px-3 py-1.5 text-[12px] font-semibold text-charcoal/70 hover:bg-cream-mid/40"
                  onClick={() => {
                    setResolveModal(false);
                  }}
                  disabled={busy !== null}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={busy !== null}
                  className="rounded-lg bg-charcoal px-3 py-1.5 text-[12px] font-semibold text-cream hover:opacity-95"
                  onClick={() => void submitResolve()}
                >
                  {busy === "resolve" ? "Saving…" : "Mark resolved"}
                </button>
              </div>
            </div>
          </div>
        )
      : null}
    </>
  );
}
