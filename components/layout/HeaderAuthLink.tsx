"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { readApiJson } from "@/lib/http/readApiJson";
import { isTransientHttpStatus } from "@/lib/http/transientHttp";

type FetchState = "in" | "out" | "transient_fail";

async function fetchSessionState(): Promise<FetchState> {
  let res: Response;
  try {
    res = await fetch("/api/auth/cognito/session", { credentials: "include" });
  } catch {
    return "transient_fail";
  }
  const parsed = await readApiJson<{ authenticated?: boolean; user?: { groups?: string[] } | null }>(res);
  if (!parsed.ok) {
    return isTransientHttpStatus(parsed.status) ? "transient_fail" : "out";
  }
  const d = parsed.data;
  const customer = Boolean(d.authenticated && d.user?.groups?.includes("customer"));
  return customer ? "in" : "out";
}

export default function HeaderAuthLink() {
  const [phase, setPhase] = useState<"loading" | "in" | "out">("loading");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      let state = await fetchSessionState();
      if (!cancelled && state === "transient_fail") {
        await new Promise((r) => setTimeout(r, 450));
        if (!cancelled) {
          state = await fetchSessionState();
        }
      }
      if (!cancelled) {
        setPhase(state === "in" ? "in" : "out");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (phase === "loading") {
    return (
      <span className="inline-block w-[4.5rem] h-4 rounded bg-cream-dark/40 animate-pulse" aria-hidden />
    );
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
