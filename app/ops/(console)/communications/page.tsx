import Link from "next/link";
import OpsPageHeader from "@/components/ops/OpsPageHeader";
import OpsQueueCard from "@/components/ops/OpsQueueCard";
import StateChip from "@/components/ops/StateChip";
import { opsLoadCommunicationsList } from "@/lib/ops/queries";

export default async function OpsCommunicationsPage() {
  const threads = await opsLoadCommunicationsList(40);

  return (
    <>
      <OpsPageHeader
        title="Communications"
        description="Email threads anchored to customers and commerce orders."
      />
      <div className="grid gap-2 md:grid-cols-2">
        {threads.map((t) => {
          const last = t.messages[0];
          return (
            <OpsQueueCard
              key={t.id}
              href={`/ops/communications/${t.id}`}
              title={t.subjectSnapshot ?? "(no subject)"}
              subtitle={
                t.customer?.email
                  ? t.customer.email
                  : t.commerceOrderId
                    ? `Order ${t.commerceOrderId.slice(0, 8)}…`
                    : "Guest thread"
              }
              meta={last ? new Date(last.createdAt).toLocaleString() : ""}
              chips={
                <>
                  <StateChip label={`msg:${t.messages.length}`} tone="neutral" />
                  {last ? (
                    <StateChip
                      label={last.deliveryStatus}
                      tone={last.deliveryStatus === "failed" ? "danger" : "ok"}
                    />
                  ) : null}
                </>
              }
            />
          );
        })}
      </div>
      {threads.length === 0 ? (
        <p className="mt-6 text-[#c9bba8]/75 text-sm border border-dashed border-[#3d3830] rounded-lg py-10 text-center">
          No threads indexed yet — outbound sends with thread context will populate this view.
        </p>
      ) : null}
      <p className="mt-8 text-[12px] text-[#c9bba8]/60">
        Inbound parsing lives at{" "}
        <code className="text-[#8FC4C4]/90">/api/email/inbound</code> — replies UI stays manual-first.
      </p>
    </>
  );
}
