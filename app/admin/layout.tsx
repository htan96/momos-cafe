import PlatformShell from "@/components/platform/PlatformShell";
import { ADMIN_PLATFORM_NAV } from "@/components/platform/navConfig";
import { assertAdminPlatformLayout } from "@/lib/auth/cognito/assertRoleInLayout";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await assertAdminPlatformLayout();
  const userHint = user.email ?? user.username;

  return (
    <PlatformShell
      variant="admin"
      areaEyebrow="Operations"
      areaTitle="Staff console"
      navItems={ADMIN_PLATFORM_NAV}
      userHint={userHint}
    >
      <div className="max-w-[900px] mx-auto px-5 md:px-8 lg:px-10 py-10 md:py-14 lg:pb-24">{children}</div>
    </PlatformShell>
  );
}
