import Link from "next/link";

export default async function AdminHomePage() {
  const cards = [
    {
      title: "Catering & storefront orders",
      href: "/admin/catering-orders",
      description: "Coordinate trays, pickups, and order flows from one queue.",
    },
    {
      title: "Customer lookup",
      href: "/admin/customer-lookup",
      description: "Search guests and profiles when you need to assist with an order.",
    },
    {
      title: "Order lookup",
      href: "/admin/order-lookup",
      description: "Open a commerce order quickly by identifier or confirmation details.",
    },
    {
      title: "Maintenance mode",
      href: "/admin/settings/maintenance",
      description: "Pause the retail shop or café menu for customers while keeping staff tools available.",
    },
  ] as const;

  return (
    <div className="space-y-10">
      <header className="space-y-3">
        <p className="text-[11px] uppercase tracking-[0.26em] text-teal-dark font-semibold">
          Operational dashboard
        </p>
        <h1 className="font-display text-3xl md:text-[clamp(28px,3.5vw,2.35rem)] text-charcoal tracking-tight">
          Today on the floor
        </h1>
        <p className="text-[15px] text-charcoal/72 max-w-xl leading-relaxed">
          Shortcuts below connect to placeholders—wire them into back-office tooling as workflows solidify.
        </p>
      </header>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <Link
            key={c.href}
            href={c.href}
            className="group rounded-2xl border border-cream-dark bg-white/90 p-6 shadow-sm transition-shadow hover:shadow-md"
          >
            <h2 className="font-display text-lg text-charcoal group-hover:text-red transition-colors">{c.title}</h2>
            <p className="mt-3 text-[14px] text-charcoal/70 leading-relaxed">{c.description}</p>
            <p className="mt-5 text-[12px] font-semibold uppercase tracking-[0.16em] text-teal-dark">Open →</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
