import "server-only";

import { OPERATIONAL_MS_PER_HOUR } from "@/lib/operations/semantics/constants";
import { OPERATIONAL_FOUR_TIER_SEVERITY_RANK as SEVERITY_RANK } from "@/lib/operations/semantics/severity";
import { countIntegritySurfaceClassifications, withLifecycleIntegrityAuthorityOverlay } from "@/lib/commerce/lifecycleAuthority/classifyDerivedState";
import {
  LIFECYCLE_AUTHORITY_DEPENDENCY_EDGES,
  LIFECYCLE_AUTHORITY_GRAPH_BULLETS,
} from "@/lib/commerce/lifecycleAuthority/lifecycleAuthorityGraph";
import type { DerivedStateClassification } from "@/lib/commerce/lifecycleAuthority/types";
import type { LifecycleIntegrityFinding, LifecycleIntegritySeverity } from "@/lib/commerce/lifecycleIntegrity/types";
import { scanCommerceLifecycleIntegrity } from "@/lib/commerce/lifecycleIntegrity/scanCommerceLifecycleIntegrity";
import {
  findFulfillmentAheadOfPrePaymentShellOrders,
  findPaidLikeOrdersWithoutCompletedPayment,
  findStalePendingPaymentOrdersForIntegrity,
  findStalePendingPaymentRecordsForIntegrity,
  readPaymentIntegrityStaleHoursFromEnv,
  scanOperationalRefundLinkageOddities,
} from "@/lib/super-admin/paymentIntegrity/queries";

/**
 * Super-admin **lifecycle coordination** visibility across commerce orders, payments, fulfillment, refunds,
 * shipments, and notification outbox — read-only. Does not mutate data or invoke reconcile/webhook handlers.
 *
 * @module
 */



export type LifecycleAuthorityMapSection = {
  /** Repository-relative path (not a browser route) — open from source checkout. */
  docRelativePath: string;
  dependencyEdgeCount: number;
  summaryBullets: readonly string[];
  /** Heuristic counts on deduped findings (category → classifier); for operator triage, not financial truth. */
  integritySurfaceClassificationCounts: Record<DerivedStateClassification, number>;
};

export type LifecycleIntegrityReport = {
  generatedAt: string;
  stalePendingHoursConfigured: number;
  summary: Record<LifecycleIntegritySeverity, number>;
  worstSeverity: LifecycleIntegritySeverity | "NONE";
  findings: LifecycleIntegrityFinding[];
  meta: { findingsBeforeDedupe: number; findingsAfterDedupe: number };
  authorityMap: LifecycleAuthorityMapSection;
};

export function lifecycleFindingDedupeKey(f: LifecycleIntegrityFinding): string {
  const pairs = Object.entries(f.entityRefs)
    .filter(([, v]) => v != null && String(v).trim() !== "")
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}:${String(v)}`);
  return `${f.code}|${pairs.join(";")}`;
}

function dedupeFindings(rows: LifecycleIntegrityFinding[]): LifecycleIntegrityFinding[] {
  const seen = new Map<string, LifecycleIntegrityFinding>();
  for (const f of rows) {
    const k = lifecycleFindingDedupeKey(f);
    const prev = seen.get(k);
    if (!prev || SEVERITY_RANK[f.severity] > SEVERITY_RANK[prev.severity]) {
      seen.set(k, f);
    }
  }
  return [...seen.values()].sort((a, b) => {
    const dr = SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity];
    if (dr !== 0) return dr;
    return a.code.localeCompare(b.code);
  });
}

function summarize(rows: LifecycleIntegrityFinding[]): {
  summary: Record<LifecycleIntegritySeverity, number>;
  worst: LifecycleIntegritySeverity | "NONE";
} {
  const summary: Record<LifecycleIntegritySeverity, number> = {
    CRITICAL: 0,
    HIGH: 0,
    WARNING: 0,
    INFO: 0,
  };
  let worst: LifecycleIntegritySeverity | "NONE" = "NONE";
  let worstRank = 0;
  for (const r of rows) {
    summary[r.severity]++;
    const rk = SEVERITY_RANK[r.severity];
    if (rk > worstRank) {
      worstRank = rk;
      worst = r.severity;
    }
  }
  return { summary, worst };
}

export async function loadLifecycleIntegrityReport(): Promise<LifecycleIntegrityReport> {
  const now = Date.now();
  const staleHours = readPaymentIntegrityStaleHoursFromEnv();
  const stalePendingSince = new Date(now - staleHours * OPERATIONAL_MS_PER_HOUR);

  const [paidLike, staleOrders, staleRecords, fulfillmentAhead, refundScan] = await Promise.all([
    findPaidLikeOrdersWithoutCompletedPayment(),
    findStalePendingPaymentOrdersForIntegrity(stalePendingSince),
    findStalePendingPaymentRecordsForIntegrity(stalePendingSince),
    findFulfillmentAheadOfPrePaymentShellOrders(),
    scanOperationalRefundLinkageOddities(),
  ]);

  const raw = await scanCommerceLifecycleIntegrity({
    paidLikeWithoutCompleted: paidLike,
    stalePendingPaymentOrders: staleOrders,
    stalePendingPaymentRecords: staleRecords,
    fulfillmentAheadOfPrePayment: fulfillmentAhead,
    refundOddities: refundScan.sampleRows.map((r) => ({
      id: r.id,
      commerceOrderId: r.commerceOrderId,
      paymentRecordId: r.paymentRecordId,
      linkedOrderId: r.linkedOrderId,
      reasonTag: r.reasonTag,
    })),
  });

  const findings = withLifecycleIntegrityAuthorityOverlay(dedupeFindings(raw));
  const { summary, worst } = summarize(findings);

  return {
    generatedAt: new Date(now).toISOString(),
    stalePendingHoursConfigured: staleHours,
    summary,
    worstSeverity: worst,
    findings,
    meta: { findingsBeforeDedupe: raw.length, findingsAfterDedupe: findings.length },
    authorityMap: {
      docRelativePath: "docs/architecture/commerce-lifecycle-authority.md",
      dependencyEdgeCount: LIFECYCLE_AUTHORITY_DEPENDENCY_EDGES.length,
      summaryBullets: LIFECYCLE_AUTHORITY_GRAPH_BULLETS,
      integritySurfaceClassificationCounts: countIntegritySurfaceClassifications(findings),
    },
  };
}
