import SuperAdminEmptyPanel from "@/components/super-admin/SuperAdminEmptyPanel";
import SuperAdminSectionIntro from "@/components/super-admin/SuperAdminSectionIntro";
import { Wallet } from "lucide-react";

export default function SuperAdminOperationalPaymentsPage() {
  return (
    <div className="space-y-8">
      <SuperAdminSectionIntro
        icon={Wallet}
        title="Payments"
        subtitle="Processor health, PSP disputes, capture retries — future work will centralize audited payment exceptions without fabricating KPIs."
      />
      <SuperAdminEmptyPanel
        icon={Wallet}
        eyebrow="Operations"
        title="Payments console not connected"
        description="When payment observability merges with governance audit rows, surfaced failures will cite live ledger references only. Until then rely on PSP tooling and OperationalActivity payment_failed events shown in Live activity."
      />
    </div>
  );
}
