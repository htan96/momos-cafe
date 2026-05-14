import OpsPageHeader from "@/components/operations/OpsPageHeader";
import OpsPanel from "@/components/operations/OpsPanel";
import OpsStatusPill from "@/components/operations/OpsStatusPill";
import ShipmentExceptionRow from "@/components/operations/ShipmentExceptionRow";
import WorkflowTimeline from "@/components/operations/WorkflowTimeline";
import { adminShipmentExceptions } from "@/lib/operations/mockAdminOps";

const shippoTiles = [
  { title: "Account", hint: "Child account · Vallejo storefront", badge: "in_progress", body: "Token rotation healthy — mock uptime line." },
  { title: "Carrier maps", hint: "USPS priority + UPS Ground", badge: "delivered", body: "Service levels aligned with quoting rules catalog." },
  { title: "Webhook inbox", hint: "Label + tracking deltas", badge: "exception", body: "Two delayed payloads — reconcile window 15m." },
] as const;

const carriers = [
  { name: "USPS Ground Advantage", selected: true, note: "Default retail ≤ 15 lb mock" },
  { name: "USPS Priority", selected: false, note: "Perishable surcharge rules (placeholder)" },
  { name: "UPS® Ground", selected: true, note: "Address validation enforced" },
] as const;

const labelSteps = [
  { id: "ls1", label: "Rates requested", meta: "Batch 004 · 7 parcels", at: "12:06", variant: "delivered" as const },
  { id: "ls2", label: "Purchase attempted", meta: "USPS timeout window", at: "12:07", variant: "exception" as const },
  { id: "ls3", label: "Retry scheduled", meta: "Automatic — policy 90s", at: "12:08", variant: "in_progress" as const },
  { id: "ls4", label: "Label ready", meta: "Pending success path", at: "—", variant: "queued" as const },
] as const;

export default function AdminShippingPage() {
  return (
    <div className="space-y-10">
      <OpsPageHeader
        title="Shipping & labels"
        subtitle="Shippo-flavored control room — mocks only (no outbound API reads or writes)."
      />

      <div className="grid gap-4 md:grid-cols-3">
        {shippoTiles.map((t) => (
          <OpsPanel key={t.title} title={t.title} eyebrow={t.hint}>
            <div className="flex justify-end mb-3">
              <OpsStatusPill variant={t.badge} />
            </div>
            <p className="text-[13px] text-charcoal/68 leading-relaxed">{t.body}</p>
          </OpsPanel>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <WorkflowTimeline eyebrow="Workbench" title="Label workflow (retry sample)" steps={[...labelSteps]} />
        <OpsPanel title="Carrier configuration" eyebrow="Routing preferences">
          <ul className="space-y-3">
            {carriers.map((c) => (
              <li
                key={c.name}
                className={`flex flex-col gap-1 rounded-xl border px-4 py-3 ${
                  c.selected ? "border-teal-dark/28 bg-teal/[0.04]" : "border-cream-dark/70 bg-white/80"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[14px] font-semibold text-charcoal">{c.name}</p>
                  {c.selected ? <OpsStatusPill variant="delivered">Primary</OpsStatusPill> : <OpsStatusPill variant="muted">Alt</OpsStatusPill>}
                </div>
                <p className="text-[12px] text-charcoal/58">{c.note}</p>
              </li>
            ))}
          </ul>
        </OpsPanel>
      </div>

      <OpsPanel title="Retry / exception samples" eyebrow="Observability" description="Copy-friendly rows for drills.">
        <div className="space-y-3">
          {adminShipmentExceptions.map((e) => (
            <ShipmentExceptionRow key={e.id} {...e} />
          ))}
        </div>
      </OpsPanel>
    </div>
  );
}
