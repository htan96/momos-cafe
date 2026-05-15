"use client";

import { useEffect, useState } from "react";
import { readApiJson } from "@/lib/http/readApiJson";
import { fetchWithTimeout } from "@/lib/http/fetchWithTimeout";
import { isTransientHttpStatus } from "@/lib/http/transientHttp";

export type CustomerSessionPhase = "loading" | "in" | "out";

const SESSION_FETCH_TIMEOUT_MS = 12_000;

async function fetchCustomerSessionState(): Promise<"in" | "out" | "transient_fail"> {
  let res: Response;
  try {
    res = await fetchWithTimeout("/api/auth/cognito/session", {
      credentials: "include",
      timeoutMs: SESSION_FETCH_TIMEOUT_MS,
    });
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
