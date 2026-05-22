import AdminCommerceOrdersView from "@/components/admin/orders/AdminCommerceOrdersView";
import { assertAdminPlatformLayout } from "@/lib/auth/cognito/assertRoleInLayout";
import { loadAdminCommerceOrdersIndex } from "@/lib/admin/loadAdminCommerceOrdersIndex";

export const dynamic = "force-dynamic";

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ showSuperAdminOperationalLens }, sp] = await Promise.all([
    assertAdminPlatformLayout(),
    searchParams,
  ]);

  const bundle = await loadAdminCommerceOrdersIndex({
    operationalLens: showSuperAdminOperationalLens,
    searchParams: sp,
  });

  return (
    <AdminCommerceOrdersView showSuperAdminOperationalLens={showSuperAdminOperationalLens} bundle={bundle} />
  );
}
