import Link from "next/link";
import { notFound } from "next/navigation";
import OpsPageHeader from "@/components/ops/OpsPageHeader";
import OpsTimeline, { type OpsTimelineItem } from "@/components/ops/OpsTimeline";
import StateChip from "@/components/ops/StateChip";
import { opsLoadEmailThread } from "@/lib/ops/queries";

export default async function OpsCommunicationDetailPage({
  params,
}: {
  params: Promise<{ threadId: string }>;
}) {
  const { threadId } = await params;
  const thread = await opsLoadEmailThread(threadId);
  if (!thread) notFound();

  const timeline: OpsTimelineItem[] = thread.messages.map((m) => ({
    id: m.id,
    title: `${m.direction} · ${m.deliveryStatus}`,
    subtitle: `${m.fromEmail} → ${JSON.stringify(m.toEmails)}`,
    ts: m.createdAt,
  }));

  return (
    <>
      <OpsPageHeader
        title={thread.subjectSnapshot ?? "Thread"}
        description="Message timeline — operational correlation to commerce orders."
        actions={
          <Link href="/ops/communications" className="text-[12px] text-[#8FC4C4] hover:underline">
            ← All threads
          </Link>
        }
      />

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div>
          <h2 className="text-[13px] font-semibold text-[#f5e5c0] mb-3">Messages</h2>
          <OpsTimeline items={timeline} />
          <div className="mt-8 rounded-lg border border-[#3d3830] bg-[#252119] p-4 opacity-60">
            <p className="text-[12px] font-semibold text-[#f5e5c0]/90 mb-2">Reply</p>
            <p className="text-[12px] text-[#c9bba8]/85 mb-3">
              Composer wired once outbound reply API + threading guarantees ship — today staff should send via mail client or Resend scripts.
            </p>
            <textarea
              disabled
              rows={4}
              className="w-full rounded-md border border-[#3d3830] bg-[#1c1916] px-3 py-2 text-[13px] text-[#c9bba8]/50 cursor-not-allowed"
              placeholder="Reply stub — not enabled"
            />
          </div>
        </div>

        <aside className="space-y-4">
          <div className="rounded-lg border border-[#3d3830] bg-[#252119] p-4 space-y-2">
            <h3 className="text-[12px] uppercase tracking-wide text-[#c9bba8]/70">Links</h3>
            {thread.commerceOrder ? (
              <Link
                href={`/ops/orders/${thread.commerceOrder.id}`}
                className="inline-flex items-center gap-2 text-[13px] text-[#8FC4C4] hover:underline"
              >
                Order {thread.commerceOrder.id.slice(0, 8)}…
                <StateChip label={thread.commerceOrder.status} tone="neutral" />
              </Link>
            ) : (
              <p className="text-[12px] text-[#c9bba8]/75">No commerce order linked.</p>
            )}
          </div>
          <div className="rounded-lg border border-[#3d3830] bg-[#252119] p-4">
            <h3 className="text-[12px] uppercase tracking-wide text-[#c9bba8]/70">Customer</h3>
            <p className="text-[13px] text-[#f5e5c0] mt-2">{thread.customer?.email ?? "Unknown"}</p>
          </div>
        </aside>
      </div>
    </>
  );
}
