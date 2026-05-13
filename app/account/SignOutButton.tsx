"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  /** Merges onto the button — defaults to subdued charcoal styling. */
  className?: string;
};

export default function SignOutButton({ className }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function onSignOut() {
    setBusy(true);
    try {
      await fetch("/api/auth/cognito/logout", { method: "POST", credentials: "include" });
      router.replace("/login");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      disabled={busy}
      onClick={onSignOut}
      className={
        className ??
        "text-[13px] font-semibold text-charcoal/55 hover:text-charcoal underline-offset-2 hover:underline disabled:opacity-50"
      }
    >
      {busy ? "Signing out…" : "Sign out"}
    </button>
  );
}
