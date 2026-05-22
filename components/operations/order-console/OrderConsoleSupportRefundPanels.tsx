"use client";

import { useCallback, useState } from "react";
import type {
  OperationalConsoleRefundCase,
  OperationalConsoleSupportIssue,
} from "@/lib/operations/orderConsole/loadOperationalOrderConsole";
import OperationalCard from "@/components/governance/OperationalCard";
import StatusPill from "@/components/governance/StatusPill";

export type OpsPaymentOption = {
  id: string;
  squarePaymentId: string | null;
  amountCents: number;
};

type SupportIssue = {
  id: string;
  status: string;
  title: string;
  summary: string | null;
  resolutionNotes: string | null;
  createdAt: string;
};

type RefundCase = {
  id: string;
  status: string;
  reason: string;
  internalNotes: string | null;
  amountCents: number | null;
  squareRefundId: string | null;
  paymentRecordId: string | null;
  createdAt: string;
};

const SUPPORT_STATUSES = [
  "OPEN",
  "WAITING_CUSTOMER",
  "REVIEWING",
  "ESCALATED",
  "RESOLVED",
] as const;

function fmtUsd(cents: number) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

function iso(input: Date | string): string {
  return input instanceof Date ? input.toISOString() : input;
}

function mapSupportRows(rows: readonly OperationalConsoleSupportIssue[]): SupportIssue[] {
  return rows.map((r) => ({
    id: r.id,
    status: r.status,
    title: r.title,
    summary: r.summary ?? null,
    resolutionNotes: r.resolutionNotes ?? null,
    createdAt: iso(r.createdAt),
  }));
}

function mapRefundRows(rows: readonly OperationalConsoleRefundCase[]): RefundCase[] {
  return rows.map((r) => ({
    id: r.id,
    status: r.status,
    reason: r.reason,
    internalNotes: r.internalNotes ?? null,
    amountCents: r.amountCents,
    squareRefundId: r.squareRefundId,
    paymentRecordId: r.paymentRecordId,
    createdAt: iso(r.createdAt),
  }));
}

