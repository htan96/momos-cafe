import CateringInquiriesPage from "@/components/catering/CateringInquiriesPage";

export const dynamic = "force-dynamic";

export default function SuperAdminCateringInquiriesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  return (
    <CateringInquiriesPage
      searchParams={searchParams}
      basePath="/super-admin/catering-inquiries"
      shell="super_admin"
    />
  );
}
