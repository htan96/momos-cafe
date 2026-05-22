import Link from "next/link";
import AccountOrderCard from "@/components/account/AccountOrderCard";
import CustomerPageHeader from "@/components/customer/CustomerPageHeader";
import { assertCustomerPlatformLayout } from "@/lib/auth/cognito/assertRoleInLayout";
import { resolveCommerceCustomerId } from "@/lib/account/effectiveAccountContext";
import { loadCustomerCommerceOrders } from "@/lib/account/dashboardData";

export default async function AccountOrdersListPage() {
  const session = await assertCustomerPlatformLayout();
  const customerRowId = await resolveCommerceCustomerId({
    cognitoSub: session.sub,
    email: session.email,
  });
  const rows = customerRowId ? await loadCustomerCommerceOrders(customerRowId) : [];

  return (
    <div className="space-y-10">
      <CustomerPageHeader
        eyebrow="Orders"
        title="Everything you’ve shared with our kitchen"
        subtitle="Pickup, shop, and shipped items paid while signed in show up here. Guest orders appear after you create an account with the same checkout email."
        illustrationAccentClassName="bg-teal/25"
      />

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-cream-dark bg-white px-6 py-12 text-center">
          <p className="mx-auto max-w-md text-[15px] text-charcoal/70 leading-relaxed">
            No completed orders tied to this account yet. Checkout while signed in, or create an account using the email
            from a guest order — we&apos;ll attach matching visits automatically.
          </p>
          <Link
            href="/order"
            className="mt-6 inline-flex rounded-xl bg-teal-dark px-5 py-2.5 text-sm font-semibold text-cream hover:opacity-95"
          >
            Start an order
          </Link>
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {rows.map((row) => (
            <AccountOrderCard key={row.id} row={row} />
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-4 border-t border-cream-dark/80 pt-8 text-[14px]">
        <Link href="/account" className="font-semibold text-teal-dark underline-offset-4 hover:underline">
          ← Back to overview
        </Link>
      </div>
    </div>
  );
}
