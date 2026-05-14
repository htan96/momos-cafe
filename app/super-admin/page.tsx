import Link from "next/link";

const cards = [
  {
    title: "Roles & policies",
    href: "/super-admin/roles",
    description: "Map Momo's job functions to Cognito groups and guardrails.",
  },
  {
    title: "Admin roster",
    href: "/super-admin/admins",
    description: "Provision and deactivate console operators across locations.",
  },
  {
    title: "Guest directory",
    href: "/super-admin/customer-lookup",
    description: "Cross-check customer identities when escalation requires it.",
  },
  {
    title: "Identity utilities",
    href: "/super-admin/cognito-tools",
    description: "Safe helpers for resets, MFA posture, and user hygiene.",
  },
  {
    title: "Maintenance mode",
    href: "/admin/settings/maintenance",
    description: "Same staff controls as Operations — pause shop or menu for customers site-wide.",
  },
  {
    title: "Systems & audit",
    href: "/super-admin/audit",
    description: "Trace changes, integrations, and health signals.",
  },
] as const;

export default function SuperAdminHomePage() {
  return (
    <div className="space-y-10">
      <header className="space-y-3">
        <p className="text-[11px] uppercase tracking-[0.26em] text-teal-dark font-semibold">Super admin</p>
        <h1 className="font-display text-3xl md:text-[clamp(28px,3.5vw,2.35rem)] text-charcoal tracking-tight">
          Governance console
        </h1>
        <p className="text-[15px] text-charcoal/72 max-w-xl leading-relaxed">
          High-impact tools stay behind this perimeter. Sections below scaffold the navigation—extend with audited
          actions when ready.
        </p>
      </header>

      <div className="grid gap-5 sm:grid-cols-2">
        {cards.map((c) => (
          <Link
            key={c.href}
            href={c.href}
            className="group rounded-2xl border border-teal/25 bg-white/92 p-6 shadow-sm transition-shadow hover:border-teal/45 hover:shadow-md"
          >
            <h2 className="font-display text-lg text-teal-dark group-hover:text-red transition-colors">{c.title}</h2>
            <p className="mt-3 text-[14px] text-charcoal/70 leading-relaxed">{c.description}</p>
            <p className="mt-5 text-[12px] font-semibold uppercase tracking-[0.16em] text-charcoal/55">
              Manage →
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
