import { redirect } from "next/navigation";
import {
  OPS_ENTITY_UUID_RE,
} from "@/lib/operations/operationalContextLinks";

type PageProps = { params: Promise<{ customerId: string }> };

export default async function SuperAdminCustomerOperationsDetailRedirect(props: PageProps) {
  const { customerId } = await props.params;
  if (!OPS_ENTITY_UUID_RE.test(customerId)) redirect("/super-admin/customer-operations");
  redirect(`/super-admin/users/customers/${customerId}`);
}
