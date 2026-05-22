import { Suspense } from "react";
import CognitoSignupForm from "./CognitoSignupForm";
import {
  StorefrontAuthCard,
  StorefrontAuthLogo,
} from "@/components/auth/StorefrontAuthChrome";
import { commerceCheckoutShell } from "@/lib/commerce/tokens";

export default function CognitoSignupPage() {
  return (
    <Suspense
      fallback={
        <>
          <StorefrontAuthLogo />
          <StorefrontAuthCard>
            <p className={`${commerceCheckoutShell.sectionLabel} text-center`}>Momo&apos;s · Account</p>
            <div className="mt-8 h-8 w-full animate-pulse rounded-lg bg-cream-mid/80" aria-hidden />
            <p className="mt-8 text-center text-[14px] text-charcoal/55">Almost there…</p>
          </StorefrontAuthCard>
        </>
      }
    >
      <CognitoSignupForm />
    </Suspense>
  );
}
