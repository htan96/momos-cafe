"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import OperationalCard from "@/components/governance/OperationalCard";
import OperationalMetadataJumpLinks from "@/components/governance/OperationalMetadataJumpLinks";
import StatusPill, { type StatusPillVariant } from "@/components/governance/StatusPill";
import SuperAdminEmptyPanel from "@/components/super-admin/SuperAdminEmptyPanel";
import type { OperationalFailureListItem } from "@/lib/operations/failures/queryOperationalFailures";
import type { OperationalFailureDetail } from "@/lib/operations/failures/queryOperationalFailures";
import { TriangleAlert } from "lucide-react";
import FailureDetailPanel from "./FailureDetailPanel";

export type ActiveIncidentBanner = {
  id: string;
  type: string;
  severity: string;
  status: string;
  title: string;
};

type FailuresListResponse = {
  items: OperationalFailureListItem[];
  total: number;
  page: number;
  pageSize: number;
};

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

function triagePillVariant(state: string | undefined): StatusPillVariant {
  switch (state) {
    case "new":
      return "warning";
    case "investigating":
      return "degraded";
    case "resolved":
      return "ok";
    case "ignored":
      return "neutral";
    default:
      return "neutral";
  }
}

const SUBTYPE_CHIPS = [
  { value: "", label: "All types" },
  { value: "payment.failed", label: "Payment" },
  { value: "payment.webhook.processing_failed", label: "Webhook" },
  { value: "shipment.quote.failed", label: "Quote" },
  { value: "shipment.label.failed", label: "Label" },
  { value: "auth.login.failed", label: "Auth" },
  { value: "system.integration.degraded", label: "Integration" },
  { value: "menu.sync.failed", label: "Menu sync" },
  { value: "system.email.send_failed", label: "Email" },
];

const STATE_CHIPS = [
  { value: "", label: "Any state" },
  { value: "untriaged", label: "Untriaged" },
  { value: "active", label: "Open triage" },
  { value: "resolved", label: "Closed" },
];

type Props = {
  activeIncidents: ActiveIncidentBanner[];
};

