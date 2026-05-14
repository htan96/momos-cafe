import GovPageHeader from "@/components/governance/GovPageHeader";
import StatusPill from "@/components/governance/StatusPill";
import { mockAdminDirectory } from "@/lib/governance/mockSuperAdmin";

export default function SuperAdminAdminsPage() {
  return (
    <div className="space-y-8">
      <GovPageHeader
        eyebrow="Directory"
        title="Privileged operators"
        subtitle="Console roster placeholders — invitation and activity columns scaffold compliance reviews."
      />

      <div className="rounded-2xl border border-cream-dark/70 bg-white/[0.94] shadow-sm overflow-hidden">
        <div
          className="hidden md:grid md:grid-cols-12 md:gap-4 px-5 py-3 border-b border-cream-dark/60 bg-cream-mid/30 text-[11px] font-semibold uppercase tracking-[0.14em] text-charcoal/50"
          role="rowgroup"
        >
          <div className="md:col-span-3">Name</div>
          <div className="md:col-span-3">Email</div>
          <div className="md:col-span-2">Roles</div>
          <div className="md:col-span-2">Last activity</div>
          <div className="md:col-span-2 text-right md:text-left">Status</div>
        </div>

        <div className="divide-y divide-cream-dark/45">
          {mockAdminDirectory.map((row) => (
            <div
              key={row.id}
              className="grid grid-cols-1 gap-3 px-5 py-4 md:grid-cols-12 md:gap-4 md:items-center"
              role="row"
            >
              <div className="md:col-span-3">
                <p className="font-display text-[16px] text-teal-dark md:hidden">Name</p>
                <p className="text-[14px] font-semibold text-charcoal">{row.name}</p>
                {row.invitationPending ? (
                  <p className="text-[11px] text-charcoal/50 mt-0.5">Invitation pending · token issued</p>
                ) : null}
              </div>
              <div className="md:col-span-3">
                <p className="font-display text-[14px] text-teal-dark/80 md:hidden">Email</p>
                <p className="text-[13px] text-charcoal/75 break-all">{row.email}</p>
              </div>
              <div className="md:col-span-2">
                <p className="font-display text-[14px] text-teal-dark/80 md:hidden">Roles</p>
                <div className="flex flex-wrap gap-1">
                  {row.roles.length ? (
                    row.roles.map((r) => (
                      <span key={r} className="text-[11px] font-semibold uppercase tracking-[0.1em] rounded-md border border-cream-dark bg-cream-mid/40 px-2 py-0.5 text-charcoal/75">
                        {r}
                      </span>
                    ))
                  ) : (
                    <span className="text-[12px] text-charcoal/45">Awaiting acceptance</span>
                  )}
                </div>
              </div>
              <div className="md:col-span-2">
                <p className="font-display text-[14px] text-teal-dark/80 md:hidden">Last activity</p>
                <p className="text-[13px] text-charcoal/70 tabular-nums">{row.lastActivity}</p>
              </div>
              <div className="md:col-span-2 flex md:justify-start gap-2 items-center flex-wrap">
                <span className="font-display text-[14px] text-teal-dark/80 md:hidden">Status</span>
                <StatusPill variant={row.status}>{row.statusLabel}</StatusPill>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
