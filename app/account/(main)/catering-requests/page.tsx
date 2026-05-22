import { redirect } from "next/navigation";

/** Catering inquiries remain on `/catering` and the dashboard “Catering inquiries” section. */
export default function AccountCateringRequestsRedirectPage() {
  redirect("/account");
}
