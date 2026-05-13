import { Suspense } from "react";
import CognitoLoginForm from "@/components/auth/CognitoLoginForm";
import { StorefrontAuthCard } from "@/components/auth/StorefrontAuthChrome";
import { commerceCheckoutShell } from "@/lib/commerce/tokens";

/** Login uses API routes only (`/api/auth/cognito/login`, etc.); no Server Actions. */

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <>
          <div className="mx-auto h-12 w-[200px] animate-pulse rounded-lg bg-cream-mid/80 sm:h-[3.75rem]" aria-hidden />
          <StorefrontAuthCard>
            <p className={`${commerceCheckoutShell.sectionLabel} text-center`}>Momo&apos;s · Account</p>
            <div className="mt-4 h-8 w-3/4 mx-auto animate-pulse rounded bg-cream-mid/90" />
            <p className="mt-8 text-center text-[14px] text-charcoal/55">Almost there…</p>
          </StorefrontAuthCard>
        </>
      }
    >
      <CognitoLoginForm />
    </Suspense>
  );
}
