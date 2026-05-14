import { assertCustomerPlatformLayout } from "@/lib/auth/cognito/assertRoleInLayout";

/** Auth shell only — routed account surfaces either use `(main)` (PlatformShell + governance gate) or public siblings like `experience-unavailable`. */
export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  await assertCustomerPlatformLayout();
  return <>{children}</>;
}
