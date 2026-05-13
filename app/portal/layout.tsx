import PlatformShell from "@/components/platform/PlatformShell";
import { PORTAL_PLATFORM_NAV } from "@/components/platform/navConfig";
import { assertAuthedPlatformLayout } from "@/lib/auth/cognito/assertRoleInLayout";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const user = await assertAuthedPlatformLayout();
  const userHint = user.email ?? user.username;

  return (
    <PlatformShell
      variant="customer"
      areaEyebrow="Workspace"
      areaTitle="Staff portal"
      navItems={PORTAL_PLATFORM_NAV}
      userHint={userHint}
    >
      <div className="max-w-[720px] mx-auto px-5 md:px-8 py-12 md:py-16">{children}</div>
    </PlatformShell>
  );
}
