"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

type SessionPayload = {
  authenticated?: boolean;
};

/**
 * Sends real presence heartbeats for authenticated users only (any Cognito role).
 * Unauthenticated mounts are silent — no synthetic “online” state.
 */
export default function PresenceHeartbeat() {
  const pathname = usePathname();
  const [eligible, setEligible] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/auth/cognito/session", {
          credentials: "include",
        });
        const data = (await res.json()) as SessionPayload;
        if (!cancelled && data.authenticated) {
          setEligible(true);
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const ping = useCallback(() => {
    void fetch("/api/presence/heartbeat", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ route: pathname || "/" }),
    });
  }, [pathname]);

  useEffect(() => {
    if (!eligible) return;
    ping();
    const id = window.setInterval(ping, 45_000);
    return () => window.clearInterval(id);
  }, [eligible, ping]);

  return null;
}
