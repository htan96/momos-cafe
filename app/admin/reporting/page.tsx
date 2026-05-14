import OpsMetricQuiet from "@/components/operations/OpsMetricQuiet";
import OpsPageHeader from "@/components/operations/OpsPageHeader";
import OpsPanel from "@/components/operations/OpsPanel";
import { adminReportingPanels } from "@/lib/operations/mockAdminOps";

export default function AdminReportingPage() {
  return (
    <div className="space-y-8">
      <OpsPageHeader title="Operational reporting" subtitle="Action-first signals — intentionally light on chrome; export hooks later." />

      <OpsPanel eyebrow="Today" title="Throughput snapshot">
        <div className="grid gap-3 sm:grid-cols-3">
          <OpsMetricQuiet label="Touched SLA" value="87%" hint="Rolling 24h · mock calc" />
          <OpsMetricQuiet label="Outbound holds" value="3" hint="Carrier + address" />
          <OpsMetricQuiet label="Catering on-time" value="92%" hint="Prep window fidelity" />
        </div>
      </OpsPanel>

      <div className="grid gap-5 lg:grid-cols-3">
        {adminReportingPanels.map((p) => (
          <OpsPanel key={p.id} title={p.title} description={p.subtitle}>
            <p className="text-[22px] font-display text-charcoal">{p.metricPrimary}</p>
            <p className="text-[13px] text-charcoal/62 mt-2 leading-snug">{p.metricSecondary}</p>
            <div className="mt-5 rounded-full bg-cream-dark/55 h-2 overflow-hidden" aria-hidden>
              <div
                className="h-full rounded-full bg-gradient-to-r from-teal/45 to-teal-dark/65"
                style={{ width: `${Math.round(p.barHint * 100)}%`, opacity: 0.72 }}
              />
            </div>
          </OpsPanel>
        ))}
      </div>
    </div>
  );
}
