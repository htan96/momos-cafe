import Link from "next/link";
import { assertAdminPlatformLayout } from "@/lib/auth/cognito/assertRoleInLayout";
import { loadAdminCateringKanban } from "@/lib/admin/adminConsoleLoaders";
import CateringSuperAdminTechnicalPanel from "@/components/admin/catering/CateringSuperAdminTechnicalPanel";
import OpsPageHeader from "@/components/operations/OpsPageHeader";
import OpsPanel from "@/components/operations/OpsPanel";

export const dynamic = "force-dynamic";

export default async function AdminCateringOrdersPage() {
  const [{ showSuperAdminOperationalLens }, board] = await Promise.all([
    assertAdminPlatformLayout(),
    loadAdminCateringKanban(),
  ]);

  return (
    <div className="space-y-8">
      <OpsPageHeader
        title="Catering operations"
        subtitle="Track inbound events from web intake across four simple milestones."
      />

      <OpsPanel pad={false} className="overflow-hidden">
        <div className="p-5 md:p-6 pb-6 border-b border-cream-dark/60">
          <h2 className="font-display text-lg text-charcoal">Pipeline board</h2>
          <p className="text-[13px] text-charcoal/60 mt-1">
            Open a lane card to capture notes or move the inquiry between stages.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-0 divide-y sm:divide-y-0 sm:divide-x divide-cream-dark/60">
          {board.columns.map((col, idx) => (
            <div
              key={col.id}
              className="p-4 md:p-5 flex flex-col min-h-[320px]"
              style={{
                background: idx % 2 ? "rgba(255,255,255,.45)" : "rgba(246,239,229,.42)",
              }}
              title={col.laneTooltip}
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
                    <li key={c.id} title={c.statusTooltip}>
                      <Link
                        href={`/admin/catering-inquiries/${c.id}`}
                        className="block rounded-xl border border-cream-dark/75 bg-white/90 shadow-sm px-3 py-3 hover:border-teal-dark/35 transition-colors"
                      >
                        <div className="flex justify-between gap-2 items-start">
                          <p className="text-[13px] font-semibold text-charcoal leading-snug flex-1 min-w-0">
                            {c.primaryLine}
                          </p>
                          {c.duplicateFoldCount ?
                            <span
                              className="shrink-0 rounded-full bg-charcoal/[0.08] px-2 py-[2px] text-[10px] font-semibold uppercase tracking-[0.1em] text-charcoal/60"
                              title="Multiple rows shared this inquiry—collapsed to one lane card."
                            >
                              ×{c.duplicateFoldCount}
                            </span>
                          : null}
                        </div>
                      </Link>
                    </li>
                  ))
                )}
              </ul>
            </div>
          ))}
        </div>

        {showSuperAdminOperationalLens ?
          (
            <>
              <p className="px-5 md:px-6 pb-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-charcoal/45">
                Super-admin · technical detail
              </p>
              <div className="px-5 md:px-6 pb-6">
                <CateringSuperAdminTechnicalPanel
                  prismaRowCount={board.prismaRowCount}
                  distinctInquiryCount={board.distinctInquiryCount}
                />
              </div>
            </>
          )
        : null}
      </OpsPanel>
    </div>
  );
}
