"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type Props = {
  /** Pre-fills the target email (super-admin flows). Still editable before submit. */
  prefilledEmail?: string | null;
};

export default function StartCustomerImpersonation({ prefilledEmail = null }: Props) {
  const router = useRouter();
  const [email, setEmail] = useState(() => prefilledEmail?.trim() ?? "");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const next = prefilledEmail?.trim() ?? "";
    if (next) {
      setEmail(next);
    }
  }, [prefilledEmail]);

  async function onStart(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const target = email.trim().toLowerCase();
    if (!target.includes("@")) {
      setError("Enter a valid email.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/super-admin/impersonation/start", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetEmail: target, scope: "customer" }),
      });
      const j = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
      if (!res.ok) {
        setError(j.message ?? j.error ?? `Start failed (${res.status})`);
        return;
      }
      router.push("/account");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={(e) => void onStart(e)} className="mt-4 flex flex-wrap gap-2 items-end">
      <div className="flex-1 min-w-[200px]">
        <label className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-charcoal/45">
          Target email
        </label>
        <input
          type="email"
          value={email}
          onChange={(ev) => setEmail(ev.target.value)}
          placeholder="diner@example.com"
          className="mt-1 w-full rounded-lg border border-cream-dark bg-white px-3 py-2 text-[14px] text-charcoal"
          autoComplete="off"
          required
        />
      </div>
      <button
        type="submit"
        disabled={busy}
        className="rounded-lg bg-teal-dark px-4 py-2 text-[13px] font-semibold text-cream hover:opacity-95 disabled:opacity-50"
      >
        {busy ? "Starting…" : "Start impersonation"}
      </button>
      {error ? <p className="w-full text-[13px] text-red font-medium">{error}</p> : null}
    </form>
  );
}
