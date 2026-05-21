import SuperAdminEmptyPanel from "@/components/super-admin/SuperAdminEmptyPanel";
import SuperAdminSectionIntro from "@/components/super-admin/SuperAdminSectionIntro";
import { Bell } from "lucide-react";

export default function SuperAdminPlatformNotificationsPage() {
  return (
    <div className="space-y-8">
      <SuperAdminSectionIntro
        icon={Bell}
        title="Notifications"
        subtitle="Operational broadcast drafts, escalation channels, and runbook pings will hydrate this surface — not seeded marketing stats."
      />
      <SuperAdminEmptyPanel
        icon={Bell}
        eyebrow="Platform"
        title="No outbound notification drafts"
        description="There is no global notification ledger wired for super admins yet. When incident comms migrate into governance-audited flows they will populate here explicitly."
      />
    </div>
  );
}