export default function OperationalFailuresInbox({ activeIncidents }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [data, setData] = useState<FailuresListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<OperationalFailureDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const selectedEventId = searchParams.get("eventId");
  const subtype = searchParams.get("subtype") ?? "";
  const lifecycle = searchParams.get("lifecycle") ?? "";
  const severity = searchParams.get("severity") ?? "";
  const page = searchParams.get("page") ?? "1";

  const commerceOrderId = searchParams.get("commerceOrderId") ?? "";
  const failureIncidentId = searchParams.get("incidentId") ?? "";
  const failureCustomerId = searchParams.get("customerId") ?? "";
  const paymentRecordId = searchParams.get("paymentRecordId") ?? "";
  const shipmentId = searchParams.get("shipmentId") ?? "";

  const queryString = useMemo(() => {
    const p = new URLSearchParams();
    if (subtype) p.set("subtype", subtype);
    if (lifecycle) p.set("lifecycle", lifecycle);
    if (severity) p.set("severity", severity);
    if (commerceOrderId) p.set("commerceOrderId", commerceOrderId);
    if (failureIncidentId) p.set("incidentId", failureIncidentId);
    if (failureCustomerId) p.set("customerId", failureCustomerId);
    if (paymentRecordId) p.set("paymentRecordId", paymentRecordId);
    if (shipmentId) p.set("shipmentId", shipmentId);
    p.set("page", page);
    return p.toString();
  }, [
    subtype,
    lifecycle,
    severity,
    commerceOrderId,
    failureIncidentId,
    failureCustomerId,
    paymentRecordId,
    shipmentId,
    page,
  ]);

  const setPage = useCallback(
    (nextPage: number) => {
      const p = new URLSearchParams(searchParams.toString());
      p.set("page", String(nextPage));
      router.replace(`?${p.toString()}`, { scroll: false });
    },
    [router, searchParams]
  );

  const setFilter = useCallback(
    (key: string, value: string) => {
      const p = new URLSearchParams(searchParams.toString());
      if (value) p.set(key, value);
      else p.delete(key);
      if (key !== "page") p.delete("page");
      if (selectedEventId) p.set("eventId", selectedEventId);
      router.replace(`?${p.toString()}`, { scroll: false });
    },
    [router, searchParams, selectedEventId]
  );

  const openDetail = useCallback(
    (eventId: string) => {
      const p = new URLSearchParams(searchParams.toString());
      p.set("eventId", eventId);
      router.replace(`?${p.toString()}`, { scroll: false });
    },
    [router, searchParams]
  );

  const closeDetail = useCallback(() => {
    const p = new URLSearchParams(searchParams.toString());
    p.delete("eventId");
    router.replace(`?${p.toString()}`, { scroll: false });
    setDetail(null);
  }, [router, searchParams]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/super-admin/operations/failures?${queryString}`);
        if (!res.ok) throw new Error(`Failed to load failures (${res.status})`);
        const json = (await res.json()) as FailuresListResponse;
        if (!cancelled) setData(json);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Load failed");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [queryString]);

  useEffect(() => {
    if (!selectedEventId) return;
    let cancelled = false;
    setDetailLoading(true);
    fetch(`/api/super-admin/operations/failures/${selectedEventId}`)
      .then(async (res) => {
        if (!res.ok) throw new Error("Not found");
        return res.json() as Promise<OperationalFailureDetail>;
      })
      .then((json) => {
        if (!cancelled) setDetail(json);
      })
      .catch(() => {
        if (!cancelled) setDetail(null);
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedEventId]);

  const spikeIncidents = activeIncidents.filter((i) =>
    ["PAYMENT_FAILURE_SPIKE", "WEBHOOK_FAILURE_LOOP", "SHIPPO_OUTAGE", "AUTH_FAILURE_SPIKE"].includes(i.type)
  );

  return (
    <div className="space-y-6">
      {spikeIncidents.length > 0 ? (
        <div className="rounded-xl border border-amber-300/60 bg-amber-50/80 px-4 py-3 space-y-2">
          <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-amber-900/80">
            Active spike incidents
          </p>
          <ul className="space-y-1.5">
            {spikeIncidents.map((inc) => (
              <li key={inc.id} className="flex flex-wrap items-center gap-2 text-[13px] text-charcoal/85">
                <StatusPill variant={severityPillVariant(inc.severity === "high" ? "error" : inc.severity)}>
                  {inc.type.replace(/_/g, " ")}
                </StatusPill>
                <span>{inc.title}</span>
                <Link
                  href={`/super-admin/incidents?highlight=${encodeURIComponent(inc.id)}`}
                  className="text-teal-dark font-semibold text-[12px] hover:underline"
                >
                  View incident ledger
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {failureIncidentId.trim().length ?
        <div className="rounded-xl border border-teal-dark/30 bg-teal/[0.08] px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <p className="text-[13px] text-charcoal/85">
            Inbox narrowed to OperationalIncident{" "}
            <code className="font-mono text-[11px] break-all">{failureIncidentId}</code>.
          </p>
          <div className="flex flex-wrap gap-2 text-[12px] font-semibold text-teal-dark">
            <Link
              className="hover:underline"
              href={`/super-admin/incidents?highlight=${encodeURIComponent(failureIncidentId)}`}
            >
              Highlight ledger row
            </Link>
            <Link
              className="hover:underline"
              href={`/super-admin/live-activity?incidentId=${encodeURIComponent(failureIncidentId)}`}
            >
              Scoped live activity
            </Link>
            <button
              type="button"
              className="rounded-full border border-cream-dark/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-charcoal/70 hover:bg-white"
              onClick={() => setFilter("incidentId", "")}
            >
              Clear incident scope
            </button>
          </div>
        </div>
      : null}

      <OperationalCard title="Filters" meta="Live query — no fabricated rows">
        <div className="flex flex-wrap gap-2">
          {SUBTYPE_CHIPS.map((chip) => (
            <button
              key={chip.value || "all"}
              type="button"
              onClick={() => setFilter("subtype", chip.value)}
              className={`rounded-full border px-3 py-1 text-[11px] font-semibold transition ${
                subtype === chip.value
                  ? "border-teal/40 bg-teal/[0.1] text-teal-dark"
                  : "border-cream-dark/70 bg-white text-charcoal/65 hover:bg-cream-mid/30"
              }`}
            >
              {chip.label}
            </button>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {STATE_CHIPS.map((chip) => (
            <button
              key={chip.value || "any"}
              type="button"
              onClick={() => setFilter("lifecycle", chip.value)}
              className={`rounded-full border px-3 py-1 text-[11px] font-semibold transition ${
                lifecycle === chip.value
                  ? "border-teal/40 bg-teal/[0.1] text-teal-dark"
                  : "border-cream-dark/70 bg-white text-charcoal/65 hover:bg-cream-mid/30"
              }`}
            >
              {chip.label}
            </button>
          ))}
          {(["warning", "error", "critical"] as const).map((sev) => (
            <button
              key={sev}
              type="button"
              onClick={() => setFilter("severity", severity === sev ? "" : sev)}
              className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase transition ${
                severity === sev
                  ? "border-teal/40 bg-teal/[0.1] text-teal-dark"
                  : "border-cream-dark/70 bg-white text-charcoal/65 hover:bg-cream-mid/30"
              }`}
            >
              {sev}
            </button>
          ))}
        </div>
      </OperationalCard>

      <OperationalCard
        title="Failure inbox"
        meta={
          loading
            ? "Loading…"
            : data
              ? `${data.total} row${data.total === 1 ? "" : "s"} · page ${data.page}`
              : "—"
        }
      >
        {error ? (
          <p className="text-[13px] text-red-dark">{error}</p>
        ) : loading ? (
          <p className="text-[13px] text-charcoal/60">Loading operational failures…</p>
        ) : !data?.items.length ? (
          <SuperAdminEmptyPanel
            icon={TriangleAlert}
            eyebrow="Operations"
            title="No failures in this window"
            description="The inbox only lists real instrumented failure events from the last ~90 days. Adjust filters or reproduce a flow — nothing is synthesized here."
          />
        ) : (
          <ul className="divide-y divide-cream-dark/40">
            {data.items.map((row) => (
              <li key={row.id}>
                <button
                  type="button"
                  onClick={() => openDetail(row.id)}
                  className={`w-full py-4 first:pt-0 text-left transition hover:bg-cream-mid/20 -mx-2 px-2 rounded-lg ${
                    selectedEventId === row.id ? "bg-cream-mid/30 ring-1 ring-teal/20" : ""
                  }`}
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <time
                          dateTime={row.createdAt}
                          className="text-[11px] font-semibold uppercase tracking-[0.1em] text-charcoal/45"
                        >
                          {new Date(row.createdAt).toLocaleString(undefined, {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })}
                        </time>
                        <StatusPill variant={severityPillVariant(row.severity)}>{row.severity}</StatusPill>
                        <StatusPill variant={triagePillVariant(row.triage?.state ?? "new")}>
                          {row.triage?.state ?? "untriaged"}
                        </StatusPill>
                        <span className="text-[11px] font-mono text-charcoal/55">{row.type}</span>
                      </div>
                      <p className="text-[13px] font-semibold text-charcoal">{row.subtypeLabel}</p>
                      <p className="text-[13px] text-charcoal/75 leading-snug line-clamp-2">{row.message}</p>
                      <OperationalMetadataJumpLinks
                        metadata={{ entities: row.entityIds, ...row.entityIds }}
                        className="flex flex-wrap gap-x-3 gap-y-1"
                      />
                      {row.linkedIncidentIds.length > 0 ? (
                        <p className="text-[11px] text-amber-800/80">
                          Linked to {row.linkedIncidentIds.length} incident
                          {row.linkedIncidentIds.length === 1 ? "" : "s"}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap gap-1.5 shrink-0">
                      <StatusPill variant="neutral">{row.category}</StatusPill>
                      {row.webhookReceiptId ? <StatusPill variant="neutral">Receipt</StatusPill> : null}
                      {row.classification.retryable ? (
                        <StatusPill variant="neutral">Retryable</StatusPill>
                      ) : null}
                    </div>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}

        {data && data.total > data.pageSize ? (
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              disabled={data.page <= 1}
              onClick={() => setPage(data.page - 1)}
              className="rounded-lg border border-cream-dark/60 px-3 py-1.5 text-[12px] font-semibold disabled:opacity-40"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={data.page * data.pageSize >= data.total}
              onClick={() => setPage(data.page + 1)}
              className="rounded-lg border border-cream-dark/60 px-3 py-1.5 text-[12px] font-semibold disabled:opacity-40"
            >
              Next
            </button>
          </div>
        ) : null}
      </OperationalCard>

      {selectedEventId ? (
        <FailureDetailPanel
          eventId={selectedEventId}
          detail={selectedEventId === detail?.event.id ? detail : null}
          loading={detailLoading}
          onClose={closeDetail}
          onTriageUpdated={(next) => setDetail(next)}
        />
      ) : null}
    </div>
  );
}
