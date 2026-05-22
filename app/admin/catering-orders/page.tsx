import OpsPageHeader from "@/components/operations/OpsPageHeader";
import OpsPanel from "@/components/operations/OpsPanel";
import OpsStatusPill from "@/components/operations/OpsStatusPill";
import { loadAdminCateringKanban } from "@/lib/admin/adminConsoleLoaders";

export default async function AdminCateringOrdersPage() {
  const board = await loadAdminCateringKanban();

  return (
    <div className="space-y-8">
      <OpsPageHeader
        title="Catering operations"
        subtitle="Hydrated CateringInquiry rows grouped by CateringInquiryStatus."
      />

      <OpsPanel pad={false} className="overflow-hidden">
        <div className="p-5 md:p-6 pb-6 border-b border-cream-dark/60">
          <h2 className="font-display text-lg text-charcoal">Pipeline board</h2>
          <p className="text-[13px] text-charcoal/60 mt-1">
            Mirrors database enum states — staffing assignments stay on CateringInquiry.assigned_to.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-0 divide-y sm:divide-y-0 sm:divide-x divide-cream-dark/60">
          {board.map((col, idx) => (
            <div
              key={col.id}
              className="p-4 md:p-5 flex flex-col min-h-[320px]"
              style={{ background: idx % 2 ? "rgba(255,255,255,.45)" : "rgba(246,239,229,.42)" }}
            >
              <div className="mb-4">
                <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-teal-dark">{col.title}</p>
                <p className="text-[11px] text-charcoal/50 mt-1">{col.hint}</p>
              </div>
              <ul className="space-y-3 flex-1">
                {col.cards.length === 0 ? (
                  <li className="text-[12px] text-charcoal/50 italic">Empty lane</li>
                ) : (
                  col.cards.map((c) => (
                    <li key={c.id} className="rounded-xl border border-cream-dark/75 bg-white/90 shadow-sm px-3 py-3">
                      <div className="flex justify-between gap-2 items-start">
                        <p className="text-[13px] font-semibold text-charcoal leading-snug">{c.title}</p>
                        <OpsStatusPill variant={c.variant} />
                      </div>
                      <p className="text-[11px] text-charcoal/50 mt-1">{c.guest}</p>
                      <p className="text-[11px] text-teal-dark/85 mt-2">{c.pickupWindow}</p>
                      <p className="text-[10px] text-charcoal/45 mt-2 uppercase tracking-[0.12em]">{c.headcount}</p>
                    </li>
                  ))
                )}
              </ul>
            </div>
          ))}
        </div>
      </OpsPanel>
    </div>
  );
}
