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

export default function ForgotPasswordClient() {
  const [step, setStep] = useState<"request" | "confirm">("request");
  const [username, setUsername] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onRequest(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/auth/cognito/forgot-password", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim() }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string; detail?: string };
      if (!res.ok) {
        setError(data.detail ?? data.error ?? "Request failed.");
        return;
      }
      setMessage("If we find that email or username, a private code is on its way.");
      setStep("confirm");
    } finally {
      setBusy(false);
    }
  }

  async function onConfirm(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/cognito/confirm-forgot-password", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username.trim(),
          code: code.trim(),
          newPassword,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string; detail?: string };
      if (!res.ok) {
        setError(data.detail ?? data.error ?? "Could not reset password.");
        return;
      }
      setMessage("You’re all set — sign in whenever you’re ready with the new password.");
      setNewPassword("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <StorefrontAuthLogo />
      <StorefrontAuthCard>
        <p className={`${commerceCheckoutShell.sectionLabel} text-center`}>We’ve got you</p>
        <h1 className="mt-2 text-center font-display text-2xl font-semibold text-charcoal sm:text-[26px]">
          Reset password
        </h1>
        <p className="mt-3 text-center text-[13px] leading-relaxed text-charcoal/68 px-0.5">
          Enter what you usually sign in with — we only email a code when there&apos;s a matching guest account, so you
          stay private either way.
        </p>

        {step === "request" ? (
          <form onSubmit={(e) => void onRequest(e)} className="mt-8 space-y-5">
            <label className="block">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-charcoal/60">
                Email or username
              </span>
              <input
                required
                value={username}
                onChange={(ev) => setUsername(ev.target.value)}
                className={storefrontAuthInput}
              />
            </label>
            {error ? (
              <p className="rounded-xl border border-red/25 bg-red/10 px-3 py-2.5 text-sm text-red" role="alert">
                {error}
              </p>
            ) : null}
            <button type="submit" disabled={busy} className={storefrontAuthPrimaryButton}>
              {busy ? "Sending…" : "Send reset code"}
            </button>
          </form>
        ) : (
          <form onSubmit={(e) => void onConfirm(e)} className="mt-8 space-y-5">
            {message ? (
              <p className="rounded-xl border border-teal/20 bg-teal/10 px-3 py-2.5 text-sm text-teal-dark">{message}</p>
            ) : null}
            <label className="block">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-charcoal/60">Code</span>
              <input
                required
                value={code}
                onChange={(ev) => setCode(ev.target.value)}
                className={storefrontAuthInput}
                autoComplete="one-time-code"
              />
            </label>
            <label className="block">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-charcoal/60">New password</span>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(ev) => setNewPassword(ev.target.value)}
                className={storefrontAuthInput}
                autoComplete="new-password"
              />
            </label>
            {error ? (
              <p className="rounded-xl border border-red/25 bg-red/10 px-3 py-2.5 text-sm text-red" role="alert">
                {error}
              </p>
            ) : null}
            <button type="submit" disabled={busy} className={storefrontAuthPrimaryButton}>
              {busy ? "Updating…" : "Confirm new password"}
            </button>
          </form>
        )}

        <p className="mt-6 border-t border-gold/25 pt-5 text-center text-[13px] text-charcoal/70">
          <Link href="/login" className={storefrontAuthInlineLink}>
            Back to sign in
          </Link>
        </p>
      </StorefrontAuthCard>
    </>
  );
}
