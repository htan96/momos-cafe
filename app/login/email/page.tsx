import { Suspense } from "react";
import EmailMagicLoginClient from "./EmailMagicLoginClient";

export default function EmailMagicLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="w-full max-w-[420px] rounded-2xl border border-gold/40 bg-white px-8 py-16 text-center text-charcoal/60">
          Loading…
        </div>
      }
    >
      <EmailMagicLoginClient />
    </Suspense>
  );
}
