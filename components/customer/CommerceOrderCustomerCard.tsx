import CustomerOrderCard, { type CustomerStatusVariant } from "@/components/customer/CustomerOrderCard";
import type { LoadedCommerceAccountOrder } from "@/lib/account/dashboardData";
import { formatMoney } from "@/lib/commerce/fulfillmentPreview";
import {
  formatOrderInstant,
  groupStatusHeadline,
  orderDisplayNumber,
  pipelineLabel,
} from "@/lib/account/orderPresentation";

function deriveStatus(row: LoadedCommerceAccountOrder): CustomerStatusVariant {
  if (row.status === "cancelled") return "exception";
  const groups = row.fulfillmentGroups;
  if (groups.length === 0) return "preparing";

  const allTerminal = groups.every((g) => g.status === "completed" || g.status === "cancelled");
  if (allTerminal) return "delivered";

  const hasDelayRisk = groups.some((g) =>
    g.shipments.some((s) => s.status && ["exception", "failure", "error"].includes(s.status.toLowerCase()))
  );
  if (hasDelayRisk) return "exception";

  const shipped = groups.some(
    (g) =>
      g.status === "shipped" ||
      g.shipments.some((s) => Boolean(s.shippedAt) || Boolean(s.trackingNumber))
  );
  if (shipped) return "shipped";

  const catering = groups.some((g) => g.pipeline.toUpperCase() === "CATERING");
  if (catering && !groups.every((g) => g.status === "completed")) return "scheduled";

  return "preparing";
}

function reassuranceFromRow(row: LoadedCommerceAccountOrder): string {
  const g = row.fulfillmentGroups[0];
  if (!g) return "We’ll keep this page updated as your visit comes together.";
  const line = groupStatusHeadline(g.pipeline, g.status);
  if (g.estimatedReadyAt && g.pipeline.toUpperCase() === "KITCHEN") {
    return `${line} — we’re aiming for around ${formatOrderInstant(g.estimatedReadyAt)}.`;
  }
  if (g.pipeline.toUpperCase() === "RETAIL" && g.status === "shipped") {
    return "Your package is en route — tracking updates will land here first.";
  }
  return `${line} — sit tight, we’ll nudge you when the next beat happens.`;
}

export default function CommerceOrderCustomerCard({ row }: { row: LoadedCommerceAccountOrder }) {
  const num = String(orderDisplayNumber(row.id));
  const badges = row.fulfillmentGroups.map((g) => pipelineLabel(g.pipeline));
  const placed = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(row.createdAt);

  const summary =
    row.fulfillmentGroups.length === 0
      ? "Order details"
      : `${row.fulfillmentGroups.length} way${row.fulfillmentGroups.length === 1 ? "" : "s"} your order comes together`;

  return (
    <CustomerOrderCard
      href={`/account/orders/${row.id}`}
      orderNumber={num}
      placedAt={placed}
      summary={summary}
      totalLabel={formatMoney(row.totalCents / 100)}
      status={deriveStatus(row)}
      etaReassurance={reassuranceFromRow(row)}
      pipelineBadges={badges.length ? badges : undefined}
    />
  );
}
