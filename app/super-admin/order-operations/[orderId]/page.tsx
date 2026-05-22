import Link from "next/link";
import { notFound } from "next/navigation";
import GovPageHeader from "@/components/governance/GovPageHeader";
import OperationalOrderConsole from "@/components/operations/order-console/OperationalOrderConsole";
import { getOpsSession } from "@/lib/ops/getOpsSession";
import { opsCan } from "@/lib/ops/permissions";
import { loadOperationalOrderConsole } from "@/lib/operations/orderConsole/loadOperationalOrderConsole";

export const dynamic = "force-dynamic";

const ORDER_ID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function SuperAdminOrderDetailPage(props: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await props.params;
  if (!ORDER_ID_RE.test(orderId)) {
    notFound();
  }

  const [session, snapshot] = await Promise.all([
    getOpsSession(),
    loadOperationalOrderConsole(orderId, { includeLegacyCafeLookup: true }),
  ]);

  if (!snapshot?.order) {
    notFound();
  }

  const role = session?.role ?? "admin";
  const flags = {
    canFulfillmentWrite: session ? opsCan(role, "fulfillment:write") : false,
    canShippingWrite: session ? opsCan(role, "shipping:write") : false,
    canSupportWrite: session ? opsCan(role, "support:write") : false,
    canCommunicationsWrite:
      session ?
        opsCan(role, "communications:write") || opsCan(role, "support:write")
      : false,
    canRecovery: session?.roleBadge === "super_admin",
    canGovernanceDebug: session?.roleBadge === "super_admin",
  };

  const displayTitle = snapshot.metaLabels.orderLabel ?? `Order · ${snapshot.order.id.slice(0, 8)}…`;

  return (
    <div className="space-y-8">
      <GovPageHeader
        eyebrow="Platform · Commerce"
        title={displayTitle}
        subtitle={`Unified ops console (${snapshot.order.fulfillmentMode}) — payments, fulfillment, merged telemetry.`}
        actions={
          <div className="flex flex-wrap items-center justify-end gap-2">
            {flags.canRecovery ?
              <>
                <Link
                  href={`/super-admin/operations/failures?commerceOrderId=${encodeURIComponent(snapshot.order.id)}`}
                  className="rounded-lg border border-cream-dark/60 bg-white px-3 py-1.5 text-[12px] font-semibold text-charcoal/80 shadow-sm transition hover:bg-cream-mid/40"
                >
                  Failures inbox
                </Link>
                <Link
                  href={`/super-admin/live-activity?commerceOrderId=${encodeURIComponent(snapshot.order.id)}`}
                  className="rounded-lg border border-cream-dark/60 bg-white px-3 py-1.5 text-[12px] font-semibold text-charcoal/80 shadow-sm transition hover:bg-cream-mid/40"
                >
                  Live activity
                </Link>
              </>
            : null}
            <Link
              href="/super-admin/order-operations"
              className="rounded-lg border border-cream-dark/60 bg-white px-3 py-1.5 text-[12px] font-semibold text-charcoal/80 shadow-sm transition hover:bg-cream-mid/40"
            >
              All orders
            </Link>
          </div>
        }
      />

      <OperationalOrderConsole audience="super_admin" snapshot={snapshot} flags={flags} />
    </div>
  );
}
