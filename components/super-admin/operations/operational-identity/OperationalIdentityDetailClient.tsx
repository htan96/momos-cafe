"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import OperationalCard from "@/components/governance/OperationalCard";
import type { OperationalIdentityBundleSerialized } from "@/lib/super-admin/operationalIdentity/resolveOperationalIdentity";
import { KNOWN_COGNITO_GROUPS } from "@/lib/auth/cognito/roles";

type Props = {
  initialBundle: OperationalIdentityBundleSerialized;
  viewerSub: string | null;
  viewerEmail: string | null;
};

function predictAfterGroups(before: readonly string[], groupName: string, action: "add" | "remove"): string[] {
  if (action === "add") {
    const next = new Set(before);
    if (groupName === "super_admin") {
      next.add("admin");
    }
    next.add(groupName);
    return [...next].sort();
  }
  return before.filter((g) => g !== groupName).sort();
}

export default function OperationalIdentityDetailClient({ initialBundle, viewerSub, viewerEmail }: Props) {
  const router = useRouter();
  const [bundle, setBundle] = useState(initialBundle);

  useEffect(() => {
    setBundle(initialBundle);
  }, [initialBundle]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [pending, setPending] = useState<{ groupName: string; action: "add" | "remove" } | null>(null);
  const [selfAck, setSelfAck] = useState("");

  const targetSub = bundle.identity?.cognitoSub ?? "";
  const beforeGroups = bundle.identity?.assignedGroups ?? [];

  const predictedAfter = useMemo(() => {
    if (!pending) return [];
    return predictAfterGroups(beforeGroups, pending.groupName, pending.action);
  }, [beforeGroups, pending]);

  async function reloadBundleFromApi() {
    const keyRaw = encodeURIComponent(bundle.queryKey);
    const res = await fetch(`/api/super-admin/operations/operational-identity/${keyRaw}`, { cache: "no-store" });
    if (!res.ok) throw new Error(await res.text());
    const body = (await res.json()) as OperationalIdentityBundleSerialized;
    setBundle(body);
    router.refresh();
  }

  function openConfirm(gn: string, action: "add" | "remove") {
    setErr(null);
    setSelfAck("");
    setPending({ groupName: gn, action });
    setModalOpen(true);
  }

  async function submitMutation() {
    if (!pending || !targetSub) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/super-admin/operations/operational-identity/${encodeURIComponent(targetSub)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetCognitoSub: targetSub,
          groupName: pending.groupName,
          action: pending.action,
          dangerConfirm: true,
          ...(pending.action === "remove" &&
          pending.groupName === "super_admin" &&
          viewerSub === targetSub ?
            { selfDemotionAckEmail: selfAck }
          : {}),
        }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => null)) as { message?: string; error?: string } | null;
        setErr(j?.message ?? j?.error ?? (await res.text()));
        setBusy(false);
        return;
      }
      setModalOpen(false);
      setPending(null);
      await reloadBundleFromApi();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {!bundle.cognitoConfigured ? (
        <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-950">
          Cognito Admin SDK unavailable in this deployment (<strong>missing env wiring</strong>) — reads come from prisma
          only where possible. Group edits stay disabled until <span className="font-mono">COGNITO_REGION</span>,{" "}
          <span className="font-mono">COGNITO_USER_POOL_ID</span>, and{" "}
          <span className="font-mono">COGNITO_CLIENT_ID</span> resolve.
        </p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <OperationalCard
          title="Identity"
          meta={
            bundle.identity ?
              <span>
                cognito sub <span className="font-mono text-[10px]">{bundle.identity.cognitoSub}</span>
              </span>
            : "unresolved"
          }
        >
          {bundle.identity ?
            <dl className="grid gap-2 text-[13px] text-charcoal/85">
              <div className="flex flex-wrap justify-between gap-2">
                <dt className="text-charcoal/50">Username</dt>
                <dd className="font-mono text-[12px]">{bundle.identity.cognitoUsername}</dd>
              </div>
              <div className="flex flex-wrap justify-between gap-2">
                <dt className="text-charcoal/50">Email</dt>
                <dd>{bundle.identity.email ?? "—"}</dd>
              </div>
              <div className="flex flex-wrap justify-between gap-2">
                <dt className="text-charcoal/50">Display</dt>
                <dd>{bundle.identity.displayName ?? "—"}</dd>
              </div>
              <div className="flex flex-wrap justify-between gap-2">
                <dt className="text-charcoal/50">Enabled</dt>
                <dd>{bundle.identity.enabled === null ? "—" : bundle.identity.enabled ? "yes" : "no"}</dd>
              </div>
            </dl>
          : <p className="text-[13px] text-charcoal/60">No Cognito profile resolved for this key.</p>}
        </OperationalCard>

        <OperationalCard title="Prisma customer" meta={bundle.customer ? "linked" : "none"}>
          {bundle.customer ?
            <dl className="grid gap-2 text-[13px] text-charcoal/85">
              <div className="flex flex-wrap justify-between gap-2">
                <dt className="text-charcoal/50">Id</dt>
                <dd className="font-mono text-[11px]">{bundle.customer.id}</dd>
              </div>
              <div className="flex flex-wrap justify-between gap-2">
                <dt className="text-charcoal/50">Email</dt>
                <dd>{bundle.customer.email ?? "—"}</dd>
              </div>
              <div className="flex flex-wrap justify-between gap-2">
                <dt className="text-charcoal/50">Auth subject</dt>
                <dd className="break-all font-mono text-[11px]">{bundle.customer.externalAuthSubject ?? "—"}</dd>
              </div>
            </dl>
          : <p className="text-[13px] text-charcoal/60">No Customer row — staff-only profile or pre-provisioned user.</p>}
        </OperationalCard>
      </div>

      <OperationalCard title="Operational counts" meta={bundle.customer ? "prisma rollup" : "requires customer linkage"}>
        {bundle.counts ?
          <>
            <ul className="grid gap-2 text-[13px] sm:grid-cols-2">
              <li className="flex justify-between rounded-xl bg-cream-mid/15 px-3 py-2">
                <span className="text-charcoal/60">Orders</span>
                <span className="font-semibold text-teal-dark">{bundle.counts.orders}</span>
              </li>
              <li className="flex justify-between rounded-xl bg-cream-mid/15 px-3 py-2">
                <span className="text-charcoal/60">Payments</span>
                <span className="font-semibold text-teal-dark">{bundle.counts.payments}</span>
              </li>
              <li className="flex justify-between rounded-xl bg-cream-mid/15 px-3 py-2">
                <span className="text-charcoal/60">Shipments</span>
                <span className="font-semibold text-teal-dark">{bundle.counts.shipments}</span>
              </li>
              <li className="flex justify-between rounded-xl bg-cream-mid/15 px-3 py-2">
                <span className="text-charcoal/60">Notification events (~)</span>
                <span className="font-semibold text-teal-dark">
                  {bundle.counts.notificationEventsApprox ?? "—"}
                </span>
              </li>
            </ul>
            {bundle.counts.notificationsNote ?
              <p className="mt-3 text-[12px] leading-relaxed text-charcoal/55">{bundle.counts.notificationsNote}</p>
            : null}
          </>
        : <p className="text-[13px] text-charcoal/55">Counts require a prisma Customer linkage.</p>}
      </OperationalCard>

      <OperationalCard title="Deep links" meta="Super-admin consoles">
        <ul className="space-y-2 text-[13px]">
          {bundle.deepLinks.customerDossier ?
            <li>
              <Link className="text-teal-dark underline underline-offset-2" href={bundle.deepLinks.customerDossier}>
                Customer dossier
              </Link>
            </li>
          : null}
          <li>
            <Link className="text-teal-dark underline underline-offset-2" href={bundle.deepLinks.orderOperationsHref}>
              Order operations
            </Link>
          </li>
          <li>
            <Link
              className="text-teal-dark underline underline-offset-2"
              href={bundle.deepLinks.paymentIntegrityHref}
            >
              Payment integrity
            </Link>
          </li>
          <li>
            <Link
              className="text-teal-dark underline underline-offset-2"
              href="/super-admin/operations/webhook-replay"
            >
              Webhook replay console
            </Link>
          </li>
        </ul>
      </OperationalCard>

      <OperationalCard
        title="Pool groups"
        meta={bundle.cognitoConfigured && bundle.identity ? "Cognito assigned" : "read-only"}
      >
        {!bundle.identity ?
          <p className="text-[13px] text-charcoal/60">Nothing to edit without a Cognito resolution.</p>
        : !bundle.cognitoConfigured ?
          <p className="text-[13px] text-charcoal/60">
            Role changes require the Cognito Admin SDK env + IAM — use the AWS console meanwhile. See runbook links in
            architecture doc.
          </p>
        : (
          <div className="space-y-3">
            <p className="text-[12px] text-charcoal/55">
              Granular adds/removals append <span className="font-mono">OPERATIONS_IDENTITY_ROLE_MEMBERSHIP_CHANGE</span>{" "}
              with ListGroups snapshots. Ladder promotions also exist on{" "}
              <span className="font-mono">/api/admin/accounts/staff-role</span>.
            </p>
            <ul className="flex flex-wrap gap-2">
              {beforeGroups.sort().map((g) => (
                <li
                  key={g}
                  className="rounded-full border border-cream-dark/60 bg-white px-3 py-1 font-mono text-[11px] text-teal-dark"
                >
                  {g}
                </li>
              ))}
            </ul>
            <div className="grid gap-3 sm:grid-cols-3">
              {KNOWN_COGNITO_GROUPS.map((gn) => {
                const has = beforeGroups.includes(gn);
                return (
                  <div key={gn} className="rounded-2xl border border-cream-dark/55 bg-cream-mid/10 p-3">
                    <div className="font-mono text-[12px] text-charcoal/80">{gn}</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={has || busy}
                        onClick={() => openConfirm(gn, "add")}
                        className="rounded-lg bg-teal-dark px-2 py-1 text-[11px] font-semibold text-white disabled:opacity-40"
                      >
                        Add
                      </button>
                      <button
                        type="button"
                        disabled={!has || busy}
                        onClick={() => openConfirm(gn, "remove")}
                        className="rounded-lg border border-cream-dark/70 px-2 py-1 text-[11px] font-semibold text-charcoal/80 disabled:opacity-40"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </OperationalCard>

      <OperationalCard
        title="Recent operational feed"
        meta={bundle.timeline.length ? "merged ops + governance" : "empty"}
      >
        {bundle.customer && bundle.identity ?
          <>
            {bundle.timelinePartial ?
              <p className="mb-3 text-[12px] text-charcoal/55">
                Showing the newest slice only — full timeline lives on the customer dossier.
              </p>
            : null}
            <ul className="space-y-2">
              {bundle.timeline.map((row) => (
                <li
                  key={row.id}
                  className="rounded-xl border border-cream-dark/40 bg-white/80 px-3 py-2 text-[12px] text-charcoal/80"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="font-medium text-teal-dark">{row.headline}</span>
                    <time className="text-[11px] text-charcoal/45" dateTime={row.at}>
                      {new Date(row.at).toLocaleString()}
                    </time>
                  </div>
                  <div className="mt-1 text-[11px] text-charcoal/50">
                    {row.lane} · {row.kind} · {row.rawType ?? "—"}
                  </div>
                  {row.detail ?
                    <p className="mt-1 text-[11px] text-charcoal/60">{row.detail}</p>
                  : null}
                </li>
              ))}
            </ul>
          </>
        : (
          <p className="text-[13px] text-charcoal/55">
            Feed not wired unless both prisma Customer + Cognito subject resolve (honest stub).
          </p>
        )}
      </OperationalCard>

      {err ?
        <p className="text-[13px] text-red-700" role="alert">
          {err}
        </p>
      : null}

      {modalOpen && pending ?
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/40 px-4 py-8"
          role="dialog"
          aria-modal="true"
        >
          <div className="max-h-[min(92vh,720px)] w-full max-w-lg overflow-y-auto rounded-2xl border border-cream-dark/60 bg-white p-5 shadow-2xl">
            <h3 className="font-display text-lg text-teal-dark">Confirm pool group change</h3>
            <p className="mt-2 text-[13px] text-charcoal/75">
              This calls Cognito <span className="font-mono">AdminAddUserToGroup</span> /{" "}
              <span className="font-mono">AdminRemoveUserFromGroup</span> and records governance metadata.
            </p>
            <div className="mt-4 grid gap-2 rounded-xl bg-cream-mid/20 p-3 text-[12px]">
              <div className="flex justify-between gap-2">
                <span className="text-charcoal/55">Action</span>
                <span className="font-mono">
                  {pending.action} · {pending.groupName}
                </span>
              </div>
              <div>
                <div className="text-charcoal/55">Before</div>
                <div className="mt-1 font-mono text-[11px] text-charcoal/80">{beforeGroups.sort().join(", ") || "—"}</div>
              </div>
              <div>
                <div className="text-charcoal/55">Expected after (simulated)</div>
                <div className="mt-1 font-mono text-[11px] text-teal-dark">{predictedAfter.join(", ") || "—"}</div>
              </div>
            </div>

            {pending.action === "remove" && pending.groupName === "super_admin" && viewerSub === targetSub ?
              <label className="mt-4 block text-[12px] text-charcoal/75">
                Type your super-admin email to acknowledge self-demotion
                <input
                  className="mt-1 w-full rounded-lg border border-cream-dark/70 px-2 py-1 font-mono text-[12px]"
                  value={selfAck}
                  onChange={(e) => setSelfAck(e.target.value)}
                  placeholder={viewerEmail ?? "you@example.com"}
                  autoComplete="off"
                />
              </label>
            : null}

            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  setModalOpen(false);
                  setPending(null);
                }}
                className="rounded-xl border border-cream-dark/70 px-3 py-2 text-[12px] font-semibold text-charcoal/80"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={
                  busy ||
                  (pending.action === "remove" &&
                    pending.groupName === "super_admin" &&
                    viewerSub === targetSub &&
                    selfAck.trim().toLowerCase() !== (viewerEmail?.trim().toLowerCase() ?? ""))
                }
                onClick={() => void submitMutation()}
                className="rounded-xl bg-red-700 px-3 py-2 text-[12px] font-semibold text-white disabled:opacity-45"
              >
                {busy ? "Applying…" : "Confirm change"}
              </button>
            </div>
          </div>
        </div>
      : null}
    </>
  );
}
