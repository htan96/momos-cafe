"use client";

import { useEffect, useState } from "react";
import { readApiJson } from "@/lib/http/readApiJson";
import { isTransientHttpStatus } from "@/lib/http/transientHttp";

export type CustomerSessionPhase = "loading" | "in" | "out";

async function fetchCustomerSessionState(): Promise<"in" | "out" | "transient_fail"> {
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

/** Signed-in customer group **in** for header/bottom nav; mirrors {@link HeaderAuthLink} behavior. */
export function useCustomerSessionPhase(): CustomerSessionPhase {
  const [phase, setPhase] = useState<CustomerSessionPhase>("loading");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      let state = await fetchCustomerSessionState();
      if (!cancelled && state === "transient_fail") {
        await new Promise((r) => setTimeout(r, 450));
        if (!cancelled) {
          state = await fetchCustomerSessionState();
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

  return phase;
}
