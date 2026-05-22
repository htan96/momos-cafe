"use client";

import { useState } from "react";

type Props = {
  customerId: string;
  hasCognitoSub: boolean;
};

/** Non-dismissible stewardship notice — not a toast “success”. */
function StubAlert({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="rounded-xl border border-amber-900/35 bg-amber-50 px-4 py-3 text-[13px] text-amber-950/90 shadow-sm leading-relaxed"
      role="status"
      aria-live="polite"
    >
      <p className="font-semibold text-amber-950 mb-1">Request recorded — Cognito global sign-out not enabled</p>
      {children}
    </div>
  );
}

export default function CustomerRevokeSessionsStub({ customerId, hasCognitoSub }: Props) {
  const [note, setNote] = useState("");
  const [statusDetail, setStatusDetail] = useState<string | null>(null);
  const [posted, setPosted] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatusDetail(null);
    setPosted(false);
    if (note.trim().length < 10) {
      setStatusDetail("Explain why you are invoking this steward path (minimum 10 characters).");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/super-admin/users/customers/${encodeURIComponent(customerId)}/revoke-sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ justification: note.trim() }),
      });
      const j = (await res.json().catch(() => ({}))) as {
        deferred?: boolean;
        message?: string;
        error?: string;
      };
      const bodyMessage = typeof j.message === "string" && j.message.trim() ? j.message : null;
      const errText = bodyMessage ?? j.error ?? `${res.status}`;

      if (res.ok && j.deferred) {
        setStatusDetail(errText);
        setPosted(true);
      } else if (!res.ok) {
        setStatusDetail(errText);
        setPosted(false);
      } else {
        setStatusDetail(errText);
        setPosted(true);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <StubAlert>
        <p className="text-[12px] text-amber-950/85 mb-3">
          <span className="font-semibold">No sessions were invalidated.</span> This POST records an append-only
          governance breadcrumb only. Wire <span className="font-mono">AdminUserGlobalSignOut</span> (IAM + pool policy)
          before implying customer logout succeeded.
        </p>
      </StubAlert>
      {!hasCognitoSub ?
        <p className="text-[12px] text-charcoal/70">
          This diner row lacks <span className="font-mono">external_auth_subject</span> — a wired Cognito revoke would likely
          no-op for this profile.
        </p>
      : null}

      <form className="space-y-2" onSubmit={(ev) => void onSubmit(ev)}>
        <label className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-charcoal/45">
          Stewardship note (audit-only)
        </label>
        <textarea
          value={note}
          onChange={(ev) => setNote(ev.target.value)}
          placeholder="Why you filed this request (persisted only in GovernanceAuditEvent until Cognito revocation ships)."
          className="w-full rounded-lg border border-cream-dark bg-white px-3 py-2 text-[13px] text-charcoal min-h-[88px]"
        />
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-charcoal px-4 py-2 text-[13px] font-semibold text-cream hover:opacity-95 disabled:opacity-50"
        >
          {busy ? "Recording…" : "Record stewardship request"}
        </button>
      </form>

      {statusDetail ?
        posted ?
          <StubAlert>
            <p className="text-[12px]">{statusDetail}</p>
          </StubAlert>
        : <p className="text-[12px] text-red-dark whitespace-pre-wrap font-medium">{statusDetail}</p>
      : null}
    </div>
  );
}
