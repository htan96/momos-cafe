"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export default function OpsLoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawNext = searchParams.get("next") ?? "/ops";
  const nextPath =
    rawNext.startsWith("/ops") && !rawNext.startsWith("//") ? rawNext : "/ops";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/ops/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error === "invalid_credentials" ? "Invalid email or password." : "Sign-in failed.");
        return;
      }
      router.replace(nextPath);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="w-full max-w-md rounded-xl border border-[#3d3830] bg-[#1c1916] shadow-2xl shadow-black/40 p-8">
      <p className="text-[10px] uppercase tracking-[0.25em] text-[#8FC4C4]/90">Momo&apos;s</p>
      <h1 className="mt-2 text-2xl font-semibold text-[#f5e5c0] tracking-tight">Ops sign-in</h1>
      <p className="mt-2 text-[13px] text-[#c9bba8]/85">
        Hospitality console — authorized operators only.
      </p>

      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <label className="block">
          <span className="text-[11px] uppercase tracking-wide text-[#c9bba8]/70">Email</span>
          <input
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-md border border-[#3d3830] bg-[#252119] px-3 py-2 text-[14px] text-[#f5e5c0] outline-none focus:border-[#2f6d66]"
          />
        </label>
        <label className="block">
          <span className="text-[11px] uppercase tracking-wide text-[#c9bba8]/70">Password</span>
          <input
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-md border border-[#3d3830] bg-[#252119] px-3 py-2 text-[14px] text-[#f5e5c0] outline-none focus:border-[#2f6d66]"
          />
        </label>

        {error ? (
          <p className="text-sm text-red-300 bg-red-950/30 border border-red-900/40 rounded-md px-3 py-2">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-md bg-[#2f6d66] hover:bg-[#276058] text-[#f5e5c0] font-semibold py-2.5 text-[14px] disabled:opacity-60 transition-colors"
        >
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
