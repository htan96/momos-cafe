"use client";

import { useState } from "react";

type LeaseRow = {
  id: string;
  type: string;
  leaseStale: boolean;
};

type DeadLetterRow = {
  id: string;
  type: string;
};

/**
 * Calls the operator-requeue API — see repo route
 * `app/api/super-admin/operations/notification-events/[id]/operator-requeue/route.ts`.
 *
 * **Retry semantics:**
 * - Lease release (Phase A): never sets `processed_at` — only clears `started_processing_at` so cron can reclaim.
 * - Dead-letter rewind (Phase B): rewinds attempt-cap terminals — may duplicate outbound email; requires explicit JSON flag.
 */
export default function NotificationOutboxOperationsClient({
  leaseCandidates,
  deadLetterRows,
}: {
  leaseCandidates: LeaseRow[];
  deadLetterRows: DeadLetterRow[];
}) {
  const [log, setLog] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [forceFresh, setForceFresh] = useState<Record<string, boolean>>({});

  async function postLease(id: string, leaseStale: boolean) {
    const needForce = !leaseStale;
    const confirmed = needForce ? Boolean(forceFresh[id]) : false;
    if (needForce && !confirmed) {
      setLog("Fresh lease — check the confirm box first or wait for the 15-minute stale window.");
      return;
    }
    setBusyId(id);
    setLog(null);
    try {
      const res = await fetch(`/api/super-admin/operations/notification-events/${encodeURIComponent(id)}/operator-requeue`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmRequeueStaleLease: needForce ? true : false }),
      });
      const text = await res.text();
      let payload: unknown = null;
      try {
        payload = JSON.parse(text) as unknown;
      } catch {
        payload = text;
      }
      if (!res.ok) {
        setLog(typeof payload === "object" && payload && "error" in payload ? String((payload as { error: string }).error) : text);
      } else {
        setLog(typeof payload === "object" && payload && "mode" in payload ? `OK — ${String((payload as { mode: string }).mode)}` : String(text));
      }
    } finally {
      setBusyId(null);
    }
  }

  const [deadDanger, setDeadDanger] = useState<Record<string, boolean>>({});

  async function postDeadLetter(id: string) {
    if (!deadDanger[id]) {
      setLog("Dead-letter rewind requires checking the danger acknowledgement per row.");
      return;
    }
    setBusyId(id);
    setLog(null);
    try {
      const res = await fetch(`/api/super-admin/operations/notification-events/${encodeURIComponent(id)}/operator-requeue`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dangerConfirmResetDeadLetter: true }),
      });
      const payload = (await res.json().catch(() => null)) as { error?: string; mode?: string } | null;
      if (!res.ok) {
        setLog(payload?.error ?? "Request failed.");
      } else {
        setLog(payload?.mode ? `OK — ${payload.mode}` : "OK");
      }
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6 text-[13px] text-charcoal/80">
      {log ? (
        <div className="rounded-lg border border-cream-dark/55 bg-cream-mid/25 px-3 py-2 font-mono text-[12px]" role="status">
          {log}
        </div>
      ) : null}

      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-charcoal/45 mb-2">
          Phase A · release active lease (sample backlog)
        </p>
        {leaseCandidates.length === 0 ? (
          <p className="text-[13px] text-charcoal/60">No leased rows in FIFO sample — backlog may still have clear-lease work via cron.</p>
        ) : (
          <div className="space-y-3">
            {leaseCandidates.map((r) => (
              <div
                key={r.id}
                className="flex flex-wrap items-center gap-3 rounded-lg border border-cream-dark/50 bg-white/90 px-3 py-2"
              >
                <span className="font-mono text-[11px] break-all">{r.id}</span>
                <span className="text-[12px]">{r.type}</span>
                <span className={`text-[11px] uppercase ${r.leaseStale ? "text-teal-dark" : "text-amber-800"}`}>
                  {r.leaseStale ? "stale lease" : "fresh lease"}
                </span>
                {!r.leaseStale ? (
                  <label className="flex items-center gap-2 text-[12px]">
                    <input
                      type="checkbox"
                      checked={Boolean(forceFresh[r.id])}
                      onChange={(e) =>
                        setForceFresh((prev) => ({
                          ...prev,
                          [r.id]: e.target.checked,
                        }))
                      }
                    />
                    confirm break fresh lease (&lt;15m)
                  </label>
                ) : null}
                <button
                  type="button"
                  disabled={busyId === r.id}
                  className="rounded-md border border-teal-dark/50 bg-teal-dark/10 px-2 py-1 text-[12px] font-semibold text-teal-dark hover:bg-teal-dark/20 disabled:opacity-50"
                  onClick={() => void postLease(r.id, r.leaseStale)}
                >
                  {busyId === r.id ? "Posting…" : "Clear lease"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-charcoal/45 mb-2">
          Phase B · attempt-cap dead-letter rewind (from recent terminal list)
        </p>
        {deadLetterRows.length === 0 ? (
          <p className="text-[13px] text-charcoal/60">None in the surfaced sample — scan failures table or widen Prisma query offline.</p>
        ) : (
          <div className="space-y-3">
            {deadLetterRows.map((r) => (
              <div
                key={r.id}
                className="flex flex-wrap items-center gap-3 rounded-lg border border-amber-900/30 bg-amber-50/70 px-3 py-2"
              >
                <span className="font-mono text-[11px] break-all">{r.id}</span>
                <span className="text-[12px]">{r.type}</span>
                <label className="flex items-center gap-2 text-[12px] text-amber-950">
                  <input
                    type="checkbox"
                    checked={Boolean(deadDanger[r.id])}
                    onChange={(e) =>
                      setDeadDanger((prev) => ({
                        ...prev,
                        [r.id]: e.target.checked,
                      }))
                    }
                  />
                  danger: may duplicate outbound sends
                </label>
                <button
                  type="button"
                  disabled={busyId === r.id}
                  className="rounded-md border border-amber-900/40 bg-white px-2 py-1 text-[12px] font-semibold text-amber-950 hover:bg-amber-100 disabled:opacity-50"
                  onClick={() => void postDeadLetter(r.id)}
                >
                  {busyId === r.id ? "Posting…" : "Rewind dead letter"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
