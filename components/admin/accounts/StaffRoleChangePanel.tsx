"use client";

import { useState } from "react";
import type { AccountMgmtRole } from "@/lib/accountManagement/accountsBrowse";

type Props = {
  cognitoUsername: string;
  cognitoSub: string;
  currentRole: AccountMgmtRole;
  viewerSub: string;
  viewerEmail: string | null;
};

const OPTIONS: AccountMgmtRole[] = ["customer", "admin", "super_admin"];

function labelRole(r: AccountMgmtRole): string {
  switch (r) {
    case "customer":
      return "Customer";
    case "admin":
      return "Admin";
    case "super_admin":
      return "Super Admin";
    default:
      return r;
  }
}

export default function StaffRoleChangePanel({
  cognitoUsername,
  cognitoSub,
  currentRole,
  viewerSub,
  viewerEmail,
}: Props) {
  const [nextRole, setNextRole] = useState<AccountMgmtRole>(currentRole);
  const [open, setOpen] = useState(false);
  const [ackEmail, setAckEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dirty = nextRole !== currentRole;
  const isSelfDemoteSuper =
    viewerSub === cognitoSub && currentRole === "super_admin" && nextRole !== "super_admin";

  async function confirmApply(): Promise<void> {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/admin/accounts/staff-role", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cognitoUsername,
          nextRole,
          ...(isSelfDemoteSuper ?
            { selfDemotionAckEmail: ackEmail.trim().toLowerCase() }
          : {}),
        }),
      });
      const j = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
      if (!res.ok) {
        setError(j.message ?? j.error ?? `Update failed (${res.status})`);
        return;
      }
      window.location.reload();
    } finally {
      setBusy(false);
    }
  }

  const confirmDisabledSelf =
    isSelfDemoteSuper &&
    (!(viewerEmail ?? "").trim() || ackEmail.trim().toLowerCase() !== (viewerEmail ?? "").trim().toLowerCase());

  return (
    <div className="rounded-xl border border-gold/40 bg-gold/[0.07] px-4 py-3 space-y-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-charcoal/50">
        Cognito access (super-admin only)
      </p>
      <div className="flex flex-wrap items-end gap-3">
        <label className="block min-w-[180px]">
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-charcoal/45">
            Platform role
          </span>
          <select
            value={nextRole}
            onChange={(e) => setNextRole(e.target.value as AccountMgmtRole)}
            className="mt-1 w-full rounded-lg border border-cream-dark bg-white px-3 py-2 text-[14px] text-charcoal"
          >
            {OPTIONS.map((r) => (
              <option key={r} value={r}>
                {labelRole(r)}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          disabled={!dirty || busy}
          onClick={() => {
            setError(null);
            if (!dirty) return;
            setOpen(true);
          }}
          className="rounded-lg bg-teal-dark px-4 py-2 text-[13px] font-semibold text-cream hover:opacity-95 disabled:opacity-40"
        >
          Review change…
        </button>
      </div>
      {error ? <p className="text-[13px] text-red font-medium">{error}</p> : null}

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/40 px-4">
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-md rounded-2xl border border-cream-dark bg-white p-6 shadow-xl space-y-4"
          >
            <h3 className="font-display text-xl text-charcoal">Confirm membership change</h3>
            <p className="text-[14px] text-charcoal/75 leading-relaxed">
              You are changing <span className="font-semibold text-charcoal">{cognitoUsername}</span> from{" "}
              <span className="font-mono text-[12px]">{currentRole}</span> to{" "}
              <span className="font-mono text-[12px]">{nextRole}</span>. This updates Cognito groups immediately and is
              audited.
            </p>
            {isSelfDemoteSuper ? (
              <label className="block space-y-1">
                <span className="text-[12px] font-semibold text-charcoal/70">
                  Type your sign-in email to confirm self-demotion from super-admin
                </span>
                <input
                  value={ackEmail}
                  onChange={(e) => setAckEmail(e.target.value)}
                  className="w-full rounded-lg border border-cream-dark px-3 py-2 text-[14px]"
                  placeholder={viewerEmail ?? "you@example.com"}
                  autoComplete="off"
                />
              </label>
            ) : null}
            <div className="flex flex-wrap justify-end gap-2 pt-2">
              <button
                type="button"
                className="rounded-lg border border-cream-dark px-4 py-2 text-[13px] font-semibold text-charcoal/80 hover:bg-cream/50"
                onClick={() => setOpen(false)}
                disabled={busy}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busy || confirmDisabledSelf}
                onClick={() => void confirmApply()}
                className="rounded-lg bg-red/90 px-4 py-2 text-[13px] font-semibold text-white hover:opacity-95 disabled:opacity-40"
              >
                Confirm change
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
