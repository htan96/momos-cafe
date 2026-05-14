import OpsPageHeader from "@/components/operations/OpsPageHeader";
import OpsPanel from "@/components/operations/OpsPanel";
import OpsStatusPill from "@/components/operations/OpsStatusPill";
import { adminCustomerLookupMock } from "@/lib/operations/mockAdminOps";

export default function AdminCustomerLookupPage() {
  const m = adminCustomerLookupMock;
  return (
    <div className="space-y-8">
      <OpsPageHeader title="Customer lookup" subtitle="Profile surfacing for CX — mocks mirror composite guest records." />

      <OpsPanel title="Directory search">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="flex-1 space-y-1">
            <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-charcoal/45">
              Guest identifier
            </span>
            <input
              disabled
              placeholder={m.queryPlaceholder}
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

      <OpsPanel title="Operational profile · mock">
        <div className="flex flex-wrap gap-3 items-start justify-between">
          <div className="min-w-0">
            <p className="font-display text-2xl text-charcoal">{m.name}</p>
            <p className="text-[13px] text-charcoal/60 mt-1">{m.hint}</p>
          </div>
          <OpsStatusPill variant="in_progress">Active guest</OpsStatusPill>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {m.tags.map((t) => (
            <span key={t} className="rounded-lg border border-cream-dark bg-white/85 px-3 py-2 text-[12px] text-charcoal/75">
              {t}
            </span>
          ))}
        </div>

        <div className="mt-8 border-t border-cream-dark/60 pt-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-charcoal/45 mb-3">Recent anchors</p>
          <ul className="space-y-2">
            {m.ordersSnippet.map((o) => (
              <li key={o} className="rounded-lg border border-cream-dark/70 px-4 py-3 text-[13px] text-charcoal bg-cream/[0.2]">
                {o}
              </li>
            ))}
          </ul>
        </div>
      </OpsPanel>
    </div>
  );
}
