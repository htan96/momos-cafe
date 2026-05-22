import Link from "next/link";
import CustomerPageHeader from "@/components/customer/CustomerPageHeader";
import CustomerPanel from "@/components/customer/CustomerPanel";
import { assertCustomerPlatformLayout } from "@/lib/auth/cognito/assertRoleInLayout";

export default async function AccountSettingsProfilePage() {
  const session = await assertCustomerPlatformLayout();
  const isPreview = Boolean(session.governance?.preview);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center gap-3 text-[12px] font-semibold uppercase tracking-[0.18em] text-teal-dark">
        <Link href="/account/settings" className="hover:underline underline-offset-4">
          ← Settings
        </Link>
      </div>
      <CustomerPageHeader
        eyebrow="Profile"
        title="How we greet you"
        subtitle="This mirrors your Cognito-backed customer session — edits to legal identity flow through Momo’s account team for now."
        illustrationAccentClassName="bg-teal/15"
      />

      <CustomerPanel title="Basics" eyebrow="Signed in">
        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-charcoal/55">Email</p>
            <p className="mt-2 text-[15px] text-charcoal">{session.email}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-charcoal/55">Session</p>
            <p className="mt-2 text-[13px] text-charcoal/65 leading-relaxed">
              {isPreview ? "Super-admin preview of the customer dashboard." : "Active customer storefront session."}
            </p>
          </div>
        </div>
        <p className="mt-4 text-[12px] text-charcoal/55">
          Password and MFA are managed through{" "}
          <Link href="/login" className="font-semibold text-teal-dark underline-offset-2 hover:underline">
            Sign in
          </Link>
          {" / "}
          <Link href="/auth/cognito/forgot-password" className="font-semibold text-teal-dark underline-offset-2 hover:underline">
            Forgot password
          </Link>
          .
        </p>
      </CustomerPanel>
    </div>
  );
}
