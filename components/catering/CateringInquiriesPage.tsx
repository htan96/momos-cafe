import GovPageHeader from "@/components/governance/GovPageHeader";
import OpsPageHeader from "@/components/operations/OpsPageHeader";
import { prisma } from "@/lib/prisma";
import { isCateringInquiryStatus } from "@/lib/catering/cateringInquiryStatus";
import type { CateringInquiryStatus } from "@prisma/client";
import CateringInquiriesTable from "@/components/catering/CateringInquiriesTable";

type Shell = "admin" | "super_admin";

export default async function CateringInquiriesPage({
  searchParams,
  basePath,
  shell,
}: {
  searchParams: Promise<{ status?: string }>;
  basePath: string;
  shell: Shell;
}) {
  const sp = await searchParams;
  const rawStatus = sp.status?.trim();
  const status =
    rawStatus && isCateringInquiryStatus(rawStatus)
      ? (rawStatus as CateringInquiryStatus)
      : undefined;

  const rows = await prisma.cateringInquiry.findMany({
    where: status ? { status } : undefined,
    orderBy: { createdAt: "desc" },
    take: 300,
  });

  const header =
    shell === "admin" ? (
      <OpsPageHeader
        title="Catering inquiries"
        subtitle="Intake queue — newest first. Filter by status or open a row to update assignment and internal notes."
      />
    ) : (
      <GovPageHeader
        eyebrow="Platform"
        title="Catering inquiries"
        subtitle="Same intake queue as staff admin — filter by status or open a row."
      />
    );

  return (
    <div className="space-y-8">
      {header}
      <CateringInquiriesTable
        rows={rows}
        basePath={basePath}
        activeStatus={status ?? null}
      />
    </div>
  );
}
