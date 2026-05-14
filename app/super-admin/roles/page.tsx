import GovPageHeader from "@/components/governance/GovPageHeader";
import { mockRoleCards } from "@/lib/governance/mockSuperAdmin";

export default function SuperAdminRolesPage() {
  return (
    <div className="space-y-10">
      <GovPageHeader
        eyebrow="Access model"
        title="Roles & capability maps"
        subtitle="Least-privilege overview aligned to Cognito groups. Route prefixes summarize where middleware enforces each plane."
      />

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {mockRoleCards.map((role) => (
          <article
            key={role.id}
            className="flex flex-col rounded-2xl border border-cream-dark/70 bg-white/[0.94] shadow-[0_1px_0_rgba(45,107,107,0.05),0_10px_28px_-16px_rgba(46,42,37,0.16)] overflow-hidden"
          >
            <header className="border-b border-cream-dark/55 px-5 py-4 bg-teal/[0.04]">
              <h2 className="font-display text-xl text-teal-dark tracking-tight">{role.title}</h2>
              <p className="mt-2 text-[13px] text-charcoal/68 leading-relaxed">{role.description}</p>
              <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-charcoal/45">{role.id}</p>
            </header>
            <div className="px-5 py-4 flex-1 flex flex-col gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-charcoal/45 mb-2">Capabilities</p>
                <ul className="space-y-1.5">
                  {role.capabilities.map((c) => (
                    <li key={c} className="text-[13px] text-charcoal/78 pl-3 border-l-[2px] border-gold/40">
                      {c}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-charcoal/45 mb-2">Route prefixes protected</p>
                <ul className="flex flex-wrap gap-1.5">
                  {role.routePrefixes.map((p) => (
                    <li
                      key={p}
                      className="text-[11px] font-medium rounded-md border border-teal/20 bg-teal/[0.06] px-2 py-1 text-teal-dark/90"
                    >
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
              {role.elevated.length > 0 ? (
                <div className="rounded-xl border border-gold/35 bg-gold/[0.08] px-3 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-charcoal/55 mb-2">Elevated actions</p>
                  <ul className="space-y-1">
                    {role.elevated.map((e) => (
                      <li key={e} className="text-[12px] text-charcoal/80 leading-snug">
                        {e}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="text-[12px] text-charcoal/50 italic rounded-xl border border-dashed border-cream-dark px-3 py-2">
                  No catalogued elevated ladder — storefront plane stays customer-safe.
                </p>
              )}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