export default function OrderConsoleSupportRefundPanels({
  commerceOrderId,
  payments,
  canSupportWrite,
  initialSupportIssues,
  initialRefundCases,
}: {
  commerceOrderId: string;
  payments: readonly OpsPaymentOption[];
  canSupportWrite: boolean;
  initialSupportIssues: readonly OperationalConsoleSupportIssue[];
  initialRefundCases: readonly OperationalConsoleRefundCase[];
}) {
  const [support, setSupport] = useState<SupportIssue[]>(() => mapSupportRows(initialSupportIssues));
  const [refunds, setRefunds] = useState<RefundCase[]>(() => mapRefundRows(initialRefundCases));
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const [draftSupportTitle, setDraftSupportTitle] = useState("");
  const [draftSupportSummary, setDraftSupportSummary] = useState("");
  const [draftRefundPaymentId, setDraftRefundPaymentId] = useState(payments[0]?.id ?? "");
  const [draftRefundAmount, setDraftRefundAmount] = useState("");
  const [draftRefundReason, setDraftRefundReason] = useState("Operational refund coordination");

  const refresh = useCallback(async () => {
    setErr(null);
    setBusy(true);
    try {
      const qs = `?commerceOrderId=${encodeURIComponent(commerceOrderId)}`;
      const [sRes, rRes] = await Promise.all([
        fetch(`/api/ops/support/issues${qs}`, { credentials: "include" }),
        fetch(`/api/ops/refunds/cases${qs}`, { credentials: "include" }),
      ]);
      if (!sRes.ok) {
        throw new Error((await sRes.json().catch(() => ({})))?.error ?? "support_feed_failed");
      }
      if (!rRes.ok) {
        throw new Error((await rRes.json().catch(() => ({})))?.error ?? "refunds_feed_failed");
      }
      const sJson = (await sRes.json()) as { issues: SupportIssue[] };
      const rJson = (await rRes.json()) as { cases: RefundCase[] };
      setSupport(sJson.issues);
      setRefunds(rJson.cases);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }, [commerceOrderId]);

  async function patchSupportIssue(id: string, body: Record<string, unknown>) {
    setErr(null);
    const res = await fetch(`/api/ops/support/issues/${encodeURIComponent(id)}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(String(json?.error ?? "patch_failed"));
    await refresh();
  }

  async function patchRefundCase(id: string, body: Record<string, unknown>) {
    setNotice(null);
    setErr(null);
    const res = await fetch(`/api/ops/refunds/cases/${encodeURIComponent(id)}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      const sq = typeof json?.detail?.message === "string" ? json.detail.message : null;
      throw new Error([json?.error, sq].filter(Boolean).join(": ") || "refund_patch_failed");
    }
    setNotice("Saved.");
    await refresh();
  }

  async function createSupport(ev: React.FormEvent) {
    ev.preventDefault();
    try {
      setErr(null);
      const res = await fetch("/api/ops/support/issues", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          commerceOrderId,
          title: draftSupportTitle.trim(),
          summary: draftSupportSummary.trim() || undefined,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(String(json?.error ?? "support_create_failed"));
      setDraftSupportTitle("");
      setDraftSupportSummary("");
      setNotice("Support issue opened.");
      await refresh();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : String(e));
    }
  }

  async function createRefund(ev: React.FormEvent) {
    ev.preventDefault();
    try {
      setErr(null);
      const payId = draftRefundPaymentId.trim();
      const amtDigits = draftRefundAmount.trim();
      const cents = amtDigits ? Number.parseInt(amtDigits, 10) : undefined;
      if (payId.length && amtDigits.length && Number.isFinite(cents) && typeof cents === "number" && cents < 1) {
        throw new Error("partial_amount_invalid");
      }
      const payload: Record<string, unknown> = {
        commerceOrderId,
        reason: draftRefundReason.trim(),
        paymentRecordId: payId.length ? payId : undefined,
      };
      if (payId.length && typeof cents === "number" && Number.isFinite(cents) && cents > 0) {
        payload.amountCents = cents;
      }
      const res = await fetch("/api/ops/refunds/cases", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(String(json?.error ?? "refund_case_create_failed"));
      setNotice("Refund coordination case queued.");
      await refresh();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <OperationalCard title="Operational support issues" meta="Momos orchestration • not SLA PSA">
        {busy ?
          <p className="text-[13px] text-charcoal/60">Syncing support desks…</p>
        : null}
        {!canSupportWrite ?
          <p className="text-[13px] text-charcoal/60">
            Your ops IAM session lacks `support:write`. View-only telemetry remains on timelines.
          </p>
        : null}
        {err ?
          <p className="text-[13px] text-red-700 font-semibold">Error · {err}</p>
        : null}
        {notice ?
          <p className="text-[12px] text-teal-dark font-semibold">{notice}</p>
        : null}

        {support.length ?
          (
            <ul className="space-y-4">
              {support.map((issue) => (
                <li key={issue.id} className="rounded-lg border border-cream-dark/45 bg-white/85 p-3 space-y-2">
                  <div className="flex flex-wrap gap-2 items-center">
                    <StatusPill variant="neutral">{issue.status}</StatusPill>
                    <span className="text-[13px] font-semibold">{issue.title}</span>
                  </div>
                  {issue.summary ?
                    <p className="text-[12px] text-charcoal/70">{issue.summary}</p>
                  : null}
                  {issue.resolutionNotes ?
                    <div className="rounded-md bg-cream-mid/30 p-2 text-[11px] whitespace-pre-wrap text-charcoal/80">
                      {issue.resolutionNotes}
                    </div>
                  : null}
                  <div className="flex flex-wrap gap-2">
                    <label className="text-[11px] text-charcoal/50 uppercase tracking-[0.1em]">Status</label>
                    <select
                      disabled={!canSupportWrite}
                      defaultValue={issue.status}
                      onChange={(e) =>
                        void patchSupportIssue(issue.id, { status: e.target.value }).catch((exc) =>
                          setErr(exc instanceof Error ? exc.message : String(exc))
                        )
                      }
                      className="text-[12px] border border-cream-dark/55 rounded px-2 py-1 bg-white"
                    >
                      {SUPPORT_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                  <textarea
                    disabled={!canSupportWrite}
                    rows={3}
                    placeholder="Append resolution notes…"
                    className="w-full text-[12px] border border-cream-dark/55 rounded px-2 py-1 bg-white font-mono"
                    onBlur={(e) => {
                      const txt = e.target.value.trim();
                      if (!txt) return;
                      void patchSupportIssue(issue.id, { resolutionNotesAppend: txt })
                        .catch((exc) => setErr(exc instanceof Error ? exc.message : String(exc)))
                        .finally(() => {
                          e.target.value = "";
                        });
                    }}
                  />
                </li>
              ))}
            </ul>
          )
        : (
          <p className="text-[13px] text-charcoal/60">No support issues persisted for this commerce order shell.</p>
        )}

        {canSupportWrite ?
          (
            <form onSubmit={createSupport} className="mt-5 space-y-2 border border-dashed border-cream-dark/45 rounded-lg p-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-charcoal/45">
                Create issue linked to order
              </p>
              <input
                className="w-full text-[13px] border border-cream-dark/55 rounded px-2 py-1"
                placeholder="Title"
                value={draftSupportTitle}
                onChange={(e) => setDraftSupportTitle(e.target.value)}
                required
              />
              <textarea
                rows={3}
                className="w-full text-[12px] border border-cream-dark/55 rounded px-2 py-1 font-mono"
                placeholder="Optional summary"
                value={draftSupportSummary}
                onChange={(e) => setDraftSupportSummary(e.target.value)}
              />
              <button
                type="submit"
                className="rounded-lg border border-cream-dark/60 bg-white px-3 py-1.5 text-[12px] font-semibold text-charcoal/80 hover:bg-cream-mid/40 shadow-sm transition"
              >
                Open issue
              </button>
            </form>
          )
        : null}
      </OperationalCard>

      <OperationalCard title="Refund coordination cases" meta="Approve here · Square settles money">
        {refunds.length ?
          (
            <ul className="space-y-4">
              {refunds.map((r) => (
                <li key={r.id} className="rounded-lg border border-cream-dark/45 bg-white/85 p-3 space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusPill variant={r.status === "SQUARE_FAILED" || r.status === "DENIED" ? "warning" : "neutral"}>
                      {r.status}
                    </StatusPill>
                    <span className="text-[13px]">
                      Amount intent ·{" "}
                      <span className="font-semibold">
                        {typeof r.amountCents === "number" ? fmtUsd(r.amountCents) : "full captured row"}
                      </span>
                    </span>
                  </div>
                  <p className="text-[13px] text-charcoal/80">{r.reason}</p>
                  {r.squareRefundId ?
                    <p className="font-mono text-[11px] text-charcoal/65 break-all">{r.squareRefundId}</p>
                  : null}

                  {!canSupportWrite ?
                    null
                  : (
                      <div className="flex flex-wrap gap-2 items-center">
                        <select
                          defaultValue=""
                          disabled={
                            !(r.status === "REQUESTED" || r.status === "REVIEWING" || r.status === "APPROVED")
                          }
                          className="text-[12px] border border-cream-dark/55 rounded px-2 py-1 bg-white"
                          onChange={(e) => {
                            const v = e.target.value;
                            if (!v) return;
                            void patchRefundCase(r.id, { status: v }).catch((exc) =>
                              setErr(exc instanceof Error ? exc.message : String(exc))
                            );
                          }}
                        >
                          <option value="">Transition…</option>
                          {(r.status === "REQUESTED" || r.status === "REVIEWING") ?
                            (
                              <>
                                <option value="REVIEWING">→ REVIEWING</option>
                                <option value="APPROVED">→ APPROVED</option>
                                <option value="DENIED">→ DENIED</option>
                                <option value="REQUESTED">→ REQUESTED (backlog)</option>
                              </>
                            )
                          : null}
                          {r.status === "APPROVED" ?
                            <option value="SUBMITTED_TO_SQUARE">→ SUBMIT (Square)</option>
                          : null}
                        </select>
                      </div>
                    )}

                  {canSupportWrite ?
                    (
                      <>
                        <label className="block text-[11px] uppercase text-charcoal/40 tracking-[0.08em]">
                          Internal notes
                        </label>
                        <textarea
                          disabled={!canSupportWrite}
                          rows={2}
                          defaultValue={r.internalNotes ?? ""}
                          className="w-full text-[12px] border border-cream-dark/55 rounded px-2 py-1 font-mono"
                          placeholder="Operational notes · never customer-visible"
                          onBlur={(ev) =>
                            void patchRefundCase(r.id, { internalNotes: ev.target.value }).catch((exc) =>
                              setErr(exc instanceof Error ? exc.message : String(exc))
                            )
                          }
                        />
                      </>
                    )
                  : null}
                </li>
              ))}
            </ul>
          )
        : (
          <p className="text-[13px] text-charcoal/60">No refund coordination rows yet.</p>
        )}

        {canSupportWrite && payments.length ?
          (
            <form onSubmit={createRefund} className="mt-5 space-y-2 border border-dashed border-cream-dark/45 rounded-lg p-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-charcoal/45">
                Coordinate refund intent
              </p>
              <select
                className="w-full text-[13px] border border-cream-dark/55 rounded px-2 py-1"
                value={draftRefundPaymentId}
                onChange={(e) => setDraftRefundPaymentId(e.target.value)}
              >
                {payments.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.id.slice(0, 8)}… ({fmtUsd(p.amountCents)})
                  </option>
                ))}
              </select>
              <input
                className="w-full text-[13px] border border-cream-dark/55 rounded px-2 py-1 font-mono"
                placeholder="Partial cents override (omit for captured total)"
                value={draftRefundAmount}
                onChange={(e) => setDraftRefundAmount(e.target.value)}
                inputMode="numeric"
              />
              <textarea
                rows={2}
                className="w-full text-[12px] border border-cream-dark/55 rounded px-2 py-1 font-mono"
                value={draftRefundReason}
                onChange={(e) => setDraftRefundReason(e.target.value)}
                placeholder="Refund reason surfaced to ops + Square truncate"
              />
              <button
                type="submit"
                className="rounded-lg border border-cream-dark/60 bg-white px-3 py-1.5 text-[12px] font-semibold text-charcoal/80 hover:bg-cream-mid/40 shadow-sm transition"
              >
                Queue refund case
              </button>
            </form>
          )
        : !payments.length ?
          <p className="text-[12px] text-charcoal/55 mt-3">
            Persist a PaymentRecord row before refunds can cite Square captures.
          </p>
        : null}
      </OperationalCard>
    </div>
  );
}
