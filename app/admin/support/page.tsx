import OpsPageHeader from "@/components/operations/OpsPageHeader";
import OpsPanel from "@/components/operations/OpsPanel";
import OpsStatusPill from "@/components/operations/OpsStatusPill";
import { loadAdminSupportIssues, supportStatusVariant } from "@/lib/admin/adminConsoleLoaders";

function shortenId(uuid: string, head = 8): string {
  const s = uuid.replace(/-/g, "");
  return s.slice(0, Math.min(head, s.length)).toUpperCase();
}

export default async function AdminSupportPage() {
  const issues = await loadAdminSupportIssues(35);

  return (
    <div className="space-y-8">
      <OpsPageHeader
        title="Support inbox"
        subtitle="OperationalSupportIssue rows — not third-party ticketing."
      />

      <OpsPanel title={`Open queue · ${issues.length} shown (recent updates)`}>
        {issues.length === 0 ? (
          <p className="text-[13px] text-charcoal/60">No support issues yet.</p>
        ) : (
          <ul className="divide-y divide-cream-dark/50">
            {issues.map((t) => {
              const tier = supportStatusVariant(t.status);
              const guest =
                [t.customer?.email, t.customer?.phone?.trim()?.length ? t.customer.phone : null]
                  .filter(Boolean)
                  .join(" · ") || "Guest unattached";

              const orderBit = t.commerceOrderId ? `Order · ${shortenId(t.commerceOrderId)}` : "Order · —";
              const openedLabel = new Date(t.updatedAt).toLocaleString(undefined, {
                hour: "numeric",
                minute: "2-digit",
                month: "short",
                day: "numeric",
              });

              return (
                <li key={t.id} className="py-4 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-start">
                  <div className="min-w-0">
                    <p className="text-[11px] font-mono text-charcoal/45">{t.id}</p>
                    <p className="text-[14px] font-semibold text-charcoal mt-1">{t.title}</p>
                    <p className="text-[13px] text-charcoal/60 mt-2">
                      {guest} · {orderBit}
                    </p>
                    {t.summary ? (
                      <p className="text-[12px] text-charcoal/55 mt-2 leading-relaxed">{t.summary}</p>
                    ) : null}
                  </div>
                  <div className="flex flex-col gap-2 sm:items-end">
                    <OpsStatusPill variant={tier}>Status</OpsStatusPill>
                    <span className="text-[11px] text-charcoal/45">Updated {openedLabel}</span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </OpsPanel>

      <OpsPanel title="Composer" eyebrow="Not wired">
        <textarea
          readOnly
          rows={6}
          className="w-full rounded-xl border border-cream-dark bg-cream/55 px-3 py-2.5 text-[13px] text-charcoal/60 cursor-default resize-none outline-none ring-0"
          placeholder="Support updates run through OperationalSupportIssue tooling (ops console)."
        />
        <p className="text-[11px] text-charcoal/45 mt-3">
          Prefer the ops console workflows for actionable issue transitions.
        </p>
      </OpsPanel>
    </div>
  );
}
