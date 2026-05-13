import { Suspense } from "react";
import CognitoLoginForm from "@/components/auth/CognitoLoginForm";

export default function LoginPage() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4 py-16 bg-cream-mid">
      <Suspense
        fallback={
          <div className="w-full max-w-[420px] rounded-2xl border border-gold/40 bg-white px-8 py-16 text-center text-charcoal/60">
            Almost there…
          </div>
        }
      >
        <CognitoLoginForm />
      </Suspense>
    </div>
  );
}
