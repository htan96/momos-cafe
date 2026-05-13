"use client";

import Link from "next/link";
import { useState } from "react";
import {
  StorefrontAuthCard,
  StorefrontAuthLogo,
  storefrontAuthInlineLink,
  storefrontAuthInput,
  storefrontAuthPrimaryButton,
} from "@/components/auth/StorefrontAuthChrome";
import { commerceCheckoutShell } from "@/lib/commerce/tokens";
import { readApiJson } from "@/lib/http/readApiJson";

type Step = "signup" | "confirm";

export default function CognitoSignupForm() {
  const [step, setStep] = useState<Step>("signup");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmationCode, setConfirmationCode] = useState("");
  const [confirmComplete, setConfirmComplete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmitSignup(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      const trimmedEmail = email.trim();
      if (!trimmedEmail) {
        setError("Please enter your email.");
        return;
      }
      const res = await fetch("/api/auth/cognito/signup", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username.trim(),
          email: trimmedEmail,
          password,
        }),
      });
      const parsed = await readApiJson<{ ok?: boolean; error?: string; detail?: string }>(res);
      if (!parsed.ok) {
        setError(parsed.error);
        return;
      }
      const { data, status } = parsed;
      if (status >= 400 || !data.ok) {
        setError(data.detail ?? data.error ?? "Sign up failed.");
        return;
      }
      setInfo("Check your email — we sent a short verification code. Enter it below to finish.");
      setPassword("");
      setConfirmationCode("");
      setConfirmComplete(false);
      setStep("confirm");
    } finally {
      setBusy(false);
    }
  }

  async function onSubmitConfirm(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/cognito/confirm-signup", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username.trim(),
          code: confirmationCode.trim(),
        }),
      });
      const parsed = await readApiJson<{ ok?: boolean; error?: string; detail?: string }>(res);
      if (!parsed.ok) {
        setError(parsed.error);
        return;
      }
      const { data, status } = parsed;
      if (status >= 400 || !data.ok) {
        setError(data.detail ?? data.error ?? "That code didn't work — try again or request a new one from your email.");
        return;
      }
      setConfirmComplete(true);
      setError(null);
      setInfo("You're verified — sign in whenever you're ready.");
      setConfirmationCode("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <StorefrontAuthLogo />
      <StorefrontAuthCard>
        <p className={`${commerceCheckoutShell.sectionLabel} text-center`}>Join the guest list</p>
        <h1 className="mt-2 text-center font-display text-2xl font-semibold text-charcoal sm:text-[26px]">
          {step === "signup" ? "Create account" : "Verify your email"}
        </h1>
        <p className="mt-2.5 text-center text-[14px] leading-relaxed text-charcoal/75">
          {step === "signup" ?
            "We&apos;ll send one quick verification — no clutter, just enough to keep your orders safe."
          : "Paste the verification code from your email — it unlocks signing in."}
        </p>

        {step === "signup" ? (
          <form onSubmit={(e) => void onSubmitSignup(e)} className="mt-8 space-y-5">
            <label className="block">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-charcoal/60">Username</span>
              <input
                required
                value={username}
                onChange={(ev) => setUsername(ev.target.value)}
                className={storefrontAuthInput}
              />
            </label>
            <label className="block">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-charcoal/60">Email</span>
              <input
                type="email"
                required
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(ev) => setEmail(ev.target.value)}
                className={storefrontAuthInput}
              />
            </label>
            <label className="block">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-charcoal/60">Password</span>
              <input
                type="password"
                required
                value={password}
                onChange={(ev) => setPassword(ev.target.value)}
                className={storefrontAuthInput}
              />
            </label>

            {info ? (
              <p className="rounded-xl border border-teal/20 bg-teal/10 px-3 py-2.5 text-sm text-teal-dark">{info}</p>
            ) : null}
            {error ? (
              <p className="rounded-xl border border-red/25 bg-red/10 px-3 py-2.5 text-sm text-red" role="alert">
                {error}
              </p>
            ) : null}

            <button type="submit" disabled={busy} className={storefrontAuthPrimaryButton}>
              {busy ? "Creating…" : "Create account"}
            </button>
          </form>
        ) : confirmComplete ? (
          <div className="mt-8 space-y-5">
            {info ? (
              <p className="rounded-xl border border-teal/20 bg-teal/10 px-3 py-2.5 text-sm text-teal-dark">{info}</p>
            ) : null}
            <Link href="/login" className={`${storefrontAuthPrimaryButton} block text-center`}>
              Go to sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={(e) => void onSubmitConfirm(e)} className="mt-8 space-y-5">
            {info ? (
              <p className="rounded-xl border border-teal/20 bg-teal/10 px-3 py-2.5 text-sm text-teal-dark">{info}</p>
            ) : null}
            <label className="block">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-charcoal/60">Username</span>
              <input
                required
                value={username}
                onChange={(ev) => setUsername(ev.target.value)}
                className={storefrontAuthInput}
              />
            </label>
            <label className="block">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-charcoal/60">Verification code</span>
              <input
                required
                value={confirmationCode}
                onChange={(ev) => setConfirmationCode(ev.target.value)}
                className={storefrontAuthInput}
                autoComplete="one-time-code"
                inputMode="numeric"
              />
            </label>

            {error ? (
              <p className="rounded-xl border border-red/25 bg-red/10 px-3 py-2.5 text-sm text-red" role="alert">
                {error}
              </p>
            ) : null}

            <button type="submit" disabled={busy} className={storefrontAuthPrimaryButton}>
              {busy ? "Verifying…" : "Verify & continue"}
            </button>

            <button
              type="button"
              className="w-full text-sm font-semibold text-teal-dark underline-offset-2 hover:underline"
              onClick={() => {
                setStep("signup");
                setConfirmComplete(false);
                setError(null);
                setInfo(null);
              }}
            >
              Back to account details
            </button>
          </form>
        )}

        <p className="mt-6 border-t border-gold/25 pt-5 text-center text-[13px] text-charcoal/70">
          Already visiting with us?{" "}
          <Link href="/login" className={storefrontAuthInlineLink}>
            Back to sign in
          </Link>
        </p>
      </StorefrontAuthCard>
    </>
  );
}
