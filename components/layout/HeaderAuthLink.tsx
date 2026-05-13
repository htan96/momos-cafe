"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function HeaderAuthLink() {
  const [phase, setPhase] = useState<"loading" | "in" | "out">("loading");

  useEffect(() => {
    fetch("/api/auth/cognito/session", { credentials: "include" })
      .then((r) => r.json())
      .then((d: { authenticated?: boolean; user?: { groups?: string[] } | null }) => {
        const customer = Boolean(d.authenticated && d.user?.groups?.includes("customer"));
        setPhase(customer ? "in" : "out");
      })
      .catch(() => setPhase("out"));
  }, []);

  if (phase === "loading") {
    return <span className="inline-block w-[4.5rem] h-4 rounded bg-cream-dark/40 animate-pulse" aria-hidden />;
  }

  if (phase === "in") {
    return (
      <Link
        href="/account"
        className="font-semibold text-[13px] tracking-[0.15em] uppercase py-2 px-3.5 rounded-md text-teal-dark hover:bg-teal/10 hover:text-teal-dark transition-colors duration-200"
      >
        Account
      </Link>
    );
  }

  return (
    <Link
      href="/login"
      className="font-semibold text-[13px] tracking-[0.15em] uppercase py-2 px-3.5 rounded-md text-teal-dark hover:bg-teal/10 hover:text-teal-dark transition-colors duration-200"
    >
      Sign in
    </Link>
  );
}
