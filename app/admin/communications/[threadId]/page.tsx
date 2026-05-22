import Link from "next/link";
import { notFound } from "next/navigation";
import OpsPageHeader from "@/components/operations/OpsPageHeader";
import OpsPanel from "@/components/operations/OpsPanel";
import StateToneChip from "@/components/operations/StateToneChip";
import StatusPill from "@/components/governance/StatusPill";
import { readInboundOperationalFlags } from "@/lib/ops/emailInboundUi";
import { opsLoadEmailThread } from "@/lib/ops/queries";

export const dynamic = "force-dynamic";

export default async function AdminCommunicationThreadPage({ params }: { params: Promise<{ threadId: string }> }) {
  const { threadId } = await params;
  const thread = await opsLoadEmailThread(threadId);
  if (!thread) notFound();

  const messages = [...thread.messages].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

  return (
    <div className="space-y-8">
      <OpsPageHeader
        title={thread.subjectSnapshot ?? "Email thread"}
        subtitle="Operational correlation to commerce orders · read-only timeline from `EmailMessage` rows."
        actions={
          <Link
            href="/admin/communications"
            className="rounded-lg border border-cream-dark bg-white px-3 py-2 text-[12px] font-semibold uppercase tracking-[0.1em] text-charcoal/80 hover:bg-cream/80 transition-colors"
          >
            ← Threads
          </Link>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <OpsPanel title="Timeline" eyebrow="EmailMessage">
          <ol className="space-y-4">
            {messages.map((m) => {
              const q = m.direction === "inbound" ? readInboundOperationalFlags(m.rawPayload) : { quarantine: false };
              const sub = `${m.fromEmail} → ${JSON.stringify(m.toEmails)}${
                q.quarantine ? ` · quarantined${q.reason ? ` (${q.reason})` : ""}` : ""
              }`;
              return (
                <li key={m.id} className="rounded-xl border border-cream-dark/65 bg-white/85 px-4 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusPill variant="neutral">{m.direction}</StatusPill>
                    <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-charcoal/45">
                      {m.deliveryStatus}
                    </span>
                    <time
                      dateTime={m.createdAt.toISOString()}
                      className="text-[11px] text-charcoal/45 ml-auto"
                      title={m.createdAt.toISOString()}
                    >
                      {m.createdAt.toLocaleString()}
                    </time>
                  </div>
                  <p className="text-[12px] text-charcoal/75 mt-2 break-words">{sub}</p>
                </li>
              );
            })}
          </ol>

          <div className="mt-8 rounded-xl border border-dashed border-charcoal/[0.12] bg-cream/55 p-4 text-[13px] text-charcoal/65 leading-relaxed">
            Inbound ingestion is wired; UI replies are intentionally disabled — compose from your SES-capable client with the same
            routing headers.
          </div>
        </OpsPanel>

        <div className="space-y-4">
          <OpsPanel title="Linked order" eyebrow="Commerce">
            {thread.commerceOrder ?
              <Link
                href={`/admin/orders/${thread.commerceOrder.id}`}
                className="inline-flex flex-wrap items-center gap-2 text-[13px] font-semibold text-teal-dark hover:underline"
              >
                Order {thread.commerceOrder.id.slice(0, 8)}…
                <StateToneChip label={thread.commerceOrder.status} tone="neutral" />
              </Link>
            : <p className="text-[13px] text-charcoal/58">No commerce order linked.</p>}
          </OpsPanel>

          <OpsPanel title="Customer" eyebrow="Profile">
            <p className="text-[14px] text-charcoal">{thread.customer?.email ?? "Unknown"}</p>
          </OpsPanel>
        </div>
      </div>
    </div>
  );
}
