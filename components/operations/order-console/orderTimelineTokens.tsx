import type { OperationalActivitySeverity } from "@prisma/client";
import StatusPill, { type StatusPillVariant } from "@/components/governance/StatusPill";
import type { OperationalTimelineEntry } from "@/lib/operations/orderConsole/loadOperationalOrderConsole";
import { PLATFORM_EVENT_SUBTYPE } from "@/lib/platform/events/taxonomy";

export type TimelineBucket = "payment" | "fulfillment" | "webhook" | "recovery" | "notification" | "other";

export function bucketForTimelineRow(entry: OperationalTimelineEntry): TimelineBucket {
  if (entry.kind === "notification") return "notification";
  if (entry.kind === "webhook_receipt") return "webhook";
  const type = entry.row.type.toLowerCase();
  if (/payment|register|psp|square/.test(type)) return "payment";
  if (/shipment|label|delivery|kitchen|pickup|catering|merch/.test(type)) return "fulfillment";
  if (
    entry.row.type.includes("WEBHOOK") ||
    type.includes("webhook") ||
    type.includes("signature") ||
    entry.row.type === PLATFORM_EVENT_SUBTYPE.SECURITY_WEBHOOK_SIGNATURE_INVALID
  ) {
    return "webhook";
  }
  if (/orphan|reconcile|recovery|catalog|lookup|retry/.test(type)) return "recovery";
  return "other";
}

export function bucketLabel(bucket: TimelineBucket): string {
  switch (bucket) {
    case "payment":
      return "Payment";
    case "fulfillment":
      return "Fulfillment";
    case "webhook":
      return "Webhook";
    case "recovery":
      return "Recovery";
    case "notification":
      return "Notification";
    default:
      return "Other";
  }
}

export function bucketPillClass(bucket: TimelineBucket): string {
  switch (bucket) {
    case "payment":
      return "bg-teal-dark/15 text-teal-dark border-teal-dark/35";
    case "fulfillment":
      return "bg-amber-100/80 text-amber-900 border-amber-200/80";
    case "webhook":
      return "bg-violet-100/85 text-violet-900 border-violet-200/70";
    case "recovery":
      return "bg-rose-100/85 text-rose-900 border-rose-200/70";
    case "notification":
      return "bg-sky-100/85 text-sky-950 border-sky-200/70";
    default:
      return "bg-charcoal/5 text-charcoal/65 border-charcoal/15";
  }
}

export function severityPillVariant(sev: OperationalActivitySeverity): StatusPillVariant {
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

export function WebhookReceiptStatusPill({
  receipt,
}: {
  receipt: { signatureValid: boolean; processingStatus: string };
}) {
  const variant: StatusPillVariant = receipt.signatureValid ? "neutral" : "critical";
  return (
    <div className="flex flex-wrap items-center gap-2">
      <StatusPill variant={variant}>{receipt.signatureValid ? "sig ok" : "sig bad"}</StatusPill>
      <span className="text-[11px] font-mono text-charcoal/55">{receipt.processingStatus}</span>
    </div>
  );
}
