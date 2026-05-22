import Link from "next/link";
import AuditTimeline from "@/components/governance/AuditTimeline";
import GovPageHeader from "@/components/governance/GovPageHeader";
import OperationalCard from "@/components/governance/OperationalCard";
import StatusPill from "@/components/governance/StatusPill";
import { loadElevatedStaffRoster } from "@/lib/accountManagement/loadSuperAdminElevatedStaffRoster";
import { getCognitoConfig } from "@/lib/auth/cognito/config";
import { loadElevatedGovernanceAuditPreview } from "@/lib/governance/governanceAuditDisplay";
import { loadRecentImpersonationLedgerPreview } from "@/lib/governance/impersonationLedgerPreview";

export const dynamic = "force-dynamic";

export default async function SuperAdminUsersAdminsPage() {
  const cfg = getCognitoConfig();
  let roster:
    | { state: "loaded"; rows: Awaited<ReturnType<typeof loadElevatedStaffRoster>> }
    | { state: "deferred_iam" }
    | { state: "no_pool" } = { state: "no_pool" };

  if (cfg) {
    try {
      const rows = await loadElevatedStaffRoster(cfg);
      roster = { state: "loaded", rows };
    } catch {
      roster = { state: "deferred_iam" };
    }
  }

  const [elevatedAudit, impersonationLedger] = await Promise.all([
    loadElevatedGovernanceAuditPreview(20),
    loadRecentImpersonationLedgerPreview(15),
  ]);

  return (
    <div className="space-y-8">
      <GovPageHeader
        eyebrow="Users · Admins"
        title="Operator access & audits"
        subtitle="Who holds elevated Cognito groups, what break-glass governance just happened, and how support impersonation is showing up in the ledger. All evidence is read-only here—execution stays in Cognito and the admin shell."
        actions={
          <Link
            href="/admin/accounts"
            className="rounded-lg border border-teal-dark/35 bg-teal/[0.08] px-4 py-2 text-[13px] font-semibold text-teal-dark hover:bg-teal/[0.12]"
          >
            Staff directory
          </Link>
        }
      />

      <OperationalCard title="Elevated access roster" meta="Cognito pool · admin & super_admin groups">
        {roster.state === "no_pool" ?
          <p className="text-[13px] text-charcoal/70 leading-relaxed">
            Cognito pool credentials are not wired for this runtime, so the roster cannot be resolved from here. Use your
            identity console for this environment, then cross-check in the staff directory when the pool is reachable.
          </p>
        : roster.state === "deferred_iam" ?
          <div className="rounded-xl border border-gold/40 bg-gold/[0.08] px-4 py-3">
            <p className="text-[13px] font-semibold text-charcoal/85">Listing deferred — IAM</p>
            <p className="mt-2 text-[13px] text-charcoal/72 leading-relaxed">
              Runtime credentials lack permission to list pool operators. Rows are withheld instead of mocking data—repair IAM
              for this tenant or use Cognito/AWS reporting while access is negotiated.
            </p>
          </div>
        : roster.rows.length === 0 ?
          <p className="text-[13px] text-charcoal/60">No users currently appear in the combined admin cohorts.</p>
        : (
          <div className="overflow-x-auto rounded-lg border border-cream-dark/50">
            <table className="w-full min-w-[52rem] text-left text-[12px]">
              <thead className="border-b border-cream-dark/50 bg-cream-mid/20 text-[10px] uppercase tracking-[0.08em] text-charcoal/50">
                <tr>
                  <th className="px-2 py-2 font-semibold">Access</th>
                  <th className="px-2 py-2 font-semibold">Username</th>
                  <th className="px-2 py-2 font-semibold">Identity</th>
                  <th className="px-2 py-2 font-semibold">Pool state</th>
                  <th className="px-2 py-2 font-semibold">Staff profile</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cream-dark/40 bg-white/80">
                {roster.rows.map((row) => {
                  const profileHref = `/admin/accounts/staff/${encodeURIComponent(row.username)}`;
                  return (
                    <tr key={row.sub} className="align-top">
                      <td className="px-2 py-2 whitespace-nowrap">
                        <StatusPill variant={row.accessLevel === "super_admin" ? "warning" : "neutral"}>
                          {row.accessLevel === "super_admin" ? "Super admin" : "Admin"}
                        </StatusPill>
                      </td>
                      <td className="px-2 py-2 font-mono text-[11px] break-all">{row.username}</td>
                      <td className="px-2 py-2">
                        <div className="text-[13px] font-semibold text-charcoal/90">{row.name?.trim() || "—"}</div>
                        <div className="text-[11px] break-all text-charcoal/65">{row.email ?? "No email"}</div>
                      </td>
                      <td className="px-2 py-2 whitespace-nowrap">
                        {row.enabled === true ?
                          <StatusPill variant="ok">Enabled</StatusPill>
                        : row.enabled === false ?
                          <span title="Cognito marks this principal disabled — investigate before re-enabling">
                            <StatusPill variant="down">Disabled</StatusPill>
                          </span>
                        : (
                          <span title="Enablement flag omitted from Cognito listing response">
                            <StatusPill variant="neutral">Unknown</StatusPill>
                          </span>
                        )}
                      </td>
                      <td className="px-2 py-2">
                        <Link href={profileHref} className="font-semibold text-teal-dark hover:underline">
                          Open admin profile
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </OperationalCard>

      <OperationalCard
        title="Governance preview"
        meta={`Latest · elevated verbs · ${elevatedAudit.length.toString()} shown`}
        footer={
          <Link
            href="/super-admin/security/audit-logs"
            className="text-[12px] font-semibold text-teal-dark underline-offset-2 hover:underline"
          >
            Full governance timeline
          </Link>
        }
      >
        <p className="text-[12px] text-charcoal/60 leading-relaxed mb-4">
          Role edits, impersonation envelopes, incidents, failure triage, maintenance gates, platform feature toggles, and recovery
          actions—anything that materially moves operator authority or customer-impacting state.
        </p>
        {elevatedAudit.length ?
          <AuditTimeline rows={elevatedAudit} />
        : (
          <p className="text-[13px] text-charcoal/55">No qualifying rows recorded yet.</p>
        )}
      </OperationalCard>

      <OperationalCard title="Customer impersonation ledger" meta="Audited envelopes · Postgres">
        <p className="text-[12px] text-charcoal/60 leading-relaxed mb-4">
          Support impersonation envelopes write immutable ledger rows; matching governance audits carry the justification
          operators supplied at launch. Keep this view open during audits and shift hand-offs.
        </p>
        {impersonationLedger.length === 0 ?
          <p className="text-[13px] text-charcoal/55">No impersonation ledger rows recorded yet.</p>
        : (
          <div className="overflow-x-auto rounded-lg border border-cream-dark/50">
            <table className="w-full min-w-[42rem] text-left text-[12px]">
              <thead className="border-b border-cream-dark/50 bg-cream-mid/20 text-[10px] uppercase tracking-[0.08em] text-charcoal/50">
                <tr>
                  <th className="px-2 py-2 font-semibold">When</th>
                  <th className="px-2 py-2 font-semibold">Actor</th>
                  <th className="px-2 py-2 font-semibold">Target</th>
                  <th className="px-2 py-2 font-semibold">Ledger</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cream-dark/40 bg-white/80">
                {impersonationLedger.map((row) => (
                  <tr key={row.id}>
                    <td className="px-2 py-2 whitespace-nowrap text-charcoal/65">
                      {row.startedAt.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
                    </td>
                    <td className="px-2 py-2 break-all text-[11px]">{row.actorEmail}</td>
                    <td className="px-2 py-2">
                      <div className="break-all text-[11px]">{row.targetEmail}</div>
                      <span className="text-[10px] uppercase tracking-[0.1em] text-charcoal/40">{row.scope}</span>
                    </td>
                    <td className="px-2 py-2">
                      <span className="font-mono text-[11px] text-charcoal/75">{row.id.slice(0, 12)}…</span>
                      {row.gist ?
                        <p className="mt-1 text-[11px] text-charcoal/62 leading-snug">{row.gist}</p>
                      : (
                        <p className="mt-1 text-[11px] text-charcoal/40 italic">Governance gist not correlated</p>
                      )}
                      {row.endedAt ?
                        <p className="mt-1 text-[10px] text-charcoal/45">
                          Ended {row.endedAt.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
                        </p>
                      : (
                        <p className="mt-1 text-[10px] font-semibold text-espresso">Active session</p>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </OperationalCard>
    </div>
  );
}
