"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { normalizeAuthEmail } from "@/lib/auth/emailNormalize";

/**
 * Operations console login — uses `OPS_SESSION` (separate from Cognito). Redirect target from `next` query.
 */
export default function OpsLoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawNext = searchParams.get("next") ?? "/ops";
  const nextPath = useMemo(() => {
    const t = rawNext.trim();
    if (!t.startsWith("/") || t.startsWith("//") || t.includes("://")) return "/ops";
    return t.slice(0, 512) || "/ops";
  }, [rawNext]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
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
    <div className="w-full max-w-[420px] rounded-2xl border border-[#3d3830]/60 bg-[#1c1916] text-[#f5e5c0] shadow-[0_24px_80px_rgba(0,0,0,0.35)] px-8 py-10">
      <Link href="/" className="flex justify-center mb-6 hover:opacity-90 transition-opacity">
        <Image src="/images/logo.png" alt="Momo's Café" width={160} height={80} className="h-12 w-auto" priority />
      </Link>

      <p className="text-center text-[11px] uppercase tracking-[0.28em] text-[#8FC4C4] font-semibold">
        Operations
      </p>
      <h1 className="mt-2 text-center text-2xl font-semibold tracking-tight font-display">Ops console sign-in</h1>
      <p className="mt-2 text-center text-[14px] text-[#c9bba8] leading-relaxed">
        Separate from storefront Cognito — uses the password gate configured for your ops emails.
      </p>

      <form onSubmit={(e) => void onSubmit(e)} className="mt-8 space-y-4">
        <label className="block">
          <span className="text-[11px] uppercase tracking-wide text-[#c9bba8]/80 font-semibold">Email</span>
          <input
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(ev) => setEmail(ev.target.value)}
            className="mt-1 w-full rounded-lg border border-[#3d3830] bg-[#141210] px-3 py-2.5 text-[15px] text-[#f5e5c0] outline-none focus:border-[#2f6d66]"
          />
        </label>
        <label className="block">
          <span className="text-[11px] uppercase tracking-wide text-[#c9bba8]/80 font-semibold">Password</span>
          <input
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(ev) => setPassword(ev.target.value)}
            className="mt-1 w-full rounded-lg border border-[#3d3830] bg-[#141210] px-3 py-2.5 text-[15px] text-[#f5e5c0] outline-none focus:border-[#2f6d66]"
          />
        </label>
        {error ? (
          <p className="text-sm text-red-300 bg-red-950/40 border border-red-800/50 rounded-lg px-3 py-2">{error}</p>
        ) : null}
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-lg bg-[#2f6d66] text-white font-semibold py-3 text-[15px] disabled:opacity-60 hover:opacity-95 transition-opacity"
        >
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <p className="mt-8 text-center text-[12px] text-[#c9bba8]/70">
        <Link href="/login" className="text-[#8FC4C4] underline-offset-2 hover:underline">
          Main site sign-in (Cognito)
        </Link>
        <span className="mx-1.5 opacity-40" aria-hidden>
          ·
        </span>
        <Link href="/login/email" className="text-[#8FC4C4] underline-offset-2 hover:underline">
          Email / magic link
        </Link>
      </p>
    </div>
  );
}
