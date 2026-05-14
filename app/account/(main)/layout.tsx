import PlatformShell from "@/components/platform/PlatformShell";
import ImpersonationBanner from "@/components/governance/ImpersonationBanner";
import { ACCOUNT_PLATFORM_NAV } from "@/components/platform/navConfig";
import { assertCustomerPlatformLayout } from "@/lib/auth/cognito/assertRoleInLayout";
import { getCognitoServerSession } from "@/lib/auth/cognito/serverSession";
import { hasAnyRole } from "@/lib/auth/cognito/roles";
import { PLATFORM_FEATURE_DEFINITIONS } from "@/lib/platform/governanceFeatures";
import { getPlatformFeatureState } from "@/lib/platform/platformFeatureState";
import { redirect } from "next/navigation";

export default async function AccountMainLayout({ children }: { children: React.ReactNode }) {
  const session = await assertCustomerPlatformLayout();

  const [user, state] = await Promise.all([getCognitoServerSession(), getPlatformFeatureState()]);
  const groups = user?.groups ?? [];

  const def = PLATFORM_FEATURE_DEFINITIONS.customer_platform;
  if (!state.customer_platform.enabled && !hasAnyRole(groups, [...def.allowOverrideRoles])) {
    redirect("/account/experience-unavailable");
  }

  const userHint =
    session.governance?.preview && user?.email
      ? `${user.email} · preview`
      : session.governance?.impersonation && user?.email
        ? `${user.email} → ${session.email}`
        : session.email;

  return (
    <PlatformShell
      variant="customer"
      environment="customer"
      areaEyebrow="Signed in"
      areaTitle="Your account"
      navItems={ACCOUNT_PLATFORM_NAV}
      userHint={userHint}
      belowHeader={<ImpersonationBanner />}
    >
      <div className="max-w-[900px] mx-auto px-5 md:px-8 lg:px-10 py-10 md:py-14 lg:pb-24">{children}</div>
    </PlatformShell>
  );
}
