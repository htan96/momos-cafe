"use client";

import Link from "next/link";
import { useState } from "react";
import OperationalCard from "@/components/governance/OperationalCard";
import OperationalMetadataJumpLinks from "@/components/governance/OperationalMetadataJumpLinks";
import StatusPill, { type StatusPillVariant } from "@/components/governance/StatusPill";
import type { OperationalFailureDetail } from "@/lib/operations/failures/queryOperationalFailures";
import { RECOVERY_RESEND_EMAIL_TOOLTIP } from "@/lib/operations/failures/recoveryActions";
import { X } from "lucide-react";

function severityPillVariant(sev: string): StatusPillVariant {
  switch (sev) {
    case "info":
      return "neutral";
    case "warning":
      return "warning";
    case "error":
      return "degraded";
    case "critical":
      return "critical";
    default:
      return "neutral";
  }
}

const TRIAGE_OPTIONS = ["new", "acknowledged", "investigating", "resolved", "ignored"] as const;

type Props = {
  eventId: string;
  detail: OperationalFailureDetail | null;
  loading: boolean;
  onClose: () => void;
  onTriageUpdated: (detail: OperationalFailureDetail) => void;
};

export default function FailureDetailPanel({ eventId, detail, loading, onClose, onTriageUpdated }: Props) {
  const [saving, setSaving] = useState(false);
  const [triageError, setTriageError] = useState<string | null>(null);
  const [showRaw, setShowRaw] = useState(false);
  const [notes, setNotes] = useState("");
  const [recoveryBusy, setRecoveryBusy] = useState<string | null>(null);
  const [recoveryMessage, setRecoveryMessage] = useState<string | null>(null);

  const metadataForLinks = detail
    ? { entities: detail.entityIds, ...detail.entityIds }
    : null;

  async function patchTriage(state: string) {
    setSaving(true);
    setTriageError(null);
    try {
      const res = await fetch(`/api/super-admin/operations/failures/${eventId}/triage`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state, notes: notes.trim() || undefined }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message ?? json.error ?? "Update failed");
      if (json.detail) onTriageUpdated(json.detail as OperationalFailureDetail);
    } catch (e) {
      setTriageError(e instanceof Error ? e.message : "Update failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-charcoal/25 backdrop-blur-[1px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="failure-detail-title"
    >
      <button type="button" className="flex-1 cursor-default" aria-label="Close" onClick={onClose} />
      <div className="w-full max-w-lg h-full overflow-y-auto bg-white shadow-xl border-l border-cream-dark/60 flex flex-col">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-cream-dark/50 bg-white/95 px-5 py-4 backdrop-blur-sm">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-charcoal/40">Failure detail</p>
            <h2 id="failure-detail-title" className="mt-1 font-display text-lg text-teal-dark truncate">
              {detail?.event.type ?? eventId}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-cream-dark/60 p-2 text-charcoal/60 hover:bg-cream-mid/40"
            aria-label="Close panel"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 px-5 py-5 space-y-6">
          {loading ? (
            <p className="text-[13px] text-charcoal/60">Loading detail…</p>
          ) : !detail ? (
            <p className="text-[13px] text-red-dark">Failure event not found or not in the failure taxonomy.</p>
          ) : (
            <>
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2">
                  <StatusPill variant={severityPillVariant(detail.event.severity)}>{detail.event.severity}</StatusPill>
                  {detail.event.lifecycle ? (
                    <StatusPill variant="neutral">{detail.event.lifecycle}</StatusPill>
                  ) : null}
                  {detail.event.category ? (
                    <StatusPill variant="neutral">{detail.event.category}</StatusPill>
                  ) : null}
                  <StatusPill variant="neutral">Priority: {detail.classification.operationalPriority}</StatusPill>
                </div>
                <p className="text-[13px] text-charcoal leading-relaxed">{detail.event.message}</p>
                <p className="text-[12px] text-charcoal/55">
                  {new Date(detail.event.createdAt).toLocaleString(undefined, {
                    dateStyle: "full",
                    timeStyle: "medium",
                  })}
                  {detail.event.source ? ` · ${detail.event.source}` : ""}
                </p>
                {metadataForLinks ? <OperationalMetadataJumpLinks metadata={metadataForLinks} /> : null}
              </div>

              <OperationalCard title="Triage" meta={detail.triage?.state ?? "untriaged"}>
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {TRIAGE_OPTIONS.map((state) => (
                      <button
                        key={state}
                        type="button"
                        disabled={saving}
                        onClick={() => patchTriage(state)}
                        className={`rounded-full border px-3 py-1 text-[11px] font-semibold capitalize transition disabled:opacity-50 ${
                          (detail.triage?.state ?? "new") === state || (!detail.triage && state === "new")
                            ? "border-teal/40 bg-teal/[0.12] text-teal-dark"
                            : "border-cream-dark/70 hover:bg-cream-mid/30"
                        }`}
                      >
                        {state}
                      </button>
                    ))}
                  </div>
                  <label className="block">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-charcoal/45">Notes</span>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder={detail.triage?.notes ?? "Optional triage notes…"}
                      rows={3}
                      className="mt-1 w-full rounded-lg border border-cream-dark/70 px-3 py-2 text-[13px] resize-y"
                    />
                  </label>
                  {triageError ? <p className="text-[12px] text-red-dark">{triageError}</p> : null}
                </div>
              </OperationalCard>

              {detail.linkedIncidents.length > 0 ? (
                <OperationalCard title="Linked incidents" meta={`${detail.linkedIncidents.length} rows`}>
                  <ul className="space-y-2">
                    {detail.linkedIncidents.map((inc) => (
                      <li key={inc.id} className="text-[13px]">
                        <div className="flex flex-wrap items-center gap-2">
                          <StatusPill variant={severityPillVariant(inc.severity === "high" ? "error" : inc.severity)}>
                            {inc.severity}
                          </StatusPill>
                          <span className="font-mono text-[11px] text-charcoal/50">{inc.type}</span>
                        </div>
                        <p className="mt-1 font-semibold text-charcoal">{inc.title}</p>
                        <Link
                          href={`/super-admin/incidents?highlight=${encodeURIComponent(inc.id)}`}
                          className="text-[12px] text-teal-dark font-semibold hover:underline"
                        >
                          Open in incidents
                        </Link>
                      </li>
                    ))}
                  </ul>
                </OperationalCard>
              ) : null}

              {detail.relatedEvents.length > 0 ? (
                <OperationalCard title="Related events" meta="±30 min · shared entities">
                  <ul className="divide-y divide-cream-dark/40">
                    {detail.relatedEvents.map((ev) => (
                      <li key={ev.id} className="py-2.5 first:pt-0">
                        <div className="flex flex-wrap gap-2 items-center">
                          <StatusPill variant={severityPillVariant(ev.severity)}>{ev.severity}</StatusPill>
                          <span className="font-mono text-[11px] text-charcoal/55">{ev.type}</span>
                        </div>
                        <p className="mt-1 text-[12px] text-charcoal/75">{ev.message}</p>
                      </li>
                    ))}
                  </ul>
                </OperationalCard>
              ) : null}

              {detail.recoveryShipment ? (
                <OperationalCard title="Label recovery target" meta="Resolved shipment id">
                  <p className="text-[12px] text-charcoal/70 leading-relaxed">{detail.recoveryShipment.contractLine}</p>
                  <p className="mt-2 text-[11px] font-mono text-charcoal/80 break-all">
                    shipmentId · {detail.recoveryShipment.shipmentId}
                  </p>
                </OperationalCard>
              ) : null}

              {detail.recoveryActions.length > 0 ? (
                <OperationalCard title="Recovery actions" meta="Super-admin gated where live">
                  <ul className="space-y-3">
                    {detail.recoveryActions.map((action) => {
                      const superPath = action.superAdminApiPath;
                      const isSuperApi = action.handler === "super_admin_api" && superPath;
                      const isLegacyRoute = action.handler === "route" && action.routePath;
                      const shippoId = detail.recoveryShipment?.shipmentId ?? detail.entityIds.shipmentId;
                      const shippoBody = JSON.stringify(
                        {
                          shipmentId: shippoId ?? undefined,
                          commerceOrderId:
                            !shippoId
                              ? detail.entityIds.commerceOrderId ?? detail.entityIds.orderId ?? undefined
                              : undefined,
                        },
                        null,
                        2
                      );

                      const squareBody = JSON.stringify(
                        {
                          squarePaymentId: detail.recoveryHints.squarePaymentId ?? undefined,
                          paymentRecordId: detail.recoveryHints.paymentRecordId ?? undefined,
                          commerceOrderId: detail.recoveryHints.commerceOrderId ?? undefined,
                          sourceFailureEventId: eventId,
                        },
                        null,
                        2
                      );
                      const squareRecoveryReady =
                        Boolean(detail.recoveryHints.squarePaymentId) ||
                        Boolean(detail.recoveryHints.paymentRecordId) ||
                        Boolean(detail.recoveryHints.commerceOrderId);

                      async function runSuper(path: string, body?: string) {
                        setRecoveryBusy(action.id);
                        setRecoveryMessage(null);
                        try {
                          const res = await fetch(path, {
                            method: action.httpMethod ?? "POST",
                            headers: { "Content-Type": "application/json" },
                            credentials: "same-origin",
                            body,
                          });
                          const json = (await res.json().catch(() => ({}))) as { message?: string; error?: string };
                          if (!res.ok) {
                            throw new Error(json.message ?? json.error ?? `HTTP ${res.status}`);
                          }
                          setRecoveryMessage(`${action.label} requested · ok`);
                        } catch (e) {
                          setRecoveryMessage(e instanceof Error ? e.message : "Request failed");
                        } finally {
                          setRecoveryBusy(null);
                        }
                      }

                      return (
                        <li key={action.id} className="rounded-lg border border-cream-dark/45 bg-cream-mid/10 p-3 space-y-2">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-[13px] font-semibold text-charcoal">{action.label}</p>
                              <p className="text-[12px] text-charcoal/60">{action.description}</p>
                            </div>
                            {isSuperApi && action.id === "retry_shippo_label" ? (
                              <button
                                type="button"
                                disabled={Boolean(recoveryBusy) || (!shippoId && !detail.entityIds.commerceOrderId && !detail.entityIds.orderId)}
                                onClick={() => void runSuper(superPath!, shippoBody)}
                                className="shrink-0 rounded-lg border border-teal/30 bg-teal/[0.08] px-2.5 py-1 text-[11px] font-semibold text-teal-dark hover:bg-teal/[0.14] disabled:opacity-40"
                              >
                                {recoveryBusy === action.id ? "Running…" : "POST retry"}
                              </button>
                            ) : isSuperApi && action.id === "rerun_catalog_sync" ? (
                              <button
                                type="button"
                                disabled={Boolean(recoveryBusy)}
                                onClick={() => void runSuper(superPath!, "{}")}
                                className="shrink-0 rounded-lg border border-teal/30 bg-teal/[0.08] px-2.5 py-1 text-[11px] font-semibold text-teal-dark hover:bg-teal/[0.14] disabled:opacity-40"
                              >
                                {recoveryBusy === action.id ? "Running…" : "Run sync"}
                              </button>
                            ) : isSuperApi &&
                              (action.id === "retry_webhook_reconcile" || action.id === "retry_payment_reconcile") ? (
                              <button
                                type="button"
                                disabled={Boolean(recoveryBusy) || !squareRecoveryReady}
                                onClick={() => void runSuper(superPath!, squareBody)}
                                className="shrink-0 rounded-lg border border-teal/30 bg-teal/[0.08] px-2.5 py-1 text-[11px] font-semibold text-teal-dark hover:bg-teal/[0.14] disabled:opacity-40"
                              >
                                {recoveryBusy === action.id ? "Running…" : "POST reconcile"}
                              </button>
                            ) : isLegacyRoute ? (
                              <span
                                className="shrink-0 rounded-lg border border-cream-dark/60 px-2.5 py-1 text-[11px] font-semibold text-charcoal/40"
                                title="Prefer super-admin recovery route — ops console uses a different credential surface"
                              >
                                Legacy ops route
                              </span>
                            ) : (
                              <span
                                className="shrink-0 rounded-lg border border-cream-dark/60 px-2.5 py-1 text-[11px] font-semibold text-charcoal/40 cursor-help"
                                title={
                                  action.id === "resend_email"
                                    ? RECOVERY_RESEND_EMAIL_TOOLTIP
                                    : "Coming soon — idempotent retry handler not wired"
                                }
                              >
                                Coming soon
                              </span>
                            )}
                          </div>
                          {action.id === "retry_shippo_label" ? (
                            <pre className="text-[10px] font-mono text-charcoal/70 whitespace-pre-wrap break-all bg-white/60 rounded-md p-2 border border-cream-dark/35">
                              {action.httpMethod ?? "POST"} {superPath}
                              {"\n"}
                              {shippoBody}
                            </pre>
                          ) : null}
                          {action.id === "rerun_catalog_sync" ? (
                            <pre className="text-[10px] font-mono text-charcoal/70 whitespace-pre-wrap bg-white/60 rounded-md p-2 border border-cream-dark/35">
                              {action.httpMethod ?? "POST"} {superPath}
                              {"\n"}
                              {`{}`}
                            </pre>
                          ) : null}
                          {action.id === "retry_webhook_reconcile" || action.id === "retry_payment_reconcile" ? (
                            <pre className="text-[10px] font-mono text-charcoal/70 whitespace-pre-wrap break-all bg-white/60 rounded-md p-2 border border-cream-dark/35">
                              {action.httpMethod ?? "POST"} {superPath}
                              {"\n"}
                              {squareBody}
                            </pre>
                          ) : null}
                        </li>
                      );
                    })}
                  </ul>
                  {recoveryMessage ? <p className="text-[12px] text-charcoal/70 mt-2">{recoveryMessage}</p> : null}
                </OperationalCard>
              ) : null}

              <OperationalCard title="Metadata envelope" meta="PII redacted">
                <button
                  type="button"
                  onClick={() => setShowRaw((v) => !v)}
                  className="text-[12px] font-semibold text-teal-dark hover:underline"
                >
                  {showRaw ? "Hide" : "Show"} redacted JSON
                </button>
                {showRaw ? (
                  <pre className="mt-3 max-h-64 overflow-auto rounded-lg bg-charcoal/[0.04] p-3 text-[11px] font-mono text-charcoal/80">
                    {JSON.stringify(detail.event.metadataRedacted, null, 2)}
                  </pre>
                ) : null}
              </OperationalCard>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
