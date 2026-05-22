"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  defaultRouteForPerspective,
  OperationalPerspective,
  perspectiveLabel,
} from "@/lib/governance/perspective";

type ApiPerspective = "governance" | "admin_operations" | "customer_experience";

type Variant = "default" | "compact";

export type GovernancePerspectiveSwitcherProps = {
  variant?: Variant;
  className?: string;
};

export default function GovernancePerspectiveSwitcher({
  variant = "default",
  className,
}: GovernancePerspectiveSwitcherProps) {
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

  const isCompact = variant === "compact";

  return (
    <label
      className={
        isCompact ?
          ["flex flex-col gap-0.5 min-w-0 w-full", className].filter(Boolean).join(" ")
        : ["flex flex-col gap-1 min-w-0", className].filter(Boolean).join(" ")
      }
    >
      <span
        className={
          isCompact ?
            "text-[8px] font-semibold uppercase tracking-[0.16em] text-cream/50 leading-none"
          : "text-[9px] font-semibold uppercase tracking-[0.18em] text-cream/55 leading-none"
        }
      >
        {isCompact ? "Viewing lens" : "Viewing"}
      </span>
      <select
        className={
          isCompact ?
            "w-full rounded-md border border-gold/40 bg-charcoal/50 text-cream text-[11px] font-semibold uppercase tracking-wide px-2 pr-8 py-1 max-w-none truncate cursor-pointer focus:outline-none focus:ring-2 focus:ring-gold/40 disabled:opacity-60"
          : "rounded-lg border border-cream/25 bg-teal-dark/80 text-cream text-[12px] font-semibold uppercase tracking-wide pl-2 pr-7 py-1.5 max-w-[220px] truncate cursor-pointer focus:outline-none focus:ring-2 focus:ring-gold/35 disabled:opacity-60"
        }
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
