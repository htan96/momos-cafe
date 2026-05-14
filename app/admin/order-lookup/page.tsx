import OpsPageHeader from "@/components/operations/OpsPageHeader";
import OpsPanel from "@/components/operations/OpsPanel";
import WorkflowTimeline from "@/components/operations/WorkflowTimeline";
import { adminOrderLookupMock } from "@/lib/operations/mockAdminOps";

export default function AdminOrderLookupPage() {
  const m = adminOrderLookupMock;
  return (
    <div className="space-y-8">
      <OpsPageHeader title="Order lookup" subtitle="Search scaffolding only — wire guarded reads when APIs are ready." />

      <OpsPanel title="Search" eyebrow="Identifiers">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="flex-1 space-y-1">
            <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-charcoal/45">Query</span>
            <input
              disabled
              placeholder={m.queryExample}
              className="w-full rounded-lg border border-cream-dark bg-cream/50 px-3 py-2.5 text-[14px] text-charcoal/55 cursor-not-allowed"
            />
          </label>
          <button
            type="button"
            disabled
            className="rounded-lg border border-cream-dark/80 bg-white px-4 py-2.5 text-[12px] font-semibold uppercase tracking-[0.12em] text-charcoal/35 cursor-not-allowed"
          >
            Search
          </button>
        </div>
      </OpsPanel>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <WorkflowTimeline eyebrow="Lifecycle" title="Order · mock detail" steps={m.lifecycle} />

        <OpsPanel title="Case file" eyebrow="Ops notes">
          <p className="text-[13px] text-charcoal/70">
            <span className="font-semibold text-charcoal">{m.orderRef}</span> · {m.placedAt}
          </p>
          <p className="text-[12px] text-charcoal/55 mt-1">{m.channel}</p>
          <ul className="mt-4 space-y-2 text-[13px] text-charcoal/75">
            {m.lines.map((line) => (
              <li key={line} className="rounded-lg border border-cream-dark/65 bg-cream/[0.28] px-3 py-2">
                {line}
              </li>
            ))}
          </ul>
          <div className="mt-6 space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-charcoal/45">Notes</p>
            {m.notes.map((n) => (
              <blockquote key={n.id} className="border-l-2 border-gold/55 pl-3 text-[13px] text-charcoal/75">
                <p className="text-[11px] text-charcoal/45 mb-1">
                  {n.author} · {n.at}
                </p>
                {n.body}
              </blockquote>
            ))}
          </div>
        </OpsPanel>
      </div>

      <OpsPanel title="Escalation" eyebrow={m.escalation.tier}>
        <p className="text-[13px] text-charcoal/75 leading-relaxed">{m.escalation.nextStep}</p>
        <p className="text-[12px] text-charcoal/50 mt-2">Owner placeholder · {m.escalation.owner}</p>
      </OpsPanel>
    </div>
  );
}
