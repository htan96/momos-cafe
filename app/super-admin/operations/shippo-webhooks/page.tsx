import Link from "next/link";
import OperationalBreadcrumbs from "@/components/super-admin/operations/OperationalBreadcrumbs";
import OperationalCrossLinks from "@/components/super-admin/operations/OperationalCrossLinks";
import OperationalEscalationBanner from "@/components/super-admin/operations/OperationalEscalationBanner";
import { shippoWebhookDriftOperationalContext } from "@/components/super-admin/operations/operationalIncidentPresets";
import { superAdminOperationsBreadcrumbs } from "@/components/super-admin/operations/superAdminOperationsBreadcrumbs";
import SuperAdminSectionIntro from "@/components/super-admin/SuperAdminSectionIntro";
import { loadShippoWebhookOperationalVisibility } from "@/lib/super-admin/loadShippoWebhookOperationalVisibility";
import { Anchor, Package } from "lucide-react";

export const dynamic = "force-dynamic";

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-cream-dark/50 bg-white p-4 shadow-sm">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-charcoal/55">{label}</div>
      <div className="mt-1 text-2xl font-bold tabular-nums text-charcoal">{value}</div>
    </div>
  );
}

export default async function SuperAdminShippoWebhooksOperationalPage() {
  const viz = await loadShippoWebhookOperationalVisibility();
  const shippoContext = shippoWebhookDriftOperationalContext();
  const orphanSignal = viz.counts.orphaned > 0 || viz.orphanRecent.length > 0;

  return (
    <div className="space-y-8">
      <OperationalBreadcrumbs segments={superAdminOperationsBreadcrumbs("Shippo webhooks")} className="-mb-2" />

      <OperationalEscalationBanner forceShow={orphanSignal} title="Receipt linkage · investigate">
        <p>
          Orphan Shippo receipts suggest tracking metadata could not be matched to local <span className="font-semibold">Shipment</span> rows — align carrier
          identifiers before replay, then cross-check lifecycle integrity.
        </p>
      </OperationalEscalationBanner>
      <SuperAdminSectionIntro
        icon={Anchor}
        title="Shippo webhooks — reconciliation integrity"
        subtitle="Receipt-backed visibility for the last 72 hours. Payload bodies are not persisted — use Shippo export or internal replay with operator-supplied JSON. Production ingress returns 503 when SHIPPO_WEBHOOK_SECRET is missing (fail-closed)."
        actions={
          <Link
            href="/super-admin/operations/deliveries"
            className="inline-flex items-center gap-1.5 rounded-lg border border-cream-dark/60 bg-white px-3 py-1.5 text-[12px] font-semibold text-charcoal/80 shadow-sm transition hover:bg-cream-mid/40"
          >
            <Package className="h-4 w-4" aria-hidden />
            Shipments ops
          </Link>
        }
      />

      <OperationalCrossLinks context={shippoContext} />

      <div className="rounded-lg border border-amber-200/90 bg-amber-50/80 px-4 py-3 text-[13px] text-charcoal/85">
        <strong className="font-semibold">Replay safety:</strong> use Shippo dashboard event logs or authenticated replay flows;
        replay must never spoof financial side effects handled outside Shippo. Orphan receipts mean tracking could not resolve a
        local <code className="text-[12px]">Shipment</code> row — align metadata / tracking numbers before re-posting.
      </div>

      <div>
        <p className="mb-3 text-[12px] text-charcoal/60">
          Window since {viz.since.toISOString()}
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <Stat label="Total receipts" value={viz.counts.total} />
          <Stat label="Processed" value={viz.counts.processed} />
          <Stat label="Failed (non-orphan)" value={Math.max(0, viz.counts.failed - viz.counts.orphaned)} />
          <Stat label="Orphans" value={viz.counts.orphaned} />
          <Stat label="Signature invalid" value={viz.counts.signatureInvalid} />
          <Stat label="Ignored events" value={viz.counts.ignored} />
        </div>
      </div>

      <WebhookTable title="Orphan webhook receipts (no local shipment match)" rows={viz.orphanRecent} />

      <WebhookTable title="Other failures (inspect errorCode)" rows={viz.failedRecent} />
    </div>
  );
}

function WebhookTable({
  title,
  rows,
}: {
  title: string;
  rows: Awaited<ReturnType<typeof loadShippoWebhookOperationalVisibility>>["orphanRecent"];
}) {
  return (
    <section className="space-y-2">
      <h2 className="text-[15px] font-semibold text-charcoal">{title}</h2>
      {rows.length === 0 ?
        <p className="text-[13px] text-charcoal/55">None in window.</p>
      : <div className="overflow-x-auto rounded-xl border border-cream-dark/50 bg-white shadow-sm">
          <table className="min-w-[960px] w-full border-collapse text-left text-[12px]">
            <thead className="border-b border-cream-dark/50 bg-cream-light/35 text-[11px] font-semibold uppercase tracking-wide text-charcoal/65">
              <tr>
                <th className="px-3 py-2">Received</th>
                <th className="px-3 py-2">External id</th>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Sig</th>
                <th className="px-3 py-2">HTTP</th>
                <th className="px-3 py-2">Error</th>
                <th className="px-3 py-2">Order id</th>
                <th className="px-3 py-2">Payload hash</th>
                <th className="px-3 py-2">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-dark/40">
              {rows.map((r) => (
                <tr key={r.id} className="bg-white hover:bg-cream-light/25">
                  <td className="whitespace-nowrap px-3 py-2 text-charcoal/80">{r.receivedAt.toISOString()}</td>
                  <td className="max-w-[180px] truncate px-3 py-2 font-mono text-[11px] text-charcoal/75">
                    {r.externalEventId ?? "—"}
                  </td>
                  <td className="max-w-[160px] truncate px-3 py-2 text-charcoal/75">{r.eventType ?? "—"}</td>
                  <td className="px-3 py-2 font-medium text-charcoal">{r.processingStatus}</td>
                  <td className="px-3 py-2">{r.signatureValid ? "yes" : "no"}</td>
                  <td className="px-3 py-2 tabular-nums">{r.httpStatus ?? "—"}</td>
                  <td className="max-w-[200px] truncate px-3 py-2 font-mono text-[11px] text-amber-800">
                    {r.errorCode ?? "—"}
                  </td>
                  <td className="max-w-[220px] truncate px-3 py-2 font-mono text-[11px] text-charcoal/80">
                    {r.commerceOrderId ?? "—"}
                  </td>
                  <td className="max-w-[120px] truncate px-3 py-2 font-mono text-[10px] text-charcoal/60">
                    {r.payloadHash ?? "—"}
                  </td>
                  <td className="truncate px-3 py-2 font-mono text-[10px] text-charcoal/55">{r.id}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      }
    </section>
  );
}
