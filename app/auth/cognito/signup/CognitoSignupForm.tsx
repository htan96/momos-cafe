"use client";

import Link from "next/link";
import { useState } from "react";

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
      setInfo("Peek your inbox — we sent a verification code.");
      setPassword("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="w-full max-w-[420px] rounded-2xl border border-charcoal/10 bg-white px-8 py-10 shadow-[0_16px_64px_rgba(0,0,0,0.06)]">
      <h1 className="text-center text-2xl font-semibold text-charcoal font-display">Create account</h1>
      <p className="mt-2 text-center text-[13px] text-charcoal/70">
        We&apos;ll email a short code so you can finish — quick and human, no spam.
      </p>

      <form onSubmit={(e) => void onSubmit(e)} className="mt-8 space-y-4">
        <label className="block">
          <span className="text-[11px] uppercase tracking-wide text-charcoal/55 font-semibold">Username</span>
          <input
            required
            value={username}
            onChange={(ev) => setUsername(ev.target.value)}
            className="mt-1 w-full rounded-lg border border-charcoal/15 bg-white px-3 py-2.5 text-[15px]"
          />
        </label>
        <label className="block">
          <span className="text-[11px] uppercase tracking-wide text-charcoal/55 font-semibold">
            Email (optional)
          </span>
          <input
            type="email"
            value={email}
            onChange={(ev) => setEmail(ev.target.value)}
            className="mt-1 w-full rounded-lg border border-charcoal/15 bg-white px-3 py-2.5 text-[15px]"
          />
        </label>
        <label className="block">
          <span className="text-[11px] uppercase tracking-wide text-charcoal/55 font-semibold">Password</span>
          <input
            type="password"
            required
            value={password}
            onChange={(ev) => setPassword(ev.target.value)}
            className="mt-1 w-full rounded-lg border border-charcoal/15 bg-white px-3 py-2.5 text-[15px]"
          />
        </label>

        {info ? <p className="text-sm text-teal-dark bg-teal/10 rounded-lg px-3 py-2">{info}</p> : null}
        {error ? <p className="text-sm text-red bg-red/10 rounded-lg px-3 py-2">{error}</p> : null}

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-lg bg-teal-dark text-white font-semibold py-3 text-[15px] disabled:opacity-60"
        >
          {busy ? "Creating…" : "Create account"}
        </button>
      </form>

      <p className="mt-6 text-center text-[13px]">
        <Link href="/login" className="text-teal-dark underline">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
