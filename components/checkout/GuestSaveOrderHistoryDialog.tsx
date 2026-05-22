"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useCustomerSessionPhase } from "@/lib/auth/cognito/useCustomerSessionPhase";
import { commerceCheckoutShell } from "@/lib/commerce/tokens";

const SIGNUP_ACC = `/auth/cognito/signup?next=${encodeURIComponent("/account")}`;

export type Props = {
  checkoutEmail?: string | null;
  commerceOrderId?: string | null;
};

/**
 * Lightweight prompt after paid guest checkout: save history by creating an account with the checkout email.
 */
export default function GuestSaveOrderHistoryDialog({ checkoutEmail, commerceOrderId }: Props) {
  const phase = useCustomerSessionPhase();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (phase !== "out") return;
    const oid = commerceOrderId?.trim() ?? "";
    const key = oid ? `momos_guest_account_prompt:${oid}` : "momos_guest_account_prompt:latest";
    try {
      if (sessionStorage.getItem(key)) return;
    } catch {
      /* ignore */
    }
    setOpen(true);
  }, [phase, commerceOrderId]);

  if (!open || phase !== "out") return null;

  const oid = commerceOrderId?.trim() ?? "";
  const dismissKey = oid ? `momos_guest_account_prompt:${oid}` : "momos_guest_account_prompt:latest";

  function dismiss() {
    try {
      sessionStorage.setItem(dismissKey, "1");
    } catch {
      /* ignore */
    }
    setOpen(false);
  }

  return (
    <div
      className="fixed inset-0 z-[1300] flex items-end justify-center sm:items-center p-4 bg-charcoal/45"
      role="dialog"
      aria-modal="true"
      aria-labelledby="guest-save-history-title"
    >
      <div
        className={`${commerceCheckoutShell.card} w-full max-w-md p-6 shadow-2xl border-2 border-cream-dark`}
      >
        <h2 id="guest-save-history-title" className="font-display text-xl text-charcoal tracking-tight">
          Save your order history
        </h2>
        <p className="mt-3 text-[14px] text-charcoal/75 leading-relaxed">
          Create a free account so future visits appear in one place — no perks pitch, just your receipts when you want
          them.
        </p>
        {checkoutEmail?.trim() ? (
          <p className="mt-4 text-[12px] text-charcoal/55 leading-relaxed">
            Use{" "}
            <span className="font-semibold text-charcoal/80">{checkoutEmail.trim()}</span> at signup so we can connect
            this order automatically.
          </p>
        ) : null}
        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          <Link
            href={SIGNUP_ACC}
            className="flex-1 text-center rounded-xl bg-teal-dark text-cream font-semibold py-3 px-4 text-sm hover:opacity-95"
            onClick={dismiss}
          >
            Create account
          </Link>
          <button
            type="button"
            onClick={dismiss}
            className="flex-1 rounded-xl border-2 border-cream-dark bg-white text-charcoal font-semibold py-3 px-4 text-sm hover:bg-cream/50"
          >
            Maybe later
          </button>
        </div>
        <p className="mt-4 text-[11px] text-charcoal/45 text-center">
          Already registered?{" "}
          <Link href={`/login?next=${encodeURIComponent("/account")}`} className="text-teal-dark font-semibold underline-offset-2 hover:underline" onClick={dismiss}>
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
