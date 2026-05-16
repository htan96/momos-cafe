import PlatformShell from "@/components/platform/PlatformShell";
import PresenceHeartbeat from "@/components/presence/PresenceHeartbeat";
import GovernancePerspectiveSwitcher from "@/components/governance/GovernancePerspectiveSwitcher";
import ImpersonationBanner from "@/components/governance/ImpersonationBanner";
import { SUPER_ADMIN_PLATFORM_NAV } from "@/components/platform/navConfig";
import { assertSuperAdminPlatformLayout } from "@/lib/auth/cognito/assertRoleInLayout";

export default async function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const user = await assertSuperAdminPlatformLayout();
  const userHint = user.email ?? user.username;

  return (
    <PlatformShell
      variant="super_admin"
      environment="super_admin"
      areaEyebrow="Governance"
      areaTitle="Super admin"
      navItems={SUPER_ADMIN_PLATFORM_NAV}
      userHint={userHint}
      headerAddon={<GovernancePerspectiveSwitcher />}
      belowHeader={<ImpersonationBanner />}
    >
      <PresenceHeartbeat />
      <div className="max-w-[1100px] mx-auto px-5 md:px-8 lg:px-10 py-10 md:py-14 lg:pb-24">{children}</div>
    </PlatformShell>
  );
}
