"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import {
  OPERATIONAL_IDENTITY_SEARCH_MIN_Q,
} from "@/lib/super-admin/operationalIdentity/constants";
import type { OperationalIdentityCandidate } from "@/lib/super-admin/operationalIdentity/types";

export default function OperationalIdentitySearchClient() {
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [rows, setRows] = useState<OperationalIdentityCandidate[]>([]);

  const handleSearch = useCallback(async () => {
    const qt = q.trim();
    setError(null);
    setHint(null);

    if (qt.length === 0) {
      setRows([]);
      return;
    }

    if (qt.length < OPERATIONAL_IDENTITY_SEARCH_MIN_Q) {
      setHint(`Type at least ${OPERATIONAL_IDENTITY_SEARCH_MIN_Q} characters.`);
      setRows([]);
      return;
    }

    setLoading(true);
    try {
      const qs = encodeURIComponent(qt.slice(0, 128));
      const res = await fetch(`/api/super-admin/operations/operational-identity/search?q=${qs}`, {
        cache: "no-store",
      });
      if (!res.ok) {
        setError(await res.text());
        setRows([]);
        return;
      }
      const body = (await res.json()) as {
        hint?: string;
        cognitoConfigured?: boolean;
        cognitoLookup?: {
          degraded?: boolean;
          scannedUsers?: number;
          scanCapped?: boolean;
          errorCode?: string;
          errorDetail?: string;
        };
        candidates?: OperationalIdentityCandidate[];
      };
      const hintPieces: string[] = [];
      if (body.hint) hintPieces.push(body.hint);
      if (body.cognitoLookup?.degraded) {
        const code = body.cognitoLookup.errorCode ?? "COGNITO_DEGRADED";
        const scanned = typeof body.cognitoLookup.scannedUsers === "number" ? `${body.cognitoLookup.scannedUsers}` : "?";
        const cap = body.cognitoLookup.scanCapped ? ` · scan capped (${scanned} rows examined)` : ` · inspected ${scanned} rows`;
        hintPieces.push(`Cognito search degraded (${code}${cap}).`);
      } else if (body.cognitoLookup?.scanCapped) {
        const scanned =
          typeof body.cognitoLookup.scannedUsers === "number" ? `${body.cognitoLookup.scannedUsers}` : "several hundred";
        hintPieces.push(`Cognito scan hit hard cap (${scanned}+ rows enumerated).`);
      }
      if (body.cognitoConfigured === false) hintPieces.push("User pool variables missing — results are prisma-only.");

      const hintResolved = hintPieces.join(" ");

      setHint(hintResolved.length > 0 ? hintResolved : null);
      setRows(body.candidates ?? []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [q]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex min-w-[min(440px,calc(100%-4rem))] flex-1 flex-col gap-2 text-[13px] text-charcoal/80">
          <span className="font-medium uppercase tracking-[0.1em] text-[11px] text-charcoal/45">Lookup</span>
          <input
            className="rounded-xl border border-cream-dark/70 bg-white px-3 py-2 text-charcoal outline-none ring-teal-soft/55 focus-visible:ring-[3px]"
            placeholder="customer email · uuid · cognito subject"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void handleSearch();
            }}
          />
        </label>
        <button
          type="button"
          disabled={loading}
          onClick={() => void handleSearch()}
          className="rounded-xl bg-teal-dark px-4 py-2 text-[13px] font-semibold text-white shadow-[0_1px_0_rgba(0,0,0,0.12)] hover:opacity-92 disabled:pointer-events-none disabled:opacity-50"
        >
          {loading ? "Searching…" : "Search"}
        </button>
      </div>

      {hint ? <p className="text-[13px] text-charcoal/60">{hint}</p> : null}
      {error ? (
        <p className="text-[13px] text-red-700" role="alert">
          Search failed ({error}). You may need a super-admin browser session with JSON auth.
        </p>
      ) : null}

      <ul className="space-y-2">
        {rows.map((c) => {
          const routeId =
            encodeURIComponent(c.kind === "customer" ? c.id : ((c.cognitoSub ?? c.id)?.trim() || ""));
          const href = `/super-admin/operations/operational-identity/${routeId}`;
          const title = c.email ?? c.cognitoSub ?? c.id;
          const linkageLabel =
            c.linkage === "linked_customer" ? "Linked customer" : c.linkage === "cognito_only" ? "Cognito-only" : "Prisma (no pool link)";

          return (
            <li key={`${c.kind}:${routeId}`}>
              <Link
                href={href}
                className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-cream-dark/60 bg-white/[0.9] px-4 py-3 shadow-[0_12px_32px_-20px_rgba(46,42,37,0.22)] hover:border-teal-dark/55"
              >
                <div className="flex-1 min-w-[200px]">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="font-medium text-teal-dark">{title}</div>
                    <span
                      className="rounded-full border border-teal-soft/65 bg-teal-soft/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-charcoal/70"
                      title={`Cognito tenant wiring ${c.cognitoConfigured ? "present" : "absent"} (env-derived).`}
                    >
                      {c.cognitoConfigured ? "Pool wired" : "Pool off-env"}
                    </span>
                    <span className="rounded-full border border-cream-dark/60 bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-charcoal/55">
                      {linkageLabel}
                    </span>
                    {typeof c.enabled === "boolean" ? (
                      <span className="text-[11px] text-charcoal/50">{c.enabled ? "ENABLED" : "DISABLED"}</span>
                    ) : (
                      <span className="text-[11px] text-charcoal/40">ENABLED · unknown</span>
                    )}
                  </div>
                  <div className="mt-2 text-[12px] leading-snug text-charcoal/60">{c.subtitle}</div>
                  <div className="mt-2 space-y-1 font-mono text-[11px] text-charcoal/45">
                    {c.kind === "customer" ? (
                      <div>
                        prisma <span className="text-charcoal/70">{c.id}</span>
                      </div>
                    ) : null}
                    {c.cognitoUsername ? (
                      <div>
                        username <span className="text-charcoal/70">{c.cognitoUsername}</span>
                      </div>
                    ) : null}
                    {c.preferredUsername ? (
                      <div>
                        preferred_username <span className="text-charcoal/70">{c.preferredUsername}</span>
                      </div>
                    ) : null}
                    {c.cognitoSub ? (
                      <div>
                        sub <span className="text-charcoal/70">{c.cognitoSub}</span>
                      </div>
                    ) : null}
                    {c.email ? (
                      <div className="text-[11px]">
                        email <span className="text-charcoal/70">{c.email}</span>
                      </div>
                    ) : null}
                  </div>
                  {c.groups.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {c.groups.map((g) => (
                        <span
                          key={`${routeId}:${g}`}
                          className="rounded-md border border-cream-dark/60 bg-charcoal/[0.04] px-2 py-0.5 text-[11px] text-charcoal/70"
                        >
                          {g}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-2 text-[11px] text-charcoal/40">Assigned groups · none surfaced for this dossier probe.</p>
                  )}
                </div>
                <span className="self-center text-[11px] font-semibold uppercase tracking-[0.16em] text-charcoal/40">Open</span>
              </Link>
            </li>
          );
        })}
      </ul>

      {!loading && rows.length === 0 && q.trim().length >= OPERATIONAL_IDENTITY_SEARCH_MIN_Q ? (
        <p className="text-[13px] text-charcoal/55">No matches — try fuller email snippet or UUID.</p>
      ) : null}
    </div>
  );
}
