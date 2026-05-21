import { redirect } from "next/navigation";

export default function LegacySuperAdminRolesRedirectPage() {
  redirect("/super-admin/users/permissions");
}
