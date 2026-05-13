"use client";

import Link from "next/link";
import { useState } from "react";

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
      setMessage("If this account exists, we sent reset instructions/code.");
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
      setMessage("Password updated. Sign in again.");
      setNewPassword("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="w-full max-w-[420px] rounded-2xl border border-charcoal/10 bg-white px-8 py-10 shadow-[0_16px_64px_rgba(0,0,0,0.06)]">
      <h1 className="text-center text-2xl font-semibold text-charcoal font-display">Reset password</h1>

      {step === "request" ? (
        <form onSubmit={(e) => void onRequest(e)} className="mt-8 space-y-4">
          <label className="block">
            <span className="text-[11px] uppercase tracking-wide text-charcoal/55 font-semibold">
              Email or username
            </span>
            <input
              required
              value={username}
              onChange={(ev) => setUsername(ev.target.value)}
              className="mt-1 w-full rounded-lg border border-charcoal/15 bg-white px-3 py-2.5 text-[15px]"
            />
          </label>
          {error ? <p className="text-sm text-red bg-red/10 rounded-lg px-3 py-2">{error}</p> : null}
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-lg bg-teal-dark text-white font-semibold py-3 disabled:opacity-60"
          >
            {busy ? "Sending…" : "Send reset code"}
          </button>
        </form>
      ) : (
        <form onSubmit={(e) => void onConfirm(e)} className="mt-8 space-y-4">
          {message ? <p className="text-sm text-teal-dark bg-teal/10 rounded-lg px-3 py-2">{message}</p> : null}
          <label className="block">
            <span className="text-[11px] uppercase tracking-wide text-charcoal/55 font-semibold">Code</span>
            <input
              required
              value={code}
              onChange={(ev) => setCode(ev.target.value)}
              className="mt-1 w-full rounded-lg border border-charcoal/15 bg-white px-3 py-2.5 text-[15px]"
            />
          </label>
          <label className="block">
            <span className="text-[11px] uppercase tracking-wide text-charcoal/55 font-semibold">
              New password
            </span>
            <input
              type="password"
              required
              value={newPassword}
              onChange={(ev) => setNewPassword(ev.target.value)}
              className="mt-1 w-full rounded-lg border border-charcoal/15 bg-white px-3 py-2.5 text-[15px]"
            />
          </label>
          {error ? <p className="text-sm text-red bg-red/10 rounded-lg px-3 py-2">{error}</p> : null}
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-lg bg-teal-dark text-white font-semibold py-3 disabled:opacity-60"
          >
            {busy ? "Updating…" : "Confirm new password"}
          </button>
        </form>
      )}

      <p className="mt-6 text-center text-[13px]">
        <Link href="/auth/cognito/login" className="text-teal-dark underline">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
