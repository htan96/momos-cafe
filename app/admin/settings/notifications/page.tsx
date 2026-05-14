import OpsPageHeader from "@/components/operations/OpsPageHeader";
import OpsPanel from "@/components/operations/OpsPanel";

const routes = [
  { label: "SMS · on-call escalation", hint: "+1 Vallejo paging tree", checked: false },
  { label: "Email digest · SLA breaches", hint: "05:30 PT summary", checked: true },
  { label: "Browser banners · fulfillment", hint: "In-console only", checked: true },
  { label: "Slack / Teams bridge", hint: "Webhooks placeholder", checked: false },
] as const;

export default function AdminSettingsNotificationsPage() {
  return (
    <div className="space-y-8">
      <OpsPageHeader
        title="Notification routing"
        subtitle="Operational fan-out mocks — complements staff notification feed vs customer email."
      />

      <OpsPanel title="Channels" eyebrow="Toggles inactive">
        <ul className="space-y-3">
          {routes.map((r) => (
            <li key={r.label} className="flex gap-4 rounded-xl border border-cream-dark/65 bg-white/88 px-4 py-4">
              <input
                type="checkbox"
                checked={r.checked}
                disabled
                className="h-5 w-5 accent-teal-dark shrink-0 mt-1 cursor-not-allowed"
              />
              <div>
                <p className="text-[13px] font-semibold text-charcoal">{r.label}</p>
                <p className="text-[12px] text-charcoal/55 mt-1">{r.hint}</p>
              </div>
            </li>
          ))}
        </ul>
      </OpsPanel>
    </div>
  );
}
