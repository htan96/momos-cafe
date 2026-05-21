import { redirect } from "next/navigation";

export default function LegacyCustomerLookupRedirectPage() {
  redirect("/super-admin/users/customers");
}
