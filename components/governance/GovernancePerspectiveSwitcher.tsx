"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  defaultRouteForPerspective,
  OperationalPerspective,
  perspectiveLabel,
} from "@/lib/governance/perspective";

type ApiPerspective = "governance" | "admin_operations" | "customer_experience";

export default function GovernancePerspectiveSwitcher() {
  const router = useRouter();
  const [current, setCurrent] = useState<ApiPerspective>("governance");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/super-admin/perspective", { credentials: "include" });
        if (!res.ok) return;
        const data = (await res.json()) as { perspective?: string };
        if (cancelled) return;
        const p = data.perspective as ApiPerspective | undefined;
        if (p === "governance" || p === "admin_operations" || p === "customer_experience") {
          setCurrent(p);
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const onChange = useCallback(
    async (next: OperationalPerspective) => {
      setPending(true);
      try {
        const res = await fetch("/api/super-admin/perspective", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ perspective: next }),
        });
        if (!res.ok) return;
        const data = (await res.json()) as { defaultRoute?: string };
        setCurrent(next as ApiPerspective);
        const dest = data.defaultRoute ?? defaultRouteForPerspective(next);
        router.push(dest);
      } finally {
        setPending(false);
      }
    },
    [router]
  );

  return (
    <label className="flex flex-col gap-1 min-w-0">
      <span className="text-[9px] font-semibold uppercase tracking-[0.18em] text-cream/55 leading-none">
        Viewing
      </span>
      <select
        className="rounded-lg border border-cream/25 bg-teal-dark/80 text-cream text-[12px] font-semibold uppercase tracking-wide pl-2 pr-7 py-1.5 max-w-[220px] truncate cursor-pointer focus:outline-none focus:ring-2 focus:ring-gold/35 disabled:opacity-60"
        value={current}
        disabled={pending}
        aria-label="Operational perspective"
        onChange={(e) => {
          const v = e.target.value as OperationalPerspective;
          void onChange(v);
        }}
      >
        <option value={OperationalPerspective.governance}>{perspectiveLabel(OperationalPerspective.governance)}</option>
        <option value={OperationalPerspective.admin_operations}>
          {perspectiveLabel(OperationalPerspective.admin_operations)}
        </option>
        <option value={OperationalPerspective.customer_experience}>
          {perspectiveLabel(OperationalPerspective.customer_experience)}
        </option>
      </select>
    </label>
  );
}
