import CateringInquiriesPage from "@/components/catering/CateringInquiriesPage";

export const dynamic = "force-dynamic";

export default function AdminCateringInquiriesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  return (
    <CateringInquiriesPage
      searchParams={searchParams}
      basePath="/admin/catering-inquiries"
      shell="admin"
    />
  );
}
