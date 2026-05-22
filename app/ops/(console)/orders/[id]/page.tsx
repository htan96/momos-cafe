import Link from "next/link";
import { notFound } from "next/navigation";
import OpsPageHeader from "@/components/ops/OpsPageHeader";
import OperationalOrderConsole from "@/components/operations/order-console/OperationalOrderConsole";
import { getOpsSession } from "@/lib/ops/getOpsSession";
import { opsCan } from "@/lib/ops/permissions";
import { loadOperationalOrderConsole } from "@/lib/operations/orderConsole/loadOperationalOrderConsole";

export const dynamic = "force-dynamic";

const ORDER_ID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function OpsOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
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
    canRecovery: governanceDebug,
    canGovernanceDebug: governanceDebug,
  };

  const displayTitle =
    snapshot.metaLabels.orderLabel ?? `Commerce order · ${snapshot.order.id.slice(0, 8)}…`;

  return (
    <>
      <OpsPageHeader
        title={displayTitle}
        description="Fulfillment nucleus for this storefront shell — mirrored with super-admin order operations."
        actions={
          <Link href="/ops/orders" className="text-[12px] text-[#8FC4C4] hover:underline">
            ← All orders
          </Link>
        }
      />

      {!flags.canGovernanceDebug ?
        <p className="text-[11px] text-[#c9bba8]/80 border border-[#3d3830]/80 rounded-lg px-3 py-2 mb-4">
          Scoped recovery super-admin tooling (failures/live + audited POST retries) stays on the elevated workspace —
          fulfilment transitions above still obey your ops IAM (`fulfillment` / `shipping`).
        </p>
      : null}

      <OperationalOrderConsole audience="ops" snapshot={snapshot} flags={flags} />
    </>
  );
}
