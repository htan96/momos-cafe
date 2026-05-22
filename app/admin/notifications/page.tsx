import OpsPageHeader from "@/components/operations/OpsPageHeader";
import OpsPanel from "@/components/operations/OpsPanel";
import OpsStatusPill from "@/components/operations/OpsStatusPill";
import { groupAdminNotificationRows, loadAdminNotificationFeedRows, notificationVariant } from "@/lib/admin/adminConsoleLoaders";

export default async function AdminNotificationsPage() {
  const rows = await loadAdminNotificationFeedRows(45);
  const buckets = groupAdminNotificationRows(rows);

  return (
    <div className="space-y-8">
      <OpsPageHeader
        title="Operational notifications"
        subtitle={`NotificationEvent outbox backlog — grouped heuristically from type strings (${rows.length} recent rows shown).`}
      />

      <div className="space-y-6">
        {buckets.length === 0 ? (
          <OpsPanel title="Categories" eyebrow="Empty">
            <p className="text-[13px] text-charcoal/60">Nothing in the sampled window.</p>
          </OpsPanel>
        ) : (
          buckets.map((bucket) => (
            <OpsPanel key={bucket.category} title={bucket.category} eyebrow="Category · heuristic">
              <ul className="divide-y divide-cream-dark/50">
                {bucket.items.map((n) => {
                  const processed = n.processedAt ? new Date(n.processedAt).toLocaleString() : "Unprocessed";
                  const payloadKind = typeof n.payload === "object" && n.payload && "kind" in n.payload
                    ? String((n.payload as { kind?: unknown }).kind ?? "")
                    : "";
                  const preview =
                    payloadKind.length > 0
                      ? `Payload kind · ${payloadKind}`
                      : "Payload stored as JSON — open super-admin tooling for deep inspection.";

                  return (
                    <li key={n.id} className="py-4 grid gap-2 sm:grid-cols-[1fr_auto] sm:items-start">
                      <div className="min-w-0">
                        <p className="text-[14px] font-semibold text-charcoal">{n.type}</p>
                        <p className="text-[13px] text-charcoal/65 mt-1 leading-relaxed">{preview}</p>
                        <p className="text-[11px] font-mono text-charcoal/45 mt-2">Event · {n.id}</p>
                      </div>
                      <div className="flex flex-col gap-2 sm:items-end">
                        <OpsStatusPill variant={notificationVariant(n.processedAt, n.type)} />
                        <span className="text-[11px] text-charcoal/45">
                          Created {new Date(n.createdAt).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
                        </span>
                        <span className="text-[11px] text-charcoal/45">{processed}</span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </OpsPanel>
          ))
        )}
      </div>
    </div>
  );
}
