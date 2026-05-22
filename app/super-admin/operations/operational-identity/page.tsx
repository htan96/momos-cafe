import GovPageHeader from "@/components/governance/GovPageHeader";
import OperationalBreadcrumbs from "@/components/super-admin/operations/OperationalBreadcrumbs";
import OperationalIdentitySearchClient from "@/components/super-admin/operations/operational-identity/OperationalIdentitySearchClient";
import { superAdminIdentityBreadcrumbs } from "@/components/super-admin/operations/superAdminOperationsBreadcrumbs";

export const dynamic = "force-dynamic";

export default async function OperationalIdentityLandingPage() {
  return (
    <div className="space-y-8">
      <OperationalBreadcrumbs
        segments={superAdminIdentityBreadcrumbs([{ label: "Operational identity" }])}
        className="-mb-2"
      />

      <GovPageHeader
        eyebrow="Platform · Identity · Internal"
        title="Operational identity visibility"
        subtitle="Resolve diner / staff Cognito identities, inspect prisma linkage, skim operational telemetry, and (when IAM allows) mutate only the pooled customer · admin · super_admin groups."
      />

      <OperationalIdentitySearchClient />
    </div>
  );
}
