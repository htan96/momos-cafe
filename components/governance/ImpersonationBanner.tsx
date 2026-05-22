/**
 * OperationalPerspectiveBanner — global governance stripe when audited impersonation is active (mounted from `Layout`).
 */
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import GovernancePerspectiveSwitcher from "@/components/governance/GovernancePerspectiveSwitcher";

type StatusOk = {
  active: true;
  actor: { sub: string; email: string };
  target: { email: string; sub: string | null };
  scope: "customer" | "admin";
  startedAt: string;
  ledgerId?: string;
};

function formatLedgerDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return "—";
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rs = s % 60;
  if (m < 60) return rs ? `${m}m ${rs}s` : `${m}m`;
  const h = Math.floor(m / 60);
  const rm = m % 60;
  return rm ? `${h}h ${rm}m` : `${h}h`;
}

function scopeSurfaceLabel(scope: StatusOk["scope"]): string {
  return scope === "admin" ? "Admin" : "Customer";
}

function authorityLabelFromScope(scope: StatusOk["scope"]): string {
  /* Customer-scope envelopes are audited super_admin starters; admin impersonation deferred but reserved. */
  return scope === "admin" ? "Super Admin (delegated ops)" : "Super Admin";
}

/** Isolated ticking clock — keeps interval `setState` out of banner `useEffect` scope for lint / compiler hooks. */
function ImpersonationDurationClock({ startedAt }: { startedAt: string }) {
  const startedMs = Date.parse(startedAt);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 15_000);
    return () => window.clearInterval(id);
  }, []);

  const durationLabel =
    Number.isFinite(startedMs) ? formatLedgerDuration(now - startedMs) : "—";

  return (
    <>
      Session <span className="font-medium text-gold/90">{durationLabel}</span>
    </>
  );
}

function shouldOfferGovernanceSwitcher(pathname: string): boolean {
  if (
    pathname === "/login" ||
    pathname.startsWith("/login/") ||
    pathname === "/signup" ||
    pathname.startsWith("/signup/") ||
    pathname === "/forgot-password" ||
    pathname.startsWith("/forgot-password/")
  ) {
    return false;
  }
  return true;
}

/**
 * Persisted governance edge when audited impersonation is active — authority vs storefront subject.
 */
export default function OperationalPerspectiveBanner() {
  const router = useRouter();
  const pathname = usePathname() ?? "";
  const [data, setData] = useState<StatusOk | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function refreshImpersonationEnvelope() {
      try {
        const res = await fetch("/api/super-admin/impersonation/status", { credentials: "include" });
        if (cancelled) return;
        if (!res.ok) {
          if (!cancelled) setData(null);
          return;
        }
        const j = (await res.json()) as {
          active?: boolean;
          actor?: StatusOk["actor"];
          target?: StatusOk["target"];
          scope?: string;
          startedAt?: string;
          ledgerId?: string;
        };
        if (cancelled) return;
        if (
          j.active &&
          j.actor &&
          j.target &&
          (j.scope === "customer" || j.scope === "admin") &&
          j.startedAt
        ) {
          setData({
            active: true,
            actor: j.actor,
            target: j.target,
            scope: j.scope,
            startedAt: j.startedAt,
            ledgerId: j.ledgerId,
          });
        } else if (!cancelled) {
          setData(null);
        }
      } catch {
        if (!cancelled) setData(null);
      }
    }

    void refreshImpersonationEnvelope();
    return () => {
      cancelled = true;
    };
  }, []);

  const exit = useCallback(async () => {
    await fetch("/api/super-admin/impersonation/end", { method: "POST", credentials: "include" });
    setData(null);
    router.refresh();
  }, [router]);

  /** Super-admin shell mounts {@link GovernancePerspectiveSwitcher} via `PlatformShell.headerAddon`. */
  const showLensInBanner = !pathname.startsWith("/super-admin");

  if (!shouldOfferGovernanceSwitcher(pathname) || !data) return null;

  return (
    <aside
      role="status"
      aria-label="Support impersonation and operational perspective controls"
      className="w-full border-b border-gold/50 bg-teal-dark/98 text-cream backdrop-blur-[2px] shadow-md"
    >
      <div className="mx-auto flex w-full max-w-[1200px] flex-wrap items-center justify-between gap-3 px-4 py-2.5 md:gap-4">
        <div className="min-w-[200px] flex-1 flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <p className="text-[12px] leading-snug text-cream/95">
            <span className="font-semibold text-gold">Viewing as</span>
            {": "}
            <span>{scopeSurfaceLabel(data.scope)}</span>
            <span className="text-cream/70"> (“{data.target.email}”) </span>
            <span className="text-cream/55 hidden sm:inline">·</span>
            <span className="block text-[11px] text-gold/90 sm:inline sm:text-[12px] sm:before:content-['_']">
              Authority: <span className="font-medium text-cream">{authorityLabelFromScope(data.scope)}</span>
            </span>
            {" · "}
            <span className="text-cream/70 text-[11px]">
              <ImpersonationDurationClock startedAt={data.startedAt} />
            </span>
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2 md:gap-3">
          {showLensInBanner ? (
            <div className="hidden sm:flex min-w-[120px] max-w-[210px]">
              <GovernancePerspectiveSwitcher variant="compact" />
            </div>
          ) : null}
          <Link
            href="/super-admin/users/customers"
            className="text-[11px] font-semibold uppercase tracking-[0.12em] text-cream/75 underline-offset-4 hover:text-cream hover:underline whitespace-nowrap"
          >
            Open directory
          </Link>
          <Link
            href="/super-admin"
            className="text-[11px] font-semibold uppercase tracking-[0.12em] text-cream/75 underline-offset-4 hover:text-cream hover:underline whitespace-nowrap"
          >
            Dashboard
          </Link>
          <button
            type="button"
            className="shrink-0 rounded-md bg-gold px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-teal-dark shadow-sm hover:bg-gold/90"
            onClick={() => void exit()}
          >
            Return to Super&nbsp;Admin perspective
          </button>
        </div>
        {showLensInBanner ? (
          <div className="flex sm:hidden w-full">
            <GovernancePerspectiveSwitcher variant="compact" className="w-full" />
          </div>
        ) : null}
      </div>
    </aside>
  );
}
