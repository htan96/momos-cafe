"use client";

import Link from "next/link";
import { useCustomerSessionPhase } from "@/lib/auth/cognito/useCustomerSessionPhase";

export default function HeaderAuthLink() {
  const phase = useCustomerSessionPhase();

  if (phase === "loading") {
    return (
      <span className="inline-block w-[4.5rem] h-4 rounded bg-cream-dark/40 animate-pulse" aria-hidden />
    );
  }

  const linkCls =
    "font-semibold text-[13px] tracking-[0.15em] uppercase py-2 px-3.5 rounded-md text-teal-dark hover:bg-teal/10 hover:text-teal-dark transition-colors duration-200";

  if (phase === "in") {
    return (
      <Link href="/account" className={linkCls}>
        Account
      </Link>
    );
  }

  return (
    <>
      <Link href="/login" className={linkCls}>
        Sign in
      </Link>
      <Link href="/account" className={linkCls}>
        Track order
      </Link>
    </>
  );
}
