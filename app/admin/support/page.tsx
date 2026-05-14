import OpsPageHeader from "@/components/operations/OpsPageHeader";
import OpsPanel from "@/components/operations/OpsPanel";
import OpsStatusPill from "@/components/operations/OpsStatusPill";
import { adminSupportTickets } from "@/lib/operations/mockAdminOps";

export default function AdminSupportPage() {
  return (
    <div className="space-y-8">
      <OpsPageHeader title="Support inbox" subtitle="Severity-aware queue — escalate with calm signals, not sirens." />

      <OpsPanel title="Queued tickets · mock">
        <ul className="divide-y divide-cream-dark/50">
          {adminSupportTickets.map((t) => (
            <li key={t.id} className="py-4 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-start">
              <div className="min-w-0">
                <p className="text-[11px] font-mono text-charcoal/45">{t.id}</p>
                <p className="text-[14px] font-semibold text-charcoal mt-1">{t.subject}</p>
                <p className="text-[13px] text-charcoal/60 mt-2">
                  {t.guest} · via {t.channel}
                </p>
              </div>
              <div className="flex flex-col gap-2 sm:items-end">
                <OpsStatusPill variant={t.severity}>Tier signal</OpsStatusPill>
                <span className="text-[11px] text-charcoal/45">Opened {t.openedAt}</span>
              </div>
            </li>
          ))}
        </ul>
      </OpsPanel>

      <OpsPanel title="Internal notes placeholder" eyebrow="Draft scaffold">
        <textarea
          readOnly
          rows={6}
          className="w-full rounded-xl border border-cream-dark bg-cream/55 px-3 py-2.5 text-[13px] text-charcoal/60 cursor-default resize-none outline-none ring-0"
          placeholder="Internal notes textarea — persisted notes would land here via workflow."
        />
        <p className="text-[11px] text-charcoal/45 mt-3">Disabled styling until capture rules exist.</p>
      </OpsPanel>
    </div>
  );
}
