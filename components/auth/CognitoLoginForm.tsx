"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useCognitoAuth } from "@/components/auth/CognitoAuthProvider";
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
    <div className="w-full max-w-[420px] rounded-2xl border border-charcoal/10 bg-white px-8 py-10 shadow-[0_16px_64px_rgba(0,0,0,0.06)]">
      <p className="text-center text-[11px] uppercase tracking-[0.28em] text-teal-dark font-semibold">
        Momo&apos;s Café
      </p>
      <h1 className="mt-2 text-center text-2xl font-semibold text-charcoal tracking-tight font-display">Sign in</h1>
      <p className="mt-2 text-center text-[13px] text-charcoal/70">
        Familiar email and password sign-in when you&apos;ve set one up — perfect for café accounts used across visits.
      </p>
      <p className="mt-3 text-center text-[13px] text-charcoal/65">
        Prefer a calm link instead? Try{" "}
        <Link href="/login/email" className="text-teal-dark underline underline-offset-2 font-semibold">
          sign-in by email
        </Link>
        .
      </p>

      <form onSubmit={(e) => void onSubmit(e)} className="mt-8 space-y-4">
        <label className="block">
          <span className="text-[11px] uppercase tracking-wide text-charcoal/55 font-semibold">
            Email or username
          </span>
          <input
            autoComplete="username"
            required
            value={username}
            onChange={(ev) => setUsername(ev.target.value)}
            className="mt-1 w-full rounded-lg border border-charcoal/15 bg-white px-3 py-2.5 text-[15px] text-charcoal outline-none focus:border-teal-dark"
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
          className="w-full rounded-lg bg-teal-dark text-white font-semibold py-3 text-[15px] disabled:opacity-60 hover:opacity-95 transition-opacity"
        >
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <div className="mt-6 flex flex-col gap-2 text-center text-[13px] text-charcoal/60">
        <Link href="/signup" className="hover:text-charcoal">
          Create account
        </Link>
        <Link href="/forgot-password" className="hover:text-charcoal">
          Forgot password
        </Link>
        <Link href="/ops/login" className="hover:text-charcoal">
          Team dashboard sign-in (separate)
        </Link>
        <Link href="/" className="hover:text-charcoal">
          Back to site
        </Link>
      </div>
    </div>
  );
}
