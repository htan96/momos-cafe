import GovPageHeader from "@/components/governance/GovPageHeader";
import OperationalCard from "@/components/governance/OperationalCard";
import { COMMUNICATION_GOVERNANCE_CATALOG_ROWS } from "@/lib/governance/communicationRegistryCatalog";

export const dynamic = "force-dynamic";

export default function CommunicationGovernanceRegistryPage() {
  return (
    <div className="space-y-10">
      <GovPageHeader
        eyebrow="Platform · Governance"
        title="Communication registry"
        subtitle="Static catalog of transactional scaffolding, SES routing notes, orchestration workflows, and owner boundaries."
      />

      <OperationalCard title="Operational communications map" meta="Transaction stubs · SES · PSP boundaries">
        <p className="text-[13px] text-charcoal/70 mb-6 leading-relaxed">
          Derived from codebase sources — not a mailbox or campaign UI. Operational timelines under `/ops`/`/super-admin/order-operations`
          merge Momos SES application mail, Postgres email threads, webhook receipts for ses/resend adapters, queued notification
          payloads, plus internal coordination notes (<code className="text-[11px]">OperationalCommunicationNote</code>).
        </p>

        <div className="overflow-x-auto rounded-lg border border-cream-dark/50">
          <table className="w-full text-left text-[13px] min-w-[56rem]">
            <thead className="border-b border-cream-dark/50 bg-cream-mid/20 text-[11px] uppercase tracking-[0.08em] text-charcoal/50">
              <tr>
                <th className="px-3 py-2 font-semibold">Group</th>
                <th className="px-3 py-2 font-semibold">Template key / artifact</th>
                <th className="px-3 py-2 font-semibold">Trigger</th>
                <th className="px-3 py-2 font-semibold">Owner</th>
                <th className="px-3 py-2 font-semibold">Transport</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-dark/40">
              {COMMUNICATION_GOVERNANCE_CATALOG_ROWS.map((r) => (
                <tr key={`${r.group}:${r.templateOrRouteKey}`} className="bg-white/80 align-top">
                  <td className="px-3 py-2 whitespace-nowrap text-[12px] font-semibold text-charcoal">{r.group}</td>
                  <td className="px-3 py-2 font-mono text-[11px] text-charcoal break-all">{r.templateOrRouteKey}</td>
                  <td className="px-3 py-2 text-charcoal/80">{r.trigger}</td>
                  <td className="px-3 py-2 text-charcoal/80">{r.owner}</td>
                  <td className="px-3 py-2 text-charcoal/80">{r.transport}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </OperationalCard>
    </div>
  );
}
