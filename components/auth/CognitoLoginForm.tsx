"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useCognitoAuth } from "@/components/auth/CognitoAuthProvider";
import {
  StorefrontAuthCard,
  StorefrontAuthLogo,
  storefrontAuthFooterLink,
  storefrontAuthInput,
  storefrontAuthPrimaryButton,
} from "@/components/auth/StorefrontAuthChrome";
import { commerceCheckoutShell } from "@/lib/commerce/tokens";
import { resolvePostLoginRedirect } from "@/lib/auth/cognito/redirectByRole";

export default function CognitoLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signIn } = useCognitoAuth();

  const rawNext = searchParams.get("next");

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const out = await signIn(username.trim(), password, rawNext);
    setBusy(false);
    if (!out.ok) {
      if (out.challenge) {
        setError(
          "We need one more step to be sure it’s you. If this keeps happening, ask the Momo’s crew for a quick hand."
        );
        return;
      }
      setError(out.error === "invalid_credentials" ? "Invalid username/email or password." : "Could not sign in.");
      return;
    }
    const destination = out.redirectTo ?? resolvePostLoginRedirect(out.groups, rawNext);
    router.replace(destination);
    router.refresh();
  }

  return (
    <>
      <StorefrontAuthLogo />
      <StorefrontAuthCard>
        <p className={`${commerceCheckoutShell.sectionLabel} text-center`}>Momo&apos;s · Account</p>
        <h1 className="mt-2 text-center font-display text-2xl font-semibold tracking-tight text-charcoal sm:text-[26px]">
          Sign in
        </h1>
        <p className="mt-2.5 text-center text-[14px] leading-relaxed text-charcoal/75">
          Welcome back — sign in with the email and password on your Momo&apos;s account.
        </p>

        <form onSubmit={(e) => void onSubmit(e)} className="mt-8 space-y-5">
          <label className="block">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-charcoal/60">Email or username</span>
            <input
              autoComplete="username"
              required
              value={username}
              onChange={(ev) => setUsername(ev.target.value)}
              className={storefrontAuthInput}
            />
          </label>

          <label className="block">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-charcoal/60">Password</span>
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(ev) => setPassword(ev.target.value)}
              className={storefrontAuthInput}
            />
          </label>

          {error ? (
            <p className="rounded-xl border border-red/25 bg-red/10 px-3 py-2.5 text-sm text-red" role="alert">
              {error}
            </p>
          ) : null}

          <button type="submit" disabled={busy} className={storefrontAuthPrimaryButton}>
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <nav className="mt-6 flex flex-col border-t border-gold/25 pt-2" aria-label="Account help">
          <Link href="/signup" className={storefrontAuthFooterLink}>
            Create account
          </Link>
          <Link href="/forgot-password" className={storefrontAuthFooterLink}>
            Forgot password
          </Link>
          <Link href="/" className={storefrontAuthFooterLink}>
            Back to the café
          </Link>
        </nav>
      </StorefrontAuthCard>
    </>
  );
}
