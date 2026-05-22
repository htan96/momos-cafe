"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import OperationalCard from "@/components/governance/OperationalCard";
import StatusPill from "@/components/governance/StatusPill";

type ReceiptRow = {
  id: string;
  provider: string;
  externalEventId: string | null;
  eventType: string | null;
  processingStatus: string;
  errorCode: string | null;
  receivedAt: string;
  payloadHash: string | null;
  commerceOrderId: string | null;
  paymentRecordId: string | null;
};

type ReceiptListResponse = { rows: ReceiptRow[] };

type RelatedDetailResponse = {
  receipt: ReceiptRow & { signatureValid: boolean; httpStatus: number | null };
  related: {
    paymentRecord: {
      id: string;
      status: string;
      amountCents: number;
      provider: string;
      squarePaymentId: string | null;
      squarePaymentStatus: string | null;
      orderId: string;
      idempotencyKey: string;
      updatedAt: string;
    } | null;
    commerceOrder: { id: string; status: string; totalCents: number; createdAt: string; updatedAt: string } | null;
    shipments: {
      id: string;
      status: string;
      carrier: string | null;
      trackingNumber: string | null;
      shippedAt: string | null;
      fulfillmentGroupId: string;
      updatedAt: string;
    }[];
  };
};

export default function WebhookReplayConsole(props: {
  initialReceiptId?: string | null;
  notificationsBacklog: {
    id: string;
    type: string;
    createdAt: string;
    startedProcessingAt: string | null;
    payloadPreview: string;
  }[];
}) {
  const [providerFilter, setProviderFilter] = useState("");
  const [limit, setLimit] = useState("50");
  const [loadingList, setLoadingList] = useState(true);
  const [rows, setRows] = useState<ReceiptRow[]>([]);

  const [selectedId, setSelectedId] = useState(props.initialReceiptId?.trim() || "");
  const [detailLoading, setDetailLoading] = useState(false);
  const [detail, setDetail] = useState<RelatedDetailResponse | null>(null);
  const [detailErr, setDetailErr] = useState<string | null>(null);

  const [rawBody, setRawBody] = useState("");
  const [signatureHeader, setSignatureHeader] = useState("");
  const [lastDryRunFingerprint, setLastDryRunFingerprint] = useState<string | null>(null);
  const [operatorBypassAck, setOperatorBypassAck] = useState(false);
  const [lastPlan, setLastPlan] = useState<unknown>(null);

  const [dryRunning, setDryRunning] = useState(false);
  const [replayRunning, setReplayRunning] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);

  const [forceReconcile, setForceReconcile] = useState(false);

  const rawFingerprint = useMemo(() => {
    const t = rawBody.trim();
    if (!t) return "";
    return `${t.length}:${t.charCodeAt(0)}:${t.charCodeAt(t.length - 1)}`;
  }, [rawBody]);

  const reloadList = useCallback(async () => {
    setLoadingList(true);
    try {
      const qs = new URLSearchParams({ limit });
      const p = providerFilter.trim();
      if (p) qs.set("provider", p);
      const res = await fetch(`/api/super-admin/operations/webhook-receipts?${qs.toString()}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error(`List failed (${res.status})`);
      const data = (await res.json()) as ReceiptListResponse;
      setRows(data.rows ?? []);
    } catch {
      setRows([]);
    } finally {
      setLoadingList(false);
    }
  }, [limit, providerFilter]);

  useEffect(() => {
    void reloadList();
  }, [reloadList]);

  useEffect(() => {
    setLastPlan(null);
    setLastDryRunFingerprint(null);
  }, [rawBody]);

  const loadDetail = useCallback(async (id: string) => {
    if (!id) return;
    setDetailLoading(true);
    setDetailErr(null);
    setDetail(null);
    setErrorMsg(null);
    setInfoMsg(null);
    setLastPlan(null);
    setLastDryRunFingerprint(null);
    try {
      const res = await fetch(`/api/super-admin/operations/webhook-receipts/${encodeURIComponent(id)}`, {
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error((await res.json().catch(() => null))?.error ?? `Detail failed (${res.status})`);
      }
      const data = (await res.json()) as RelatedDetailResponse;
      setDetail(data);
      setSignatureHeader("");
    } catch (e) {
      setDetailErr(e instanceof Error ? e.message : "Detail load failed.");
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    if (props.initialReceiptId?.trim()) {
      void loadDetail(props.initialReceiptId.trim());
    }
  }, [props.initialReceiptId, loadDetail]);

  const selectReceipt = async (id: string) => {
    setSelectedId(id);
    setRawBody("");
    setOperatorBypassAck(false);
    await loadDetail(id);
  };

  const dryRunValidated = Boolean(rawFingerprint && lastDryRunFingerprint === rawFingerprint);

  const confirmEnabled = Boolean(selectedId && rawBody.trim()) && (dryRunValidated || operatorBypassAck);

  const runDryRun = async () => {
    if (!selectedId) return;
    setDryRunning(true);
    setErrorMsg(null);
    setInfoMsg(null);
    try {
      const res = await fetch(`/api/super-admin/operations/webhook-receipts/${encodeURIComponent(selectedId)}/replay`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dryRun: true,
          rawBody,
          ...(signatureHeader.trim() ? { signatureHeader: signatureHeader.trim() } : {}),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof data?.error === "string" ? data.error : `Dry-run failed (${res.status})`);
      const plan = (data as { plan?: unknown }).plan;
      setLastPlan(plan ?? data);
      setLastDryRunFingerprint(rawFingerprint || null);
      setInfoMsg("Dry-run succeeded — inspect plan JSON.");
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Dry-run failed.");
    } finally {
      setDryRunning(false);
    }
  };

  const runReplay = async () => {
    if (!selectedId) return;
    setReplayRunning(true);
    setErrorMsg(null);
    setInfoMsg(null);
    try {
      const res = await fetch(`/api/super-admin/operations/webhook-receipts/${encodeURIComponent(selectedId)}/replay`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          confirm: true,
          dryRun: false,
          rawBody,
          forceReconcile,
          ...(signatureHeader.trim() ? { signatureHeader: signatureHeader.trim() } : {}),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 409) {
        setErrorMsg(typeof data?.error === "string" ? data.error : "409 — replay duplicate hash.");
      } else if (!res.ok) {
        throw new Error(typeof data?.error === "string" ? data.error : `Replay failed (${res.status})`);
      } else {
        setInfoMsg("Replay invoked — reconcile result returned.");
        await loadDetail(selectedId);
      }
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Replay failed.");
    } finally {
      setReplayRunning(false);
    }
  };

  return (
    <div className="space-y-8">
      <OperationalCard title="Failed / ignored delivery receipts" meta="WebhookDeliveryReceipt">
        <div className="flex flex-wrap gap-3 items-end mb-3 text-[13px]">
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-charcoal/50">provider</span>
            <select
              className="rounded border border-cream-dark/60 px-2 py-1 bg-white font-mono text-[12px]"
              value={providerFilter}
              onChange={(e) => setProviderFilter(e.target.value)}
            >
              <option value="">Any</option>
              <option value="square">square</option>
              <option value="shippo">shippo</option>
              <option value="resend">resend</option>
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-charcoal/50">limit</span>
            <input
              className="rounded border border-cream-dark/60 px-2 py-1 w-24 font-mono text-[12px]"
              value={limit}
              onChange={(e) => setLimit(e.target.value)}
              inputMode="numeric"
            />
          </label>
          <button
            type="button"
            className="rounded-lg border border-cream-dark/60 bg-white px-3 py-1.5 text-[12px] font-semibold text-charcoal/80 hover:bg-cream-mid/40"
            disabled={loadingList}
            onClick={() => void reloadList()}
          >
            Refresh list
          </button>
          <p className="text-charcoal/60 text-[12px]">
            {loadingList ? "Loading…" : `${rows.length} row(s)`} · Receipts omit raw payloads — paste vendor JSON captured from dashboards.
          </p>
        </div>
        <div className="overflow-x-auto rounded-lg border border-cream-dark/50">
          <table className="w-full min-w-[56rem] text-left text-[13px]">
            <thead className="border-b border-cream-dark/50 bg-cream-mid/20 text-[11px] uppercase tracking-[0.08em] text-charcoal/50">
              <tr>
                <th className="px-3 py-2 font-semibold">Provider</th>
                <th className="px-3 py-2 font-semibold">Received</th>
                <th className="px-3 py-2 font-semibold">Status</th>
                <th className="px-3 py-2 font-semibold">External id</th>
                <th className="px-3 py-2 font-semibold">Error</th>
                <th className="px-3 py-2 font-semibold">Links</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-dark/40">
              {rows.map((r) => (
                <tr key={r.id} className={selectedId === r.id ? "bg-teal-dark/5" : ""}>
                  <td className="px-3 py-2 font-mono text-[11px]">{r.provider}</td>
                  <td className="px-3 py-2 text-[12px] text-charcoal/70">{new Date(r.receivedAt).toLocaleString()}</td>
                  <td className="px-3 py-2">
                    <StatusPill variant="warning">{r.processingStatus}</StatusPill>
                  </td>
                  <td className="px-3 py-2 font-mono text-[11px] break-all">{r.externalEventId ?? "—"}</td>
                  <td className="px-3 py-2 font-mono text-[11px] break-all">{r.errorCode ?? "—"}</td>
                  <td className="px-3 py-2 flex flex-wrap gap-2 items-center">
                    <button
                      type="button"
                      className="text-teal-dark font-semibold text-[12px] hover:underline"
                      onClick={() => void selectReceipt(r.id)}
                    >
                      Open
                    </button>
                    {r.provider === "square" && r.errorCode === "ORPHAN_NO_LOCAL_PAYMENT" ? (
                      <Link className="text-[11px] font-semibold text-charcoal/60 hover:text-teal-dark" href="/super-admin/operations/payments">
                        Payments · Square lookup
                      </Link>
                    ) : null}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && !loadingList ? (
                <tr>
                  <td colSpan={6} className="px-3 py-4 text-charcoal/60 text-[13px]">
                    No failed/ignored webhook receipts matched this filter — expand date window by raising `limit`.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </OperationalCard>

      <OperationalCard title="Receipt drill-in + replay controls" meta={detail?.receipt.id ?? selectedId}>
        {!selectedId ? <p className="text-charcoal/60 text-[13px]">Select a receipt row to load detail.</p> : null}
        {detailLoading ? <p className="text-[13px] text-charcoal/60">Loading receipt…</p> : null}
        {detailErr ? <p className="text-[13px] text-red-900/85">{detailErr}</p> : null}

        {detail ?
          <div className="space-y-4 text-[13px]">
            <div className="flex flex-wrap gap-2 items-center font-mono text-[11px] text-charcoal/70">
              <span>{detail.receipt.id}</span>
              <StatusPill variant="neutral">{detail.receipt.signatureValid ? "signature_valid" : "signature_invalid_history"}</StatusPill>
              {detail.receipt.payloadHash ? <span title="Fingerprint only — paste raw vendor JSON below">hash {detail.receipt.payloadHash.slice(0, 14)}…</span> : <span>No hash captured</span>}
            </div>
            <dl className="grid sm:grid-cols-2 gap-2">
              <div>
                <dt className="text-[11px] uppercase text-charcoal/45">commerce order</dt>
                <dd>
                  {detail.receipt.commerceOrderId ?
                    <Link className="text-teal-dark font-semibold hover:underline" href={`/super-admin/order-operations/${detail.receipt.commerceOrderId}`}>
                      {detail.receipt.commerceOrderId}
                    </Link>
                  : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase text-charcoal/45">payment record</dt>
                <dd className="font-mono break-all">{detail.related.paymentRecord?.id ?? "—"}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-[11px] uppercase text-charcoal/45 mb-1">linked shipments ({detail.related.shipments.length})</dt>
                <dd className="flex flex-wrap gap-2">
                  {detail.related.shipments.map((s) => (
                    <Link key={s.id} href={`/super-admin/shipping-operations/${s.id}`} className="text-teal-dark font-semibold text-[12px] hover:underline">
                      {s.id.slice(0, 8)}…
                    </Link>
                  ))}
                  {detail.related.shipments.length === 0 ? <span>—</span> : null}
                </dd>
              </div>
            </dl>

            <div className="space-y-2">
              <label className="block text-[11px] font-semibold uppercase tracking-[0.1em] text-charcoal/50">
                Optional signature header (Square <span className="font-mono">x-square-hmacsha256-signature</span> / Shippo{" "}
                <span className="font-mono">Shippo-Auth-Signature</span>)
              </label>
              <input
                className="w-full rounded border border-cream-dark/60 px-2 py-1 font-mono text-[11px]"
                placeholder="Paste exact header string when env verification is enabled"
                value={signatureHeader}
                onChange={(e) => setSignatureHeader(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="block text-[11px] font-semibold uppercase tracking-[0.1em] text-charcoal/50">
                Vendor raw JSON (<span className="normal-case tracking-normal font-sans font-normal text-charcoal/70">replay body</span>)
              </label>
              <textarea
                value={rawBody}
                rows={14}
                onChange={(e) => setRawBody(e.target.value)}
                className="w-full rounded-lg border border-cream-dark/60 px-3 py-2 font-mono text-[11px] leading-relaxed"
                placeholder={`Paste the exact JSON webhook body exported from Square or Shippo dashboards.
WebhookDeliveryReceipt never stores plaintext payloads — reconciliation cannot “pull” archived bodies.`}
              />
              <label className="flex items-start gap-2 cursor-pointer select-none">
                <input type="checkbox" checked={operatorBypassAck} onChange={(e) => setOperatorBypassAck(e.target.checked)} className="mt-1" />
                <span className="text-[12px] text-charcoal/70">
                  I acknowledge operator risk — allow Confirm without repeating dry-run for this pasted payload workflow.
                </span>
              </label>
              <label className="flex items-start gap-2 cursor-pointer select-none">
                <input type="checkbox" checked={forceReconcile} onChange={(e) => setForceReconcile(e.target.checked)} className="mt-1" />
                <span className="text-[12px] text-charcoal/70">
                  Force reconcile even when this receipt hash is already processed (duplicate payload) — emits extra governance audit.
                </span>
              </label>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={dryRunning || !selectedId || !rawBody.trim()}
                onClick={() => void runDryRun()}
                className="rounded-lg border border-teal-dark/50 bg-teal-dark/90 text-white px-4 py-2 text-[13px] font-semibold disabled:opacity-45"
              >
                {dryRunning ? "Dry running…" : "Dry run (plan JSON)"}
              </button>
              <button
                type="button"
                disabled={replayRunning || !confirmEnabled}
                onClick={() => void runReplay()}
                className="rounded-lg border border-cream-dark/60 bg-white px-4 py-2 text-[13px] font-semibold text-charcoal/85 disabled:opacity-45"
              >
                {replayRunning ? "Confirming…" : "Confirm replay (mutates reconcile)"}
              </button>
            </div>

            {errorMsg ? <p className="text-[13px] text-red-900/85">{errorMsg}</p> : null}
            {infoMsg ? <p className="text-[13px] text-teal-dark font-semibold">{infoMsg}</p> : null}

            {lastPlan ?
              <div className="rounded-lg border border-cream-dark/50 bg-cream-mid/15 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-charcoal/45 mb-2">Plan JSON (last dry-run)</p>
                <pre className="text-[11px] font-mono whitespace-pre-wrap break-words max-h-[480px] overflow-auto">
                  {JSON.stringify(lastPlan, null, 2)}
                </pre>
              </div>
            : null}
          </div>
        : null}
      </OperationalCard>

      <OperationalCard title="Notification outbox backlog (read-only)" meta="NotificationEvent">
        <p className="text-[13px] text-charcoal/70 mb-3">
          Terminal delivery uses the internal processor — wire <span className="font-mono">/api/internal/cron/notification-outbox</span> on a schedule (see{" "}
          <span className="font-mono">docs/operational-events.md</span>). Rows below are unprocessed (`processedAt` null), oldest first.
        </p>
        {props.notificationsBacklog.length === 0 ? (
          <p className="text-[13px] text-charcoal/60">No pending notification rows in this snapshot.</p>
        ) : (
          <ul className="divide-y divide-cream-dark/40">
            {props.notificationsBacklog.map((n) => (
              <li key={n.id} className="py-2 space-y-1">
                <div className="flex flex-wrap gap-2 font-mono text-[11px] text-charcoal/60">
                  <span>{n.id}</span>
                  <span>{n.type}</span>
                  <span>{new Date(n.createdAt).toLocaleString()}</span>
                  {n.startedProcessingAt ? <span>lease {new Date(n.startedProcessingAt).toLocaleString()}</span> : <span>lease —</span>}
                </div>
                <p className="text-[11px] font-mono text-charcoal/55 break-all">{n.payloadPreview}</p>
              </li>
            ))}
          </ul>
        )}
      </OperationalCard>

      <OperationalCard title="SES / email inbound honesty" meta="Resend + SES">
        <p className="text-[13px] text-charcoal/70 leading-relaxed">
          Email inbound via Resend (and SES notification topics) records hash-only <span className="font-mono">WebhookDeliveryReceipt</span> rows — there is no automated replay without the
          operator-pasted raw payload (or future encrypted storage). Inspect provider message logs and Resend dashboards; this page only replays Square + Shippo commerce webhooks.
        </p>
      </OperationalCard>
    </div>
  );
}
