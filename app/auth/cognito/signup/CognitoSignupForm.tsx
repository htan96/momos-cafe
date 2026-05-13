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

export default function CognitoSignupForm() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      const res = await fetch("/api/auth/cognito/signup", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username.trim(),
          email: email.trim() || undefined,
          password,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string; detail?: string };
      if (!res.ok) {
        setError(data.detail ?? data.error ?? "Sign up failed.");
        return;
      }
      setInfo("Peek your inbox — we sent a short code to finish up. We’ll keep the rest easy.");
      setPassword("");
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
          Create account
        </h1>
        <p className="mt-2.5 text-center text-[14px] leading-relaxed text-charcoal/75">
          We&apos;ll send one quick verification — no clutter, just enough to keep your orders safe.
        </p>

        <form onSubmit={(e) => void onSubmit(e)} className="mt-8 space-y-5">
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
            <span className="text-[11px] font-semibold uppercase tracking-wide text-charcoal/60">
              Email (optional)
            </span>
            <input
              type="email"
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
