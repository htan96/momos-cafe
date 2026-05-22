"use client";

import Link from "next/link";
import { useCustomerSessionPhase } from "@/lib/auth/cognito/useCustomerSessionPhase";

const ACCOUNT_LOGIN_HREF = `/login?next=${encodeURIComponent("/account")}`;

const linkInline =
  "font-semibold text-[13px] tracking-[0.15em] uppercase py-2 px-3.5 rounded-md text-teal-dark hover:bg-teal/10 hover:text-teal-dark transition-colors duration-200";

const linkStack =
  "block w-full rounded-xl px-3 py-3 text-sm font-semibold uppercase tracking-[0.1em] text-teal-dark text-center hover:bg-teal/10 active:bg-teal/15 transition-colors";

type Props = {
  /** `stack` = full-width links for the mobile header sheet. */
  layout?: "inline" | "stack";
};

export default function HeaderAuthLink({ layout = "inline" }: Props) {
  const phase = useCustomerSessionPhase();
  const linkCls = layout === "stack" ? linkStack : linkInline;

  if (phase === "loading") {
    if (layout === "stack") {
      return <div className="h-12 rounded-xl bg-cream-dark/40 animate-pulse" aria-hidden />;
    }
    return <span className="inline-block w-[4.5rem] h-4 rounded bg-cream-dark/40 animate-pulse" aria-hidden />;
  }

  if (phase === "in") {
    return (
      <Link href="/account" className={linkCls}>
        Account
      </Link>
    );
  }

  if (layout === "stack") {
    return (
      <Link href={ACCOUNT_LOGIN_HREF} className={linkCls}>
        Account
      </Link>
    );
  }

  return (
    <Link href={ACCOUNT_LOGIN_HREF} className={linkCls}>
      Account
    </Link>
  );
}
