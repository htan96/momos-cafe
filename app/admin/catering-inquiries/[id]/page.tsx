import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import OpsPageHeader from "@/components/operations/OpsPageHeader";
import CateringInquiryDetailForm from "@/components/catering/CateringInquiryDetailForm";
import { toCateringInquiryDetailPayload } from "@/lib/catering/cateringInquiryDetailPayload";

export const dynamic = "force-dynamic";

export default async function AdminCateringInquiryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const row = await prisma.cateringInquiry.findUnique({ where: { id } });
  if (!row) notFound();

  return (
    <div className="space-y-8">
      <OpsPageHeader
        eyebrow={false}
        title="Catering inquiry"
        subtitle={row.email}
        actions={
          <Link
            href="/admin/catering-inquiries"
            className="rounded-lg border border-cream-dark bg-white px-3 py-2 text-[12px] font-semibold uppercase tracking-[0.12em] text-charcoal hover:bg-cream/80 transition-colors"
          >
            Back to list
          </Link>
        }
      />
      <CateringInquiryDetailForm
        inquiry={toCateringInquiryDetailPayload(row)}
        listHref="/admin/catering-inquiries"
      />
    </div>
  );
}
