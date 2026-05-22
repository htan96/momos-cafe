import OpsPageHeader from "@/components/operations/OpsPageHeader";
import OpsPanel from "@/components/operations/OpsPanel";
import { loadAdminCommunicationsThreads } from "@/lib/admin/adminConsoleLoaders";

function shortenId(uuid: string | null | undefined, head = 8): string | null {
  if (!uuid) return null;
  const s = uuid.replace(/-/g, "");
  const h = s.slice(0, Math.min(head, s.length)).toUpperCase();
  return h.length ? h : null;
}

export default async function AdminCommunicationsPage() {
  const threads = await loadAdminCommunicationsThreads(25);

  return (
    <div className="space-y-8">
      <OpsPageHeader
        title="Communications timeline"
        subtitle="EmailThread + newest EmailMessage samples — conversational recovery happens in `/ops/communications`."
      />

      <div className="space-y-5">
        {threads.length === 0 ? (
          <OpsPanel title="Threads" eyebrow="Empty">
            <p className="text-[13px] text-charcoal/60">No transactional threads recorded yet.</p>
          </OpsPanel>
        ) : (
          threads.map((th) => {
            const anchorParts = ["thread", shortenId(th.id)];
            const orderShort = shortenId(th.commerceOrderId ?? undefined);
            if (orderShort) anchorParts.push(`order ${orderShort}`);
            const anchorLabel = anchorParts.join(" · ");
            const lastAt = new Date(th.updatedAt).toLocaleString(undefined, {
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            });

            const messages = [...th.messages].sort(
              (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
            );

            const subject =
              th.subjectSnapshot?.trim()?.length ? th.subjectSnapshot : "Operational email thread";

            return (
              <OpsPanel key={th.id} title={subject} eyebrow={`Anchor · ${anchorLabel}`}>
                <div className="flex justify-between gap-4 text-[12px] text-charcoal/48 mb-4">
                  <span>Updated · {lastAt}</span>
                  <span>{th.customer?.email ?? "Customer unattached"}</span>
                </div>
                <div className="space-y-0 border border-cream-dark/60 rounded-xl overflow-hidden">
                  {messages.length === 0 ? (
                    <p className="px-4 py-3 text-[13px] text-charcoal/55">No message bodies surfaced in this preview.</p>
                  ) : (
                    messages.map((m, i) => {
                      const raw =
                        (m.textBody ?? m.subject ?? "").trim();
                      const snippet =
                        raw.length > 0 ? raw.slice(0, 280) + (raw.length > 280 ? "…" : "") : "Stored without plain-text preview.";
                      const stamp = new Date(m.createdAt).toLocaleTimeString(undefined, {
                        hour: "numeric",
                        minute: "2-digit",
                      });
                      const tone = i % 2 === 0 ? "bg-white/90" : "bg-cream/[0.38]";

                      return (
                        <div
                          key={m.id}
                          className={`px-4 py-3 grid gap-1 sm:grid-cols-[120px_1fr] ${
                            i !== messages.length - 1 ? "border-b border-cream-dark/50" : ""
                          } ${tone}`}
                        >
                          <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-teal-dark/85">
                            {m.direction}
                          </span>
                          <div>
                            <p className="text-[13px] text-charcoal/80 leading-snug">{snippet}</p>
                            <p className="text-[10px] text-charcoal/40 mt-1">{stamp}</p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </OpsPanel>
            );
          })
        )}
      </div>
    </div>
  );
}
