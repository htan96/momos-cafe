import OpsPageHeader from "@/components/operations/OpsPageHeader";
import OpsPanel from "@/components/operations/OpsPanel";
import { adminCommThreads } from "@/lib/operations/mockAdminOps";

export default function AdminCommunicationsPage() {
  return (
    <div className="space-y-8">
      <OpsPageHeader title="Communications timeline" subtitle="Threaded mocks — aligns with transactional email workflows in code paths." />

      <div className="space-y-5">
        {adminCommThreads.map((th) => (
          <OpsPanel key={th.id} title={th.subject} eyebrow={`Anchor · ${th.anchor}`}>
            <div className="flex justify-between gap-4 text-[12px] text-charcoal/48 mb-4">
              <span>{th.lastAt}</span>
            </div>
            <div className="space-y-0 border border-cream-dark/60 rounded-xl overflow-hidden">
              {th.messages.map((m, i) => (
                <div
                  key={m.id}
                  className={`px-4 py-3 grid gap-1 sm:grid-cols-[120px_1fr] ${i !== th.messages.length - 1 ? "border-b border-cream-dark/50" : ""} ${
                    i % 2 === 0 ? "bg-white/90" : "bg-cream/[0.38]"
                  }`}
                >
                  <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-teal-dark/85">{m.from}</span>
                  <div>
                    <p className="text-[13px] text-charcoal/80 leading-snug">{m.snippet}</p>
                    <p className="text-[10px] text-charcoal/40 mt-1">{m.at}</p>
                  </div>
                </div>
              ))}
            </div>
          </OpsPanel>
        ))}
      </div>
    </div>
  );
}
