import AdminHomeDashboardView from "@/components/admin/home/AdminHomeDashboardView";
import { loadAdminHomeDashboard } from "@/lib/admin/adminConsoleLoaders";
import { assertAdminPlatformLayout } from "@/lib/auth/cognito/assertRoleInLayout";
import { opsLoadTodayQueues } from "@/lib/ops/queries";

export const dynamic = "force-dynamic";

export default async function AdminHomePage() {
  const { showSuperAdminOperationalLens } = await assertAdminPlatformLayout();

  const [dash, todayQueues] = await Promise.all([
    loadAdminHomeDashboard({ operationalLens: showSuperAdminOperationalLens }),
    opsLoadTodayQueues(),
  ]);

  return (
    <AdminHomeDashboardView operationalLens={showSuperAdminOperationalLens} dash={dash} todayQueues={todayQueues} />
  );
}
