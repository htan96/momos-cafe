import Link from "next/link";
import type { CommunicationTimelineEntryDto } from "@/lib/operations/communications/buildOperationalCommunicationTimeline";
import OrderConsoleCommunicationsNoteForm from "@/components/operations/order-console/OrderConsoleCommunicationsNoteForm";

function formatTs(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return iso;
  }
}

function CommunicationRow({ row }: { row: CommunicationTimelineEntryDto }) {
  if (row.kind === "email_message") {
    return (
      <li className="py-3 border-b border-cream-dark/35 last:border-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-charcoal/45">
          <time dateTime={row.ts}>{formatTs(row.ts)}</time>
          <span className="rounded-full border border-cream-dark/50 px-2 py-[1px] text-[10px]">Email</span>
          <Link href={`/ops/communications/${row.threadId}`} className="font-mono normal-case text-teal-dark hover:underline">
            thread · {row.threadId.slice(0, 8)}…
          </Link>
        </div>
        <p className="text-[12px] text-charcoal/70">
          <span className="font-semibold">{row.direction}</span> · {row.fromEmail}
          {row.subject ? ` · ${row.subject}` : ""}
        </p>
        {row.bodyPreview ? <p className="text-[12px] text-charcoal/80 whitespace-pre-wrap">{row.bodyPreview}</p> : null}
      </li>
    );
  }

  if (row.kind === "internal_note") {
    return (
      <li className="py-3 border-b border-cream-dark/35 last:border-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-charcoal/45">
          <time dateTime={row.ts}>{formatTs(row.ts)}</time>
          <span className="rounded-full border border-amber-500/55 px-2 py-[1px] text-[10px] text-amber-950/90">Internal note</span>
          <span className="font-mono normal-case text-charcoal/55">{row.noteKind}</span>
          <span className="font-mono normal-case text-charcoal/40">{row.visibility}</span>
        </div>
        <p className="text-[12px] text-charcoal/80 whitespace-pre-wrap">{row.body}</p>
        <p className="text-[11px] font-mono text-charcoal/45">
          author · {row.authorStaffSub ?? "—"}
          {row.supportIssueId ? ` · issue ${row.supportIssueId.slice(0, 12)}…` : ""}
        </p>
      </li>
    );
  }

  if (row.kind === "notification_event") {
    return (
      <li className="py-3 border-b border-cream-dark/35 last:border-0 space-y-2">
        <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-charcoal/45">
          <time dateTime={row.ts}>{formatTs(row.ts)}</time>
          <span className="rounded-full border border-teal-dark/45 px-2 py-[1px] text-[10px]">Notification queue</span>
          <span className="font-mono normal-case text-charcoal/55">{row.type}</span>
          <span className="font-mono normal-case text-charcoal/40">{row.processedAt ? "processed" : "pending"}</span>
        </div>
        <pre className="text-[11px] whitespace-pre-wrap break-all bg-charcoal/[0.02] border border-charcoal/[0.04] rounded-md p-2 max-h-40 overflow-auto">
          {typeof row.payload === "object" ? JSON.stringify(row.payload, null, 2) : String(row.payload)}
        </pre>
      </li>
    );
  }

  const r = row;
  return (
    <li className="py-3 border-b border-cream-dark/35 last:border-0 space-y-1">
      <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-charcoal/45">
        <time dateTime={r.ts}>{formatTs(r.ts)}</time>
        <span className="rounded-full border border-purple-600/35 px-2 py-[1px] text-[10px]">Webhook receipt</span>
        <span className="font-mono normal-case text-charcoal/55">{r.provider}</span>
        <span className="font-mono normal-case text-charcoal/40">{r.processingStatus}</span>
      </div>
      <p className="text-[12px] text-charcoal/70">{r.eventType ?? "event type unavailable"} · signature {r.signatureValid ? "valid" : "invalid"}</p>
    </li>
  );
}

export default function OrderConsoleCommunicationsSection({
  commerceOrderId,
  timeline,
  canCommunicationsWrite,
}: {
  commerceOrderId: string;
  timeline: CommunicationTimelineEntryDto[];
  canCommunicationsWrite: boolean;
}) {
  return (
    <details className="group rounded-xl border border-cream-dark/50 bg-white/80 shadow-sm overflow-hidden">
      <summary className="cursor-pointer list-none px-4 py-3 flex flex-wrap items-center justify-between gap-2 bg-cream-mid/15 hover:bg-cream-mid/25 transition">
        <div>
          <p className="text-[13px] font-semibold text-charcoal">Communications timeline</p>
          <p className="text-[11px] text-charcoal/50 mt-1">
            Email threads, internal notes (new below), outbound queue slices (<span className="font-mono">email.*</span> /{" "}
            <span className="font-mono">commerce.*</span> · 90d), SES/Resend webhook receipts keyed to this order.
          </p>
        </div>
        <span className="text-[11px] font-semibold text-teal-dark group-open:hidden">Expand</span>
        <span className="text-[11px] font-semibold text-teal-dark hidden group-open:inline">Collapse</span>
      </summary>
      <div className="px-4 pb-4 space-y-4 border-t border-cream-dark/40">
        <div className="pt-4">
          <OrderConsoleCommunicationsNoteForm commerceOrderId={commerceOrderId} canWrite={canCommunicationsWrite} />
        </div>
        {timeline.length === 0 ? (
          <p className="text-[13px] text-charcoal/60">Nothing on this stitched communication rail yet.</p>
        ) : (
          <ul className="divide-y divide-transparent max-h-[32rem] overflow-y-auto pr-1">
            {timeline.map((row) => (
              <CommunicationRow key={row.id} row={row} />
            ))}
          </ul>
        )}
      </div>
    </details>
  );
}
