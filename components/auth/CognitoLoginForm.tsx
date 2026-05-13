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

/** Messages from `readApiJson` when the body is not JSON (e.g. HTML gateway errors); snake_case stays for storefront copy. */
function isLikelyTransportLayerMessage(msg: string): boolean {
  return msg.includes("HTTP") || /\s/.test(msg);
}

function signInErrorUserMessage(out: {
  error: string;
  code?: string;
  challenge?: { mfaSetupPending?: boolean; softwareTokenMfaPending?: boolean };
}): string {
  if (out.code === "USER_NOT_CONFIRMED" || out.error === "user_not_confirmed") {
    return "This account is not confirmed yet — check your email for a confirmation link.";
  }
  if (out.code === "PASSWORD_RESET_REQUIRED" || out.error === "password_reset_required") {
    return "Your password must be reset — use Forgot password.";
  }
  if (out.code === "RATE_LIMITED" || out.error === "rate_limited") {
    return "Too many sign-in attempts — wait a minute and try again.";
  }
  if (out.code === "COGNITO_ENV_MISSING" || out.error === "cognito_unconfigured") {
    return "Sign-in is temporarily unavailable. Please try again later.";
  }
  if (
    out.code === "POOL_OR_CLIENT_CONFIG" ||
    out.error === "cognito_misconfigured" ||
    out.code === "TRANSIENT" ||
    out.error === "cognito_unavailable"
  ) {
    return "Sign-in is temporarily unavailable. Please try again in a moment.";
  }
  if (out.code === "NETWORK" || out.code === "PARSE") {
    return out.error;
  }
  if (out.challenge?.mfaSetupPending || out.challenge?.softwareTokenMfaPending) {
    return "We need you to finish multi-factor setup before you can sign in. Please contact support if this continues.";
  }
  if (out.error === "invalid_credentials") {
    return "Invalid username/email or password.";
  }
  if (isLikelyTransportLayerMessage(out.error)) return out.error;
  return "Could not sign in.";
}

export default function CognitoLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signIn, completeNewPassword } = useCognitoAuth();

  const rawNext = searchParams.get("next");

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [phase, setPhase] = useState<"sign_in" | "new_password">("sign_in");
  const [challengeSession, setChallengeSession] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmitSignIn(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const out = await signIn(username.trim(), password, rawNext);
    setBusy(false);
    if (!out.ok) {
      if (
        out.challenge?.challengeName === "NEW_PASSWORD_REQUIRED" &&
        typeof out.challenge.session === "string" &&
        out.challenge.session.length > 0
      ) {
        setChallengeSession(out.challenge.session);
        setPhase("new_password");
        setNewPassword("");
        setConfirmNewPassword("");
        return;
      }
      if (out.challenge) {
        setError(
          "We need one more security step before we can let you in. If this keeps happening, Momo's crew can help you finish setup."
        );
        return;
      }
      setError(
        signInErrorUserMessage({
          error: out.error,
          code: out.code,
          challenge: out.challenge ?? undefined,
        })
      );
      return;
    }
    const destination = out.redirectTo ?? resolvePostLoginRedirect(out.groups ?? [], rawNext);
    router.replace(destination);
    router.refresh();
  }

  async function onSubmitNewPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!challengeSession) {
      setError("Session expired — please sign in again.");
      setPhase("sign_in");
      return;
    }
    if (newPassword.length < 8) {
      setError("Choose a password at least 8 characters.");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setError("Those passwords don't match yet.");
      return;
    }
    setBusy(true);
    setError(null);
    const out = await completeNewPassword(username.trim(), challengeSession, newPassword, rawNext);
    setBusy(false);
    if (!out.ok) {
      if (out.challenge) {
        setError(
          "One more step is still needed on our side. Please reach out to Momo's crew or try signing in again."
        );
        return;
      }
      setError(
        isLikelyTransportLayerMessage(out.error)
          ? out.error
          : "We couldn't save that password. Try again or use Forgot password."
      );
      return;
    }
    const destination = out.redirectTo ?? resolvePostLoginRedirect(out.groups ?? [], rawNext);
    router.replace(destination);
    router.refresh();
  }

  if (phase === "new_password") {
    return (
      <>
        <StorefrontAuthLogo />
        <StorefrontAuthCard>
          <p className={`${commerceCheckoutShell.sectionLabel} text-center`}>Momo&apos;s · Account</p>
          <h1 className="mt-2 text-center font-display text-2xl font-semibold tracking-tight text-charcoal sm:text-[26px]">
            Choose your password
          </h1>
          <p className="mt-2.5 text-center text-[14px] leading-relaxed text-charcoal/75">
            Your welcome invite uses a temporary password. Pick something memorable — we&apos;ll use it whenever you
            come back.
          </p>

          <form onSubmit={(e) => void onSubmitNewPassword(e)} className="mt-8 space-y-5">
            <label className="block">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-charcoal/60">New password</span>
              <input
                type="password"
                autoComplete="new-password"
                required
                value={newPassword}
                onChange={(ev) => setNewPassword(ev.target.value)}
                className={storefrontAuthInput}
              />
            </label>
            <label className="block">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-charcoal/60">
                Confirm new password
              </span>
              <input
                type="password"
                autoComplete="new-password"
                required
                value={confirmNewPassword}
                onChange={(ev) => setConfirmNewPassword(ev.target.value)}
                className={storefrontAuthInput}
              />
            </label>

            {error ? (
              <p className="rounded-xl border border-red/25 bg-red/10 px-3 py-2.5 text-sm text-red" role="alert">
                {error}
              </p>
            ) : null}

            <button type="submit" disabled={busy} className={storefrontAuthPrimaryButton}>
              {busy ? "Saving…" : "Save password & continue"}
            </button>

            <button
              type="button"
              className="w-full text-sm font-semibold text-teal-dark underline-offset-2 hover:underline"
              onClick={() => {
                setPhase("sign_in");
                setChallengeSession(null);
                setError(null);
              }}
            >
              Back to sign in
            </button>
          </form>
        </StorefrontAuthCard>
      </>
    );
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

        <form onSubmit={(e) => void onSubmitSignIn(e)} className="mt-8 space-y-5">
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
