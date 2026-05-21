import SuperAdminEmptyPanel from "@/components/super-admin/SuperAdminEmptyPanel";
import SuperAdminSectionIntro from "@/components/super-admin/SuperAdminSectionIntro";
import { Shield } from "lucide-react";

export default function SuperAdminSecurityEventsPage() {
  return (
    <div className="space-y-8">
      <SuperAdminSectionIntro
        icon={Shield}
        title="Security events"
        subtitle="Dedicated security telemetry (threat feeds, anomaly scores, federation signals) stays outside this codebase until ingestion exists — we refuse to mimic Cognito KPIs."
      />
      <SuperAdminEmptyPanel
        icon={Shield}
        eyebrow="Security"
        title="Awaiting authoritative security telemetry"
        description="MFA posture, breached-password sync, console IP pinning, and device trust dashboards require provider-native exports. This panel will hydrate when those feeds authenticate into our stack — meanwhile rely on Cognito/AWS consoles and audited governance actions logged under Audit Logs."
      />
    </div>
  );
}
