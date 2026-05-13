"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { normalizeAuthEmail } from "@/lib/auth/emailNormalize";

const ERROR_COPY: Record<string, string> = {
  missing_token: "That sign-in link is incomplete. Request a new one.",
  link_invalid: "This sign-in link has expired or was already used.",
  rate_limited: "Too many attempts. Try again in a minute.",
  session_unconfigured: "Sign-in isn’t ready on our side yet — please try again in a little while.",
};

const MAGIC_RESEND_MS = 60_000;

export default function EmailMagicLoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawNext = searchParams.get("next") ?? "/account";
  const nextPath = useMemo(() => {
    const t = rawNext.trim();
    if (!t.startsWith("/") || t.startsWith("//") || t.includes("://")) return "/account";
    return t.slice(0, 512) || "/account";
  }, [rawNext]);

  const urlError = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [step, setStep] = useState<"email" | "magic_sent" | "password">("email");
  const [info, setInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(
    urlError ? ERROR_COPY[urlError] ?? "Something went wrong. Try again." : null
  );
  const [busy, setBusy] = useState(false);
  const [lastMagicSentAt, setLastMagicSentAt] = useState<number | null>(null);
  const [nowTick, setNowTick] = useState(Date.now());

  /** Guest customer session restores — skip when explicitly heading to ops console. */
  useEffect(() => {
    if (step !== "email") return;
    if (nextPath.startsWith("/ops")) return;
    let cancelled = false;
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((d: { authenticated?: boolean }) => {
        if (cancelled) return;
        if (d.authenticated) {
          router.replace(nextPath);
          router.refresh();
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [router, step, nextPath]);

  useEffect(() => {
    if (step !== "magic_sent" || !lastMagicSentAt) return;
    const id = window.setInterval(() => setNowTick(Date.now()), 400);
    return () => window.clearInterval(id);
  }, [step, lastMagicSentAt]);

  const resendRemainSec =
    lastMagicSentAt !== null ? Math.ceil(Math.max(0, MAGIC_RESEND_MS - (nowTick - lastMagicSentAt)) / 1000) : 0;

  async function onEmailContinue(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      const norm = normalizeAuthEmail(email);
      if (!norm.includes("@")) {
        setError("Enter a valid email address.");
        return;
      }

      const res = await fetch("/api/auth/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: norm, next: nextPath }),
      });
      const data = (await res.json()) as {
        mode?: string;
        error?: string;
        next?: string;
      };

      if (!res.ok) {
        if (data.error === "rate_limited") setError("Too many requests. Wait a moment and try again.");
        else if (data.error === "auth_url_unconfigured" || data.error === "customer_session_unconfigured") {
          setError("We’re still polishing email sign-in — check back shortly.");
        } else if (data.error === "email_send_failed") {
          setError("We could not send the email. Try again shortly.");
        } else setError("Something went wrong. Try again.");
        return;
      }

      if (data.mode === "password_required") {
        setStep("password");
        setInfo("Use the password your team shares for Momo’s back office.");
        return;
      }

      if (data.mode === "magic_link_sent") {
        setStep("magic_sent");
        setLastMagicSentAt(Date.now());
        setInfo(`We sent a sign-in link to ${norm}. It expires in 15 minutes.`);
        return;
      }

      setError("Something didn’t quite go through — try once more?");
    } finally {
      setBusy(false);
    }
  }

  async function onRetryMagicSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy || resendRemainSec > 0) return;
    const norm = normalizeAuthEmail(email);
    if (!norm.includes("@")) {
      setStep("email");
      setError("Enter a valid email address.");
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: norm, next: nextPath }),
      });
      const data = (await res.json()) as { mode?: string; error?: string };
      if (!res.ok) {
        if (data.error === "rate_limited") setError("Hold tight — inbox traffic is pacing.");
        else setError("We couldn't send that link just now.");
        return;
      }
      if (data.mode === "magic_link_sent") {
        setLastMagicSentAt(Date.now());
        setInfo(`Fresh link dispatched to ${norm}. Still valid for 15 minutes once opened.`);
        return;
      }
      if (data.mode === "password_required") {
        setStep("password");
        setInfo("That email opens the secure password step — you’re almost there.");
      }
    } finally {
      setBusy(false);
    }
  }

  async function onOpsPassword(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const norm = normalizeAuthEmail(email);
      const res = await fetch("/api/ops/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: norm, password }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error === "invalid_credentials" ? "Invalid email or password." : "Sign-in failed.");
        return;
      }
      const dest =
        nextPath.startsWith("/ops") && !nextPath.startsWith("//") ? nextPath : "/ops";
      router.replace(dest);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="w-full max-w-[420px] rounded-2xl border border-gold/40 bg-white shadow-[0_24px_80px_rgba(0,0,0,0.08)] px-8 py-10">
      <Link href="/" className="flex justify-center mb-6 hover:opacity-90 transition-opacity">
        <Image src="/images/logo.png" alt="Momo's Café" width={160} height={80} className="h-12 w-auto" priority />
      </Link>

      <p className="text-center text-[11px] uppercase tracking-[0.28em] text-teal-dark font-semibold">
        Welcome back
      </p>
      <h1 className="mt-2 text-center text-2xl font-semibold text-charcoal tracking-tight font-display">
        Sign in by email
      </h1>
      <p className="mt-2 text-center text-[14px] text-charcoal/75 leading-relaxed">
        Tell us where to reach you — we&apos;ll tuck a private link in your inbox. Some Momo&apos;s team addresses ask
        for the shared café password instead, which you can wrap up below or{" "}
        <Link href="/ops/login" className="text-teal-dark underline underline-offset-2">
          on the ops sign-in screen
        </Link>
        .
      </p>

      {step === "magic_sent" ? (
        <div className="mt-8 space-y-4 text-center">
          <div className="flex justify-center text-[32px]" aria-hidden>
            ✉️
          </div>
          <p className="text-[15px] text-charcoal leading-relaxed">{info}</p>
          <p className="text-[13px] text-charcoal/55">
            {resendRemainSec > 0
              ? `Resend available in ${resendRemainSec}s.`
              : "You can request another link anytime below."}
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void onRetryMagicSubmit(e);
            }}
          >
            <button
              type="submit"
              disabled={busy || resendRemainSec > 0}
              className="w-full rounded-lg border border-teal-dark/35 text-teal-dark font-semibold py-3 text-[14px] disabled:opacity-40 hover:bg-teal/5 transition-colors"
            >
              Send another link
            </button>
          </form>
          <button
            type="button"
            className="w-full text-[13px] text-charcoal/60 hover:text-charcoal pt-2"
            onClick={() => {
              setStep("email");
              setInfo(null);
            }}
          >
            Edit email address
          </button>
        </div>
      ) : step === "password" ? (
        <form onSubmit={onOpsPassword} className="mt-8 space-y-4">
          {info ? <p className="text-[13px] text-teal-dark bg-teal/10 rounded-lg px-3 py-2">{info}</p> : null}
          <label className="block">
            <span className="text-[11px] uppercase tracking-wide text-charcoal/55 font-semibold">Email</span>
            <input
              type="email"
              autoComplete="username"
              required
              readOnly
              value={email}
              className="mt-1 w-full rounded-lg border border-charcoal/15 bg-cream-mid/40 px-3 py-2.5 text-[15px] text-charcoal outline-none"
            />
          </label>
          <label className="block">
            <span className="text-[11px] uppercase tracking-wide text-charcoal/55 font-semibold">Password</span>
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(ev) => setPassword(ev.target.value)}
              className="mt-1 w-full rounded-lg border border-charcoal/15 bg-white px-3 py-2.5 text-[15px] text-charcoal outline-none focus:border-teal-dark"
            />
          </label>
          {error ? (
            <p className="text-sm text-red bg-red/10 border border-red/25 rounded-lg px-3 py-2">{error}</p>
          ) : null}
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-lg bg-red text-white font-semibold py-3 text-[15px] disabled:opacity-60 hover:bg-red-dark transition-colors shadow-sm"
          >
            {busy ? "Signing in…" : "Continue to team sign-in"}
          </button>
          <button
            type="button"
            className="w-full text-[13px] text-charcoal/60 hover:text-charcoal"
            onClick={() => {
              setStep("email");
              setPassword("");
              setInfo(null);
              setError(null);
            }}
          >
            Use a different email
          </button>
        </form>
      ) : (
        <form onSubmit={onEmailContinue} className="mt-8 space-y-4">
          <label className="block">
            <span className="text-[11px] uppercase tracking-wide text-charcoal/55 font-semibold">Email</span>
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(ev) => {
                setEmail(ev.target.value);
                setLastMagicSentAt(null);
              }}
              placeholder="you@example.com"
              className="mt-1 w-full rounded-lg border border-charcoal/15 bg-white px-3 py-2.5 text-[15px] text-charcoal placeholder:text-charcoal/35 outline-none focus:border-teal-dark"
            />
          </label>
          <p className="text-[12px] text-charcoal/55 leading-relaxed">
            We&apos;ll email a private link — quick, calm, nothing to remember unless your team asks for a password.
          </p>
          {error ? (
            <p className="text-sm text-red bg-red/10 border border-red/25 rounded-lg px-3 py-2">{error}</p>
          ) : null}
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-lg bg-teal-dark text-white font-semibold py-3 text-[15px] disabled:opacity-60 hover:opacity-95 transition-opacity shadow-sm"
          >
            {busy ? "Continuing…" : "Continue"}
          </button>
        </form>
      )}

      <p className="mt-6 text-center text-[12px] text-charcoal/50 leading-relaxed">
        <Link href="/login" className="text-teal-dark underline-offset-2 hover:underline">
          Sign in with email &amp; password
        </Link>
        <span className="mx-1.5 text-charcoal/35" aria-hidden>
          ·
        </span>
        <Link href="/ops/login" className="text-teal-dark underline-offset-2 hover:underline">
          Team dashboard
        </Link>
      </p>
      <p className="mt-3 text-center text-[12px] text-charcoal/45">
        <Link href="/" className="underline-offset-2 hover:underline">
          Back to site
        </Link>
      </p>
    </div>
  );
}
