import { revalidatePath } from "next/cache";

export function revalidateCateringAdminViews(affectedInquiryId?: string) {
  revalidatePath("/admin/catering-orders");
  revalidatePath("/admin/catering-inquiries");
  if (affectedInquiryId) {
    revalidatePath(`/admin/catering-inquiries/${affectedInquiryId}`);
  }
}
