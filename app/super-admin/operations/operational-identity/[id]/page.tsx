import { notFound } from "next/navigation";
import GovPageHeader from "@/components/governance/GovPageHeader";
import OperationalBreadcrumbs from "@/components/super-admin/operations/OperationalBreadcrumbs";
import OperationalIdentityDetailClient from "@/components/super-admin/operations/operational-identity/OperationalIdentityDetailClient";
import { resolveOperationalIdentityBundle } from "@/lib/super-admin/operationalIdentity/resolveOperationalIdentity";
import { getCognitoServerSession } from "@/lib/auth/cognito/serverSession";

export const dynamic = "force-dynamic";

export default async function OperationalIdentityDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: rawId } = await params;
  const id = decodeURIComponent(typeof rawId === "string" ? rawId.trim() : "");

  const bundle = await resolveOperationalIdentityBundle(id);
  if (!bundle) notFound();

  const session = await getCognitoServerSession();

  return (
    <div className="space-y-8">
      <OperationalBreadcrumbs
        segments={[
          { label: "Super-admin", href: "/super-admin" },
          { label: "Operations", href: "/super-admin/operations/orders" },
          { label: "Operational identity", href: "/super-admin/operations/operational-identity" },
          { label: "Detail" },
        ]}
        className="-mb-2"
      />

      <GovPageHeader
        eyebrow="Platform · Operations · Internal"
        title="Operational identity detail"
        subtitle={`Key ${bundle.queryKey}`}
      />

      <OperationalIdentityDetailClient
        initialBundle={bundle}
        viewerSub={session?.sub ?? null}
        viewerEmail={session?.email ?? null}
      />
    </div>
  );
}
