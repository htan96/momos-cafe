import PlatformShell from "@/components/platform/PlatformShell";
import { ACCOUNT_PLATFORM_NAV } from "@/components/platform/navConfig";
import { assertCustomerPlatformLayout } from "@/lib/auth/cognito/assertRoleInLayout";

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const session = await assertCustomerPlatformLayout();

  return (
    <PlatformShell
      variant="customer"
      areaEyebrow="Signed in"
      areaTitle="Your account"
      navItems={ACCOUNT_PLATFORM_NAV}
      userHint={session.email}
    >
      <div className="max-w-[900px] mx-auto px-5 md:px-8 lg:px-10 py-10 md:py-14 lg:pb-24">{children}</div>
    </PlatformShell>
  );
}
