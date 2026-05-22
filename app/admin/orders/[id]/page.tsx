import Link from "next/link";
import { notFound } from "next/navigation";
import OpsPageHeader from "@/components/operations/OpsPageHeader";
import OperationalOrderConsole from "@/components/operations/order-console/OperationalOrderConsole";
import { getOpsSession } from "@/lib/ops/getOpsSession";
import { opsCan } from "@/lib/ops/permissions";
import { loadOperationalOrderConsole } from "@/lib/operations/orderConsole/loadOperationalOrderConsole";

export const dynamic = "force-dynamic";

const ORDER_ID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function AdminOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  if (!ORDER_ID_RE.test(id)) notFound();

  const session = await getOpsSession();
  if (!session) notFound();

  const governanceDebug = session.roleBadge === "super_admin";
  const snapshot = await loadOperationalOrderConsole(id, {
    includeLegacyCafeLookup: governanceDebug,
  });

  if (!snapshot?.order) notFound();

  const flags = {
    canFulfillmentWrite: opsCan(session.role, "fulfillment:write"),
    canShippingWrite: opsCan(session.role, "shipping:write"),
    canSupportWrite: opsCan(session.role, "support:write"),
    canCommunicationsWrite:
      opsCan(session.role, "communications:write") || opsCan(session.role, "support:write"),
    canRecovery: governanceDebug,
    canGovernanceDebug: governanceDebug,
  };

  const displayTitle =
    snapshot.metaLabels.orderLabel ?? `Commerce order · ${snapshot.order.id.slice(0, 8)}…`;

  return (
    <div className="space-y-8">
      <OpsPageHeader
        title={displayTitle}
        subtitle="Fulfillment nucleus for this storefront row — mirrored with `/super-admin/order-operations/[id]` tooling."
        actions={
          <Link
            href="/admin/orders"
            className="rounded-lg border border-cream-dark bg-white px-3 py-2 text-[12px] font-semibold text-charcoal/80 uppercase tracking-[0.1em] hover:bg-cream/80 transition-colors"
          >
            ← All orders
          </Link>
        }
      />

      {!flags.canGovernanceDebug ?
        <p className="text-[12px] text-charcoal/60 border border-cream-dark/70 rounded-xl px-4 py-3 bg-white/72">
          Super-admin audited recovery tooling stays on `/super-admin` — fulfilment confirmations and scripted transitions obey
          the same IAM matrix from this workspace.
        </p>
      : null}

      <OperationalOrderConsole audience="admin" snapshot={snapshot} flags={flags} />
    </div>
  );
}
