import type { LifecycleIntegrityFinding } from "@/lib/commerce/lifecycleIntegrity/types";
import type { ContainmentRecommendation, ContainmentSignalKind } from "./types";

const MAX_LINES = 6;
const MAX_EVIDENCE = 24;

const RUNBOOK_PAYMENTS = "docs/runbooks/payments-shipping-and-integrity.md";
const RUNBOOK_NOTIF = "docs/runbooks/notifications-webhooks-replay-and-backlog.md";

type KindPack = {
  kind: ContainmentSignalKind;
  severity: ContainmentRecommendation["severity"];
};

function classify(f: LifecycleIntegrityFinding): KindPack | null {
  switch (f.code) {
    case "PAID_LIKE_ORDER_WITHOUT_COMPLETED_PAYMENT":
      return { kind: "lifecycle.payment_shell_critical_drift", severity: "CRITICAL" };
    case "FULFILLMENT_PROGRESS_PRE_PAYMENT_SHELL":
      return { kind: "lifecycle.fulfillment_before_payment_shell", severity: "HIGH" };
    case "STALE_PENDING_PAYMENT_ORDER_SHELL":
    case "STALE_PENDING_PAYMENT_RECORD":
      return { kind: "lifecycle.payment_pipeline_stalled", severity: "HIGH" };
    case "REFUND_CASE_MISSING_PAYMENT_LINK":
    case "REFUND_CASE_PAYMENT_ORDER_MISMATCH":
      return { kind: "lifecycle.refund_linkage_break", severity: "HIGH" };
    default:
      if (f.severity === "HIGH") {
        return { kind: "lifecycle.coordinate_review_other_high", severity: "HIGH" };
      }
      if (f.severity === "WARNING") {
        return { kind: "lifecycle.coordinate_review_warning", severity: "WARNING" };
      }
      return null;
  }
}

function refLine(f: LifecycleIntegrityFinding): string {
  const id =
    f.entityRefs.commerceOrderId ??
    f.entityRefs.paymentRecordId ??
    f.entityRefs.notificationId ??
    f.entityRefs.shipmentId ??
    "";
  const suffix = id ? `:${id.slice(0, 12)}…` : "";
  return `${f.code}${suffix}`;
}

export function recommendationsFromLifecycleIntegrityFindings(findings: LifecycleIntegrityFinding[]): ContainmentRecommendation[] {
  const buckets = new Map<
    ContainmentSignalKind,
    {
      severity: ContainmentRecommendation["severity"];
      lines: Set<string>;
      evidence: Set<string>;
    }
  >();

  const rank: Record<ContainmentRecommendation["severity"], number> = {
    CRITICAL: 4,
    HIGH: 3,
    WARNING: 2,
    INFO: 1,
  };

  for (const f of findings) {
    const pack = classify(f);
    if (!pack) continue;
    const prev = buckets.get(pack.kind);
    if (!prev) {
      buckets.set(pack.kind, {
        severity: pack.severity,
        lines: new Set([`${f.message} (${f.code})`]),
        evidence: new Set([refLine(f)]),
      });
    } else {
      if (rank[pack.severity] > rank[prev.severity]) prev.severity = pack.severity;
      prev.lines.add(`${f.message} (${f.code})`);
      prev.evidence.add(refLine(f));
    }
  }

  const out: ContainmentRecommendation[] = [];

  const commonLinks = [
    "/super-admin/operations/lifecycle-integrity",
    "/super-admin/operations/payment-integrity",
    RUNBOOK_PAYMENTS,
  ];

  const kindMeta: Partial<
    Record<
      ContainmentSignalKind,
      {
        actions: string[];
        links: string[];
      }
    >
  > = {
    "lifecycle.payment_shell_critical_drift": {
      actions: [
        "Open payment integrity + affected orders; confirm Square/PSP truth before any manual shell transition.",
        "Correlate with webhook receipts and replay console only through existing super-admin flows (human-confirmed).",
      ],
      links: ["/super-admin/operations/payments", "/super-admin/operations/webhook-replay"],
    },
    "lifecycle.fulfillment_before_payment_shell": {
      actions: [
        "Validate whether fulfillment advanced under a still-pre-payment shell; check migration/race vs policy breach.",
        "Cross-check payment-integrity timeline and order-operations history before changing lifecycle fields.",
      ],
      links: ["/super-admin/operations/safety", "/super-admin/order-operations"],
    },
    "lifecycle.payment_pipeline_stalled": {
      actions: [
        "Triage stale pending_payment shells and pending PaymentRecord rows against webhook health + PSP dashboards.",
      ],
      links: ["/super-admin/operations/shippo-webhooks"],
    },
    "lifecycle.refund_linkage_break": {
      actions: [
        "Pause Square submission for affected refund cases until payment linkage is reconciled with finance/governance owners.",
      ],
      links: ["/super-admin/operations/payments"],
    },
    "lifecycle.coordinate_review_other_high": {
      actions: [
        "Review lifecycle scan rows in detail; confirm category (shipment/webhook/notification) before remediation.",
      ],
      links: [RUNBOOK_NOTIF],
    },
    "lifecycle.coordinate_review_warning": {
      actions: [
        "Validate warning-tier findings; many are conservative heuristics (carrier lag, orphan receipts, notification backlog).",
      ],
      links: ["/super-admin/operations/notifications-health", "/super-admin/operations/shippo-webhooks"],
    },
  };

  for (const [kind, bucket] of buckets) {
    const meta = kindMeta[kind];
    out.push({
      kind,
      severity: bucket.severity,
      rationale: [...bucket.lines].slice(0, MAX_LINES),
      evidenceRefs: [...bucket.evidence].slice(0, MAX_EVIDENCE),
      suggestedOperatorActions: meta?.actions ?? [
        "Review linked lifecycle-integrity rows and decide on manual follow-up via existing ops surfaces only.",
      ],
      relatedDashboardLinks: [...commonLinks, ...(meta?.links ?? [])],
    });
  }

  return out;
}
