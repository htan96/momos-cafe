import Link from "next/link";
import GovPageHeader from "@/components/governance/GovPageHeader";
import OperationalCard from "@/components/governance/OperationalCard";
import StatusPill from "@/components/governance/StatusPill";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function shortId(id: string): string {
  return `${id.slice(0, 8)}…`;
}

function displayNameFromAuth(meta: unknown): string | null {
  if (!meta || typeof meta !== "object" || Array.isArray(meta)) return null;
  const am = meta as Record<string, unknown>;
  for (const key of ["fullName", "name", "displayName"] as const) {
    const v = am[key];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return null;
}

export default async function SuperAdminCustomerOperationsPage() {
  const customers = await prisma.customer.findMany({
    take: 80,
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      email: true,
      phone: true,
      authMetadata: true,
      externalAuthSubject: true,
      squareCustomerId: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { orders: true } },
      orders: {
        take: 1,
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      },
    },
  });

  return (
    <div className="space-y-8">
      <GovPageHeader
        eyebrow="Platform · Customers"
        title="Customer operations"
        subtitle="Live `Customer` rows from Postgres — newest 80 by `updated_at`. Counts and last order come from the `orders` relation on `CommerceOrder`."
        actions={
          <Link
            href="/super-admin/customer-lookup"
            className="rounded-lg border border-cream-dark/60 bg-white px-3 py-1.5 text-[12px] font-semibold text-charcoal/80 shadow-sm transition hover:bg-cream-mid/40"
          >
            Customer lookup
          </Link>
        }
      />

      <OperationalCard title="Customers" meta={`customers · ${customers.length} / 80`}>
        {customers.length === 0 ? (
          <p className="text-[13px] text-charcoal/60">No customer profiles in the database yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-cream-dark/50">
            <table className="w-full min-w-[52rem] text-left text-[13px]">
              <thead className="border-b border-cream-dark/50 bg-cream-mid/20 text-[11px] uppercase tracking-[0.08em] text-charcoal/50">
                <tr>
                  <th className="px-3 py-2 font-semibold">Customer</th>
                  <th className="px-3 py-2 font-semibold">Display</th>
                  <th className="px-3 py-2 font-semibold">Email</th>
                  <th className="px-3 py-2 font-semibold">Orders</th>
                  <th className="px-3 py-2 font-semibold">Last order</th>
                  <th className="px-3 py-2 font-semibold">Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cream-dark/40">
                {customers.map((c) => {
                  const name = displayNameFromAuth(c.authMetadata);
                  const lastOrderAt = c.orders[0]?.createdAt ?? null;
                  return (
                    <tr key={c.id} className="bg-white/80">
                      <td className="px-3 py-2">
                        <Link
                          href={`/super-admin/customer-operations/${c.id}`}
                          className="font-mono text-[12px] text-teal-dark hover:underline"
                          title={c.id}
                        >
                          {shortId(c.id)}
                        </Link>
                      </td>
                      <td className="px-3 py-2 text-[12px] text-charcoal/75">{name ?? "—"}</td>
                      <td className="px-3 py-2 text-[12px] text-charcoal/75 break-all">
                        {c.email?.trim() || "—"}
                      </td>
                      <td className="px-3 py-2">
                        <StatusPill variant="neutral">{c._count.orders}</StatusPill>
                      </td>
                      <td className="px-3 py-2 text-[12px] text-charcoal/60">
                        {lastOrderAt
                          ? lastOrderAt.toLocaleString(undefined, {
                              dateStyle: "medium",
                              timeStyle: "short",
                            })
                          : "—"}
                      </td>
                      <td className="px-3 py-2 text-[12px] text-charcoal/60">
                        {c.updatedAt.toLocaleString(undefined, {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </OperationalCard>
    </div>
  );
}
